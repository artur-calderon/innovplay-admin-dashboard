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
    isLoading: Record<string, boolean>;
    fetchSkills: (subjectId: string) => Promise<Skill[]>;
    getSkillById: (skillId: string, subjectId?: string) => Skill | undefined;
    getSkillsByIds: (skillIds: string[], subjectId?: string) => Skill[];
}

export const useSkillsStore = create<SkillsStore>((set, get) => ({
    skillsBySubject: {},
    isLoading: {},

    fetchSkills: async (subjectId: string) => {
        const { skillsBySubject, isLoading } = get();
        
        // Se já tem as skills em cache, retorna direto
        if (skillsBySubject[subjectId]) {
            return skillsBySubject[subjectId];
        }
        
        // Se já está carregando, aguarda
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

        // Marca como carregando
        set(state => ({
            isLoading: { ...state.isLoading, [subjectId]: true }
        }));

        try {
            const response = await api.get(`/skills/subject/${subjectId}`);
            const skills = Array.isArray(response.data) 
                ? response.data.map(skill => ({
                    id: skill.id,
                    code: skill.code,
                    description: skill.description,
                    name: `${skill.code} - ${skill.description}`
                  }))
                : [];

            // Salva no cache
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

    getSkillById: (skillId: string, subjectId?: string) => {
        const { skillsBySubject } = get();
        
        // Remove chaves {} se existirem
        const cleanedSkillId = skillId.replace(/[{}]/g, '');
        
        if (subjectId && skillsBySubject[subjectId]) {
            return skillsBySubject[subjectId].find(skill => skill.id === cleanedSkillId);
        }
        
        // Procura em todas as subjects
        for (const skills of Object.values(skillsBySubject)) {
            const found = skills.find(skill => skill.id === cleanedSkillId);
            if (found) return found;
        }
        
        return undefined;
    },

    getSkillsByIds: (skillIds: string[], subjectId?: string) => {
        return skillIds.map(id => get().getSkillById(id, subjectId)).filter(Boolean) as Skill[];
    }
})); 