import { create } from 'zustand';
import { api } from '@/lib/api';

interface Skill {
    id: string;
    code: string;
    description: string;
    name: string;
}

interface SkillsStore {
    skillsBySubject: Record<string, Skill[]>;
    skillsByGrade: Record<string, Skill[]>;
    skillsBySubjectAndGrade: Record<string, Skill[]>; // key: "subjectId:gradeId"
    isLoading: Record<string, boolean>;
    fetchSkills: (subjectId: string, gradeId?: string) => Promise<Skill[]>;
    fetchSkillsByGrade: (gradeId: string) => Promise<Skill[]>;
    fetchSkillsByGrades: (gradeIds: string[]) => Promise<Skill[]>;
    getSkillById: (skillId: string, subjectId?: string, gradeId?: string) => Skill | undefined;
    getSkillsByIds: (skillIds: string[], subjectId?: string, gradeId?: string) => Skill[];
    invalidateCache: () => void;
}

export const useSkillsStore = create<SkillsStore>((set, get) => ({
    skillsBySubject: {},
    skillsByGrade: {},
    skillsBySubjectAndGrade: {},
    isLoading: {},

    fetchSkills: async (subjectId: string, gradeId?: string) => {
        const { skillsBySubject, skillsByGrade, skillsBySubjectAndGrade, isLoading } = get();
        
        // Se gradeId fornecido, tentar buscar por série + disciplina com cache otimizado
        if (gradeId) {
            const combinedKey = `${subjectId}:${gradeId}`;
            
            // 1) Cache combinado
            if (skillsBySubjectAndGrade[combinedKey]) {
                return skillsBySubjectAndGrade[combinedKey];
            }
            
            // 2) Aguarda se já estiver carregando
            if (isLoading[combinedKey]) {
                return new Promise((resolve) => {
                    const checkLoading = () => {
                        const currentState = get();
                        if (!currentState.isLoading[combinedKey]) {
                            resolve(currentState.skillsBySubjectAndGrade[combinedKey] || []);
                        } else {
                            setTimeout(checkLoading, 100);
                        }
                    };
                    checkLoading();
                });
            }

            // 3) Se já tivermos caches individuais, intersecta e salva como combinado
            if (skillsBySubject[subjectId] && skillsByGrade[gradeId]) {
                const gradeCodes = new Set(skillsByGrade[gradeId].map(s => s.code));
                let intersected = skillsBySubject[subjectId].filter(s => gradeCodes.has(s.code));
                // Fallback: intersecta por id se necessário
                if (intersected.length === 0) {
                    const gradeIds = new Set(skillsByGrade[gradeId].map(s => s.id));
                    intersected = skillsBySubject[subjectId].filter(s => gradeIds.has(s.id));
                }
                set(state => ({
                    skillsBySubjectAndGrade: {
                        ...state.skillsBySubjectAndGrade,
                        [combinedKey]: intersected,
                    }
                }));
                return intersected;
            }

            // 4) Marca como carregando o combinado e busca o que falta
            set(state => ({
                isLoading: { ...state.isLoading, [combinedKey]: true }
            }));

            try {
                // Prioriza buscar por série
                const gradePromise = skillsByGrade[gradeId]
                    ? Promise.resolve(skillsByGrade[gradeId])
                    : api.get(`/skills/grade/${gradeId}`).then(res => {
                        const list: Skill[] = Array.isArray(res.data)
                            ? res.data.map((skill: { id: string; code: string; description: string }) => ({
                                id: skill.id,
                                code: skill.code,
                                description: skill.description,
                                name: `${skill.code} - ${skill.description}`
                              }))
                            : [];
                        set(state => ({
                            skillsByGrade: { ...state.skillsByGrade, [gradeId]: list }
                        }));
                        return list;
                    }).catch(() => []);

                const subjectPromise = skillsBySubject[subjectId]
                    ? Promise.resolve(skillsBySubject[subjectId])
                    : api.get(`/skills/subject/${subjectId}`).then(res => {
                        const list: Skill[] = Array.isArray(res.data)
                            ? res.data.map((skill: { id: string; code: string; description: string }) => ({
                                id: skill.id,
                                code: skill.code,
                                description: skill.description,
                                name: `${skill.code} - ${skill.description}`
                              }))
                            : [];
                        set(state => ({
                            skillsBySubject: { ...state.skillsBySubject, [subjectId]: list }
                        }));
                        return list;
                    }).catch(() => []);

                const [gradeList, subjectList] = await Promise.all([gradePromise, subjectPromise]);

                let result: Skill[] = [];
                if (gradeList.length > 0 && subjectList.length > 0) {
                    const gradeCodes = new Set(gradeList.map(s => s.code));
                    result = subjectList.filter(s => gradeCodes.has(s.code));
                    // Fallback: se vazio por código, tenta por id
                    if (result.length === 0) {
                        const gradeIds = new Set(gradeList.map(s => s.id));
                        result = subjectList.filter(s => gradeIds.has(s.id));
                    }
                } else if (gradeList.length > 0) {
                    // Fallback: se só série retornou, usa série
                    result = gradeList;
                } else {
                    // Fallback final: usa disciplina
                    result = subjectList;
                }

                set(state => ({
                    skillsBySubjectAndGrade: {
                        ...state.skillsBySubjectAndGrade,
                        [combinedKey]: result,
                    },
                    isLoading: { ...state.isLoading, [combinedKey]: false }
                }));

                return result;
            } catch (error) {
                console.error('Erro ao buscar skills por série + disciplina:', error);
                set(state => ({
                    isLoading: { ...state.isLoading, [combinedKey]: false }
                }));
                // Fallback absoluto: tenta retornar por disciplina se existir
                if (skillsBySubject[subjectId]) return skillsBySubject[subjectId];
                return [];
            }
        }

        // Fallback para busca apenas por disciplina (comportamento atual)
        if (skillsBySubject[subjectId]) {
            return skillsBySubject[subjectId];
        }
        
        if (isLoading[subjectId]) {
            return new Promise((resolve) => {
                const checkLoading = () => {
                    const currentState = get();
                    if (!currentState.isLoading[subjectId]) {
                        resolve(currentState.skillsBySubject[subjectId] || []);
                    } else {
                        setTimeout(checkLoading, 100);
                    }
                };
                checkLoading();
            });
        }

        set(state => ({
            isLoading: { ...state.isLoading, [subjectId]: true }
        }));

        try {
            const response = await api.get(`/skills/subject/${subjectId}`);
            const skills = Array.isArray(response.data) 
                ? response.data.map((skill: { id: string; code: string; description: string }) => ({
                    id: skill.id,
                    code: skill.code,
                    description: skill.description,
                    name: `${skill.code} - ${skill.description}`
                  }))
                : [];

            set(state => ({
                skillsBySubject: { ...state.skillsBySubject, [subjectId]: skills },
                isLoading: { ...state.isLoading, [subjectId]: false }
            }));

            return skills;
        } catch (error) {
            console.error('Erro ao buscar skills:', error);
            set(state => ({
                isLoading: { ...state.isLoading, [subjectId]: false }
            }));
            return [];
        }
    },

    fetchSkillsByGrade: async (gradeId: string) => {
        const { skillsByGrade, isLoading } = get();
        
        if (skillsByGrade[gradeId]) {
            return skillsByGrade[gradeId];
        }
        
        if (isLoading[`grade:${gradeId}`]) {
            return new Promise((resolve) => {
                const checkLoading = () => {
                    const currentState = get();
                    if (!currentState.isLoading[`grade:${gradeId}`]) {
                        resolve(currentState.skillsByGrade[gradeId] || []);
                    } else {
                        setTimeout(checkLoading, 100);
                    }
                };
                checkLoading();
            });
        }

        set(state => ({
            isLoading: { ...state.isLoading, [`grade:${gradeId}`]: true }
        }));

        try {
            const response = await api.get(`/skills/grade/${gradeId}`);
            const skills = Array.isArray(response.data) 
                ? response.data.map(skill => ({
                    id: skill.id,
                    code: skill.code,
                    description: skill.description,
                    name: `${skill.code} - ${skill.description}`
                  }))
                : [];

            set(state => ({
                skillsByGrade: { ...state.skillsByGrade, [gradeId]: skills },
                isLoading: { ...state.isLoading, [`grade:${gradeId}`]: false }
            }));

            return skills;
        } catch (error: unknown) {
            // ✅ CORREÇÃO: Não logar erro se for 404 (caso válido - pode não haver skills)
            const apiError = error as { response?: { status?: number } };
            if (apiError.response?.status !== 404) {
                console.error('Erro ao buscar skills por série:', error);
            }
            set(state => ({
                isLoading: { ...state.isLoading, [`grade:${gradeId}`]: false }
            }));
            return [];
        }
    },

    fetchSkillsByGrades: async (gradeIds: string[]) => {
        const { fetchSkillsByGrade } = get();
        
        if (!gradeIds || gradeIds.length === 0) {
            return [];
        }

        // Buscar habilidades de todos os anos em paralelo
        const promises = gradeIds.map(gradeId => fetchSkillsByGrade(gradeId));
        const results = await Promise.all(promises);

        // Combinar todas as habilidades, removendo duplicatas por código
        const allSkills = results.flat();
        const uniqueSkillsMap = new Map<string, Skill>();
        
        for (const skill of allSkills) {
            // Usar código como chave para evitar duplicatas
            if (!uniqueSkillsMap.has(skill.code)) {
                uniqueSkillsMap.set(skill.code, skill);
            }
        }

        return Array.from(uniqueSkillsMap.values());
    },

    getSkillById: (skillId: string, subjectId?: string, gradeId?: string) => {
        const { skillsBySubject, skillsBySubjectAndGrade, skillsByGrade } = get();
        
        const cleanedSkillId = skillId.replace(/[{}]/g, '');
        
        // Buscar por série + disciplina primeiro
        if (subjectId && gradeId) {
            const combinedKey = `${subjectId}:${gradeId}`;
            const skill = skillsBySubjectAndGrade[combinedKey]?.find(s => s.id === cleanedSkillId);
            if (skill) return skill;
        }
        
        // Buscar por série
        if (gradeId) {
            const skill = skillsByGrade[gradeId]?.find(s => s.id === cleanedSkillId);
            if (skill) return skill;
        }
        
        // Buscar por disciplina
        if (subjectId) {
            const skill = skillsBySubject[subjectId]?.find(s => s.id === cleanedSkillId);
            if (skill) return skill;
        }
        
        // Buscar em todas as sources
        for (const skills of Object.values(skillsBySubjectAndGrade)) {
            const found = skills.find(skill => skill.id === cleanedSkillId);
            if (found) return found;
        }
        
        for (const skills of Object.values(skillsByGrade)) {
            const found = skills.find(skill => skill.id === cleanedSkillId);
            if (found) return found;
        }
        
        for (const skills of Object.values(skillsBySubject)) {
            const found = skills.find(skill => skill.id === cleanedSkillId);
            if (found) return found;
        }
        
        return undefined;
    },

    getSkillsByIds: (skillIds: string[], subjectId?: string, gradeId?: string) => {
        return skillIds.map(id => get().getSkillById(id, subjectId, gradeId)).filter(Boolean) as Skill[];
    },

    invalidateCache: () => {
        set({
            skillsBySubject: {},
            skillsByGrade: {},
            skillsBySubjectAndGrade: {},
        });
    }
})); 