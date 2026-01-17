import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FormMultiSelect } from '@/components/ui/form-multi-select';
import { api } from '@/lib/api';
import { ExternalLink, Plus, Save, AlertCircle, CheckCircle, Loader2, Users, School, Globe } from 'lucide-react';
import { useGamesCount } from '@/hooks/useGamesCount';
import { useAuth } from '@/context/authContext';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { getUserHierarchyContext } from '@/utils/userHierarchy';
import { toast } from 'react-toastify';

const DISCIPLINAS = [
    'Português',
    'Matemática',
    'História',
    'Geografia',
    'Ciências',
    'Artes',
    'Educação Física',
    'Inglês',
    'Ensino Religioso',
];

const WordwallGameForm = () => {
    const navigate = useNavigate();
    const { refetch: refetchGamesCount } = useGamesCount();
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [subject, setSubject] = useState('Português');
    const [isLoading, setIsLoading] = useState(false);
    const [gameData, setGameData] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Estados para filtros (Diretor/Coordenador/Admin/Tecadm)
    const [selectedState, setSelectedState] = useState('all');
    const [selectedMunicipality, setSelectedMunicipality] = useState('all');
    const [selectedSchool, setSelectedSchool] = useState('all'); // Para filtrar turmas/séries
    const [selectedGrade, setSelectedGrade] = useState('all'); // Para filtrar turmas
    
    // Seleções múltiplas
    const [selectedClassIds, setSelectedClassIds] = useState([]); // Array de IDs de turmas
    const [selectedSchoolIds, setSelectedSchoolIds] = useState([]); // Array de IDs de escolas
    const [selectedGradeIds, setSelectedGradeIds] = useState([]); // Array de IDs de séries
    
    // Estados para dados dos filtros
    const [states, setStates] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [schools, setSchools] = useState([]);
    const [grades, setGrades] = useState([]);
    const [classes, setClasses] = useState([]);
    const [isLoadingFilters, setIsLoadingFilters] = useState(false);
    
    // Estados para preview de vinculação
    const [previewLinkedClasses, setPreviewLinkedClasses] = useState(0);
    const [isCalculatingPreview, setIsCalculatingPreview] = useState(false);
    
    // Estados para professor
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [isLoadingTeacherClasses, setIsLoadingTeacherClasses] = useState(false);
    
    // Estados para diretor/coordenador
    const [userSchoolId, setUserSchoolId] = useState(null);
    const [userSchoolName, setUserSchoolName] = useState('');

    const validateWordwallUrl = (url) => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'wordwall.net';
        } catch {
            return false;
        }
    };

    const fetchGamePreview = async (gameUrl) => {
        try {
            const encodedUrl = encodeURIComponent(gameUrl);
            const response = await fetch(`https://wordwall.net/api/oembed?url=${encodedUrl}&format=json`);

            if (!response.ok) {
                throw new Error('Jogo não encontrado ou privado');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error('Erro ao buscar informações do jogo');
        }
    };

    const handleUrlChange = async (e) => {
        const newUrl = e.target.value;
        setUrl(newUrl);
        setError('');
        setSuccess('');
        setGameData(null);

        if (newUrl.trim()) {
            if (!validateWordwallUrl(newUrl)) {
                setError('Por favor, insira uma URL válida do Wordwall (wordwall.net)');
                return;
            }

            setIsLoading(true);
            try {
                const data = await fetchGamePreview(newUrl);
                setGameData(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    // Carregar turmas do professor
    const loadTeacherClasses = useCallback(async () => {
        if (user?.role !== 'professor' || !user?.id) return;
        
        setIsLoadingTeacherClasses(true);
        try {
            const response = await api.get(`/teacher/${user.id}`);
            const teacherData = response.data;
            
            if (teacherData.turmas && Array.isArray(teacherData.turmas)) {
                setTeacherClasses(teacherData.turmas.map((turma) => ({
                    id: turma.id,
                    name: turma.name || turma.nome || `Turma ${turma.id}`,
                    grade: turma.grade_name || turma.grade?.name || turma.grade?.nome || 'Série não informada'
                })));
            } else {
                setTeacherClasses([]);
            }
        } catch (error) {
            console.error('Erro ao carregar turmas do professor:', error);
            setTeacherClasses([]);
        } finally {
            setIsLoadingTeacherClasses(false);
        }
    }, [user]);

    // Carregar escola do diretor/coordenador
    const loadUserSchool = useCallback(async () => {
        if (!['diretor', 'coordenador'].includes(user?.role) || !user?.id) return;
        
        try {
            const context = await getUserHierarchyContext(user.id, user.role);
            if (context.school) {
                setUserSchoolId(context.school.id);
                setUserSchoolName(context.school.name);
                setSelectedSchool(context.school.id);
            }
        } catch (error) {
            console.error('Erro ao carregar escola do usuário:', error);
        }
    }, [user]);

    // Carregar estados
    useEffect(() => {
        const loadStates = async () => {
            if (!['admin', 'tecadm'].includes(user?.role)) return;
            
            try {
                setIsLoadingFilters(true);
                const statesData = await EvaluationResultsApiService.getFilterStates();
                setStates(statesData.map(state => ({
                    id: state.id,
                    name: state.nome
                })));
            } catch (error) {
                console.error('Erro ao carregar estados:', error);
            } finally {
                setIsLoadingFilters(false);
            }
        };
        
        loadStates();
    }, [user?.role]);

    // Carregar municípios
    useEffect(() => {
        const loadMunicipalities = async () => {
            if (selectedState === 'all' || !['admin', 'tecadm'].includes(user?.role)) {
                setMunicipalities([]);
                return;
            }
            
            try {
                setIsLoadingFilters(true);
                const municipalitiesData = await EvaluationResultsApiService.getFilterMunicipalities(selectedState);
                setMunicipalities(municipalitiesData.map(m => ({
                    id: m.id,
                    name: m.nome
                })));
                setSelectedMunicipality('all');
                setSelectedSchool('all');
                setSelectedGrade('all');
                setSelectedClassIds([]);
                setSelectedSchoolIds([]);
                setSelectedGradeIds([]);
            } catch (error) {
                console.error('Erro ao carregar municípios:', error);
            } finally {
                setIsLoadingFilters(false);
            }
        };
        
        loadMunicipalities();
    }, [selectedState, user?.role]);

    // Carregar escolas
    useEffect(() => {
        const loadSchools = async () => {
            // Para diretor/coordenador, usar escola do usuário
            if (['diretor', 'coordenador'].includes(user?.role)) {
                if (userSchoolId) {
                    setSchools([{ id: userSchoolId, name: userSchoolName }]);
                    setSelectedSchool(userSchoolId);
                }
                return;
            }
            
            // Para admin/tecadm
            if (selectedMunicipality === 'all') {
                setSchools([]);
                setSelectedSchool('all');
                setSelectedGrade('all');
                setSelectedClassIds([]);
                setSelectedSchoolIds([]);
                setSelectedGradeIds([]);
                return;
            }
            
            try {
                setIsLoadingFilters(true);
                // Usar endpoint direto como em AnswerSheetGenerator.tsx e CreateEvaluationStep1.tsx
                const response = await api.get(`/school/city/${selectedMunicipality}`);
                const allSchoolsData = response.data?.schools || response.data || [];
                
                setSchools(allSchoolsData.map(s => ({
                    id: s.id,
                    name: s.name || s.nome || `Escola ${s.id}`
                })));
                setSelectedSchool('all');
                setSelectedGrade('all');
                setSelectedClassIds([]);
                setSelectedSchoolIds([]);
                setSelectedGradeIds([]);
            } catch (error) {
                console.error('Erro ao carregar escolas:', error);
                setSchools([]);
            } finally {
                setIsLoadingFilters(false);
            }
        };
        
        loadSchools();
    }, [selectedMunicipality, user?.role, userSchoolId, userSchoolName]);

    // Carregar séries
    useEffect(() => {
        const loadGrades = async () => {
            // Para diretor/coordenador, usar escola do usuário
            if (['diretor', 'coordenador'].includes(user?.role)) {
                if (!userSchoolId) {
                    setGrades([]);
                    return;
                }
                
                try {
                    setIsLoadingFilters(true);
                    const classesResponse = await api.get(`/classes/school/${userSchoolId}`);
                    const classesData = Array.isArray(classesResponse.data) 
                        ? classesResponse.data 
                        : (classesResponse.data?.data || []);
                    
                    const gradeMap = new Map();
                    classesData.forEach((classItem) => {
                        const grade = classItem.grade;
                        if (grade && grade.id && !gradeMap.has(grade.id)) {
                            gradeMap.set(grade.id, {
                                id: grade.id,
                                name: grade.name || grade.nome || ''
                            });
                        }
                    });
                    
                    setGrades(Array.from(gradeMap.values()));
                } catch (error) {
                    console.error('Erro ao carregar séries:', error);
                    setGrades([]);
                } finally {
                    setIsLoadingFilters(false);
                }
                return;
            }
            
            // Para admin/tecadm - carregar séries das escolas selecionadas ou do filtro
            if (['admin', 'tecadm'].includes(user?.role)) {
                // Determinar quais escolas usar: filtro OU selecionadas no FormMultiSelect
                const schoolsToLoad = [];
                if (selectedSchool !== 'all') {
                    schoolsToLoad.push(selectedSchool);
                }
                // Adicionar escolas selecionadas no FormMultiSelect (evitar duplicatas)
                selectedSchoolIds.forEach(schoolId => {
                    if (!schoolsToLoad.includes(schoolId)) {
                        schoolsToLoad.push(schoolId);
                    }
                });
                
                if (schoolsToLoad.length === 0) {
                    setGrades([]);
                    return;
                }
                
                try {
                    setIsLoadingFilters(true);
                    // Carregar séries para todas as escolas (filtro + selecionadas)
                    const allGradesById = new Map();
                    const allGradesByName = new Map();
                    
                    for (const schoolId of schoolsToLoad) {
                        try {
                            // Buscar classes da escola para extrair as séries
                            const classesResponse = await api.get(`/classes/school/${schoolId}`);
                            const classesData = Array.isArray(classesResponse.data) 
                                ? classesResponse.data 
                                : (classesResponse.data?.data || []);
                            
                            // Extrair séries únicas das classes
                            classesData.forEach((classItem) => {
                                const grade = classItem.grade;
                                if (grade && grade.id) {
                                    const gradeName = (grade.name || grade.nome || '').trim();
                                    const normalizedName = gradeName.toLowerCase().trim();
                                    
                                    if (!allGradesById.has(grade.id) && !allGradesByName.has(normalizedName)) {
                                        allGradesById.set(grade.id, {
                                            id: grade.id,
                                            name: gradeName
                                        });
                                        allGradesByName.set(normalizedName, grade.id);
                                    }
                                }
                            });
                        } catch (error) {
                            console.error(`Erro ao carregar séries da escola ${schoolId}:`, error);
                        }
                    }
                    
                    // Converter para array e ordenar por nome
                    const uniqueGrades = Array.from(allGradesById.values()).sort((a, b) => 
                        a.name.localeCompare(b.name)
                    );
                    
                    setGrades(uniqueGrades);
                } catch (error) {
                    console.error('Erro ao carregar séries:', error);
                    setGrades([]);
                } finally {
                    setIsLoadingFilters(false);
                }
                return;
            }
            
            setGrades([]);
        };
        
        loadGrades();
    }, [selectedSchoolIds, selectedSchool, selectedState, selectedMunicipality, user?.role, userSchoolId]);
    
    // Calcular preview de turmas vinculadas
    useEffect(() => {
        const calculatePreview = async () => {
            if (user?.role === 'professor') {
                setPreviewLinkedClasses(teacherClasses.length);
                return;
            }
            
            setIsCalculatingPreview(true);
            try {
                let totalClasses = 0;
                
                // Contar turmas selecionadas diretamente
                totalClasses += selectedClassIds.length;
                
                // Para séries selecionadas, buscar turmas dessas séries
                if (selectedGradeIds.length > 0) {
                    const schoolIdsToCheck = ['diretor', 'coordenador'].includes(user?.role) 
                        ? [userSchoolId] 
                        : (selectedSchoolIds.length > 0 ? selectedSchoolIds : [selectedSchool !== 'all' ? selectedSchool : null]).filter(Boolean);
                    
                    for (const schoolId of schoolIdsToCheck) {
                        if (!schoolId) continue;
                        try {
                            const classesResponse = await api.get(`/classes/school/${schoolId}`);
                            const classesData = Array.isArray(classesResponse.data) 
                                ? classesResponse.data 
                                : (classesResponse.data?.data || []);
                            
                            const classesForGrades = classesData.filter((c) => {
                                const gradeId = c.grade_id || c.grade?.id;
                                return selectedGradeIds.includes(gradeId);
                            });
                            
                            totalClasses += classesForGrades.length;
                        } catch (error) {
                            console.error(`Erro ao buscar turmas da escola ${schoolId}:`, error);
                        }
                    }
                }
                
                // Para escolas selecionadas (admin/tecadm), buscar todas as turmas
                if (selectedSchoolIds.length > 0 && ['admin', 'tecadm'].includes(user?.role)) {
                    for (const schoolId of selectedSchoolIds) {
                        try {
                            const classesResponse = await api.get(`/classes/school/${schoolId}`);
                            const classesData = Array.isArray(classesResponse.data) 
                                ? classesResponse.data 
                                : (classesResponse.data?.data || []);
                            
                            // Se há séries selecionadas, filtrar por elas
                            if (selectedGradeIds.length > 0) {
                                const filtered = classesData.filter((c) => {
                                    const gradeId = c.grade_id || c.grade?.id;
                                    return selectedGradeIds.includes(gradeId);
                                });
                                totalClasses += filtered.length;
                            } else {
                                totalClasses += classesData.length;
                            }
                        } catch (error) {
                            console.error(`Erro ao buscar turmas da escola ${schoolId}:`, error);
                        }
                    }
                }
                
                setPreviewLinkedClasses(totalClasses);
            } catch (error) {
                console.error('Erro ao calcular preview:', error);
                setPreviewLinkedClasses(0);
            } finally {
                setIsCalculatingPreview(false);
            }
        };
        
        calculatePreview();
    }, [selectedClassIds, selectedSchoolIds, selectedGradeIds, user?.role, userSchoolId, selectedSchool, teacherClasses.length]);

    // Carregar turmas para seleção múltipla
    useEffect(() => {
        const loadClasses = async () => {
            // Para diretor/coordenador, carregar turmas da escola
            if (['diretor', 'coordenador'].includes(user?.role)) {
                if (!userSchoolId) {
                    setClasses([]);
                    return;
                }
                
                try {
                    setIsLoadingFilters(true);
                    const classesResponse = await api.get(`/classes/school/${userSchoolId}`);
                    const classesData = Array.isArray(classesResponse.data) 
                        ? classesResponse.data 
                        : (classesResponse.data?.data || []);
                    
                    setClasses(classesData.map((c) => ({
                        id: c.id,
                        name: c.name || c.nome || `Turma ${c.id}`,
                        grade_id: c.grade_id || c.grade?.id,
                        grade_name: c.grade?.name || c.grade?.nome || ''
                    })));
                } catch (error) {
                    console.error('Erro ao carregar turmas:', error);
                    setClasses([]);
                } finally {
                    setIsLoadingFilters(false);
                }
                return;
            }
            
            // Para admin/tecadm, carregar turmas das escolas e séries selecionadas
            if (['admin', 'tecadm'].includes(user?.role)) {
                if (selectedGradeIds.length === 0) {
                    setClasses([]);
                    return;
                }
                
                // Determinar quais escolas usar: filtro OU selecionadas no FormMultiSelect
                const schoolsToLoad = [];
                if (selectedSchool !== 'all') {
                    schoolsToLoad.push(selectedSchool);
                }
                // Adicionar escolas selecionadas no FormMultiSelect (evitar duplicatas)
                selectedSchoolIds.forEach(schoolId => {
                    if (!schoolsToLoad.includes(schoolId)) {
                        schoolsToLoad.push(schoolId);
                    }
                });
                
                if (schoolsToLoad.length === 0) {
                    setClasses([]);
                    return;
                }
                
                try {
                    setIsLoadingFilters(true);
                    // Carregar turmas para todas as combinações escola-série
                    const allClassesById = new Map();
                    const allClassesByName = new Map();
                    
                    for (const schoolId of schoolsToLoad) {
                        try {
                            // Buscar classes da escola
                            const classesResponse = await api.get(`/classes/school/${schoolId}`);
                            const classesData = Array.isArray(classesResponse.data) 
                                ? classesResponse.data 
                                : (classesResponse.data?.data || []);
                            
                            // Filtrar classes pelas séries selecionadas
                            const filteredClasses = classesData.filter((classItem) => {
                                const gradeId = classItem.grade_id || classItem.grade?.id;
                                return selectedGradeIds.includes(gradeId);
                            });
                            
                            // Adicionar classes únicas
                            filteredClasses.forEach(classItem => {
                                const className = (classItem.name || classItem.nome || '').trim();
                                const normalizedName = className.toLowerCase().trim();
                                const gradeId = classItem.grade_id || classItem.grade?.id;
                                const gradeName = classItem.grade?.name || classItem.grade?.nome || '';
                                
                                if (!allClassesById.has(classItem.id) && !allClassesByName.has(normalizedName)) {
                                    allClassesById.set(classItem.id, {
                                        id: classItem.id,
                                        name: className,
                                        grade_id: gradeId,
                                        grade_name: gradeName
                                    });
                                    allClassesByName.set(normalizedName, classItem.id);
                                }
                            });
                        } catch (error) {
                            console.error(`Erro ao carregar turmas da escola ${schoolId}:`, error);
                        }
                    }
                    
                    // Converter para array e ordenar por nome
                    const uniqueClasses = Array.from(allClassesById.values()).sort((a, b) => 
                        a.name.localeCompare(b.name)
                    );
                    
                    setClasses(uniqueClasses);
                } catch (error) {
                    console.error('Erro ao carregar turmas:', error);
                    setClasses([]);
                } finally {
                    setIsLoadingFilters(false);
                }
                return;
            }
            
            setClasses([]);
        };
        
        loadClasses();
    }, [selectedSchoolIds, selectedSchool, selectedGradeIds, user?.role, userSchoolId]);

    // Carregar dados iniciais baseado na role
    useEffect(() => {
        if (user?.role === 'professor') {
            loadTeacherClasses();
        } else if (['diretor', 'coordenador'].includes(user?.role)) {
            loadUserSchool();
        }
    }, [user?.role, loadTeacherClasses, loadUserSchool]);

    // Validar campos obrigatórios
    const validateForm = () => {
        if (!gameData) {
            setError('Por favor, insira uma URL válida do Wordwall');
            return false;
        }
        
        // Validações por role
        if (user?.role === 'professor') {
            if (teacherClasses.length === 0) {
                setError('Você não possui turmas vinculadas. Vincule-se a uma turma primeiro.');
                return false;
            }
        } else if (['diretor', 'coordenador'].includes(user?.role)) {
            // Deve ter pelo menos turmas OU séries selecionadas
            if (selectedClassIds.length === 0 && selectedGradeIds.length === 0) {
                setError('Por favor, selecione pelo menos uma turma ou uma série.');
                return false;
            }
        } else if (['admin', 'tecadm'].includes(user?.role)) {
            // Deve ter pelo menos uma seleção (turmas, escolas ou séries)
            if (selectedClassIds.length === 0 && selectedSchoolIds.length === 0 && selectedGradeIds.length === 0) {
                setError('Por favor, selecione pelo menos uma turma, uma escola ou uma série.');
                return false;
            }
            
            // Se selecionou séries sem escolas, precisa ter escola selecionada para filtrar
            if (selectedGradeIds.length > 0 && selectedSchoolIds.length === 0 && selectedSchool === 'all') {
                setError('Para vincular séries, selecione pelo menos uma escola ou use o filtro de escola.');
                return false;
            }
        }
        
        return true;
    };

    const handleSaveGame = async () => {
        if (!gameData) return;
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const gamePayload = {
                url: url,
                title: gameData.title || 'Jogo Wordwall',
                iframeHtml: gameData.html,
                thumbnail: gameData.thumbnail_url,
                author: gameData.author_name,
                provider: 'wordwall',
                subject: subject,
            };
            
            // Adicionar campos de vinculação baseado na role
            if (user?.role === 'professor') {
                // Não enviar class_ids - será vinculado automaticamente
            } else if (['diretor', 'coordenador'].includes(user?.role)) {
                // Enviar arrays de turmas e/ou séries
                if (selectedClassIds.length > 0) {
                    gamePayload.class_ids = selectedClassIds;
                }
                if (selectedGradeIds.length > 0) {
                    gamePayload.grade_ids = selectedGradeIds;
                }
            } else if (['admin', 'tecadm'].includes(user?.role)) {
                // Enviar arrays de turmas, escolas e/ou séries
                if (selectedClassIds.length > 0) {
                    gamePayload.class_ids = selectedClassIds;
                }
                if (selectedSchoolIds.length > 0) {
                    gamePayload.school_ids = selectedSchoolIds;
                }
                if (selectedGradeIds.length > 0) {
                    gamePayload.grade_ids = selectedGradeIds;
                }
            }

            await api.post('/games', gamePayload);
            setSuccess('Jogo salvo com sucesso!');
            setUrl('');
            setGameData(null);
            setSubject('Português');
            
            // Limpar filtros
            setSelectedState('all');
            setSelectedMunicipality('all');
            setSelectedSchool('all');
            setSelectedGrade('all');
            setSelectedClassIds([]);
            setSelectedSchoolIds([]);
            setSelectedGradeIds([]);

            // Atualizar contador no sidebar
            refetchGamesCount();

            // Redirecionar para a página de jogos após 2 segundos
            setTimeout(() => {
                navigate('/app/jogos');
            }, 2000);
        } catch (error) {
            // Tratar erros múltiplos se existirem
            const errorData = error.response?.data;
            let errorMessage = errorData?.erro || errorData?.error || 'Erro ao salvar o jogo. Tente novamente.';
            
            // Se houver detalhes de erro, adicionar à mensagem
            if (errorData?.detalhes && Array.isArray(errorData.detalhes) && errorData.detalhes.length > 0) {
                errorMessage += '\n\nDetalhes:\n' + errorData.detalhes.map((d, i) => `${i + 1}. ${d}`).join('\n');
            }
            
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGame = () => {
        window.open('https://wordwall.net/pt-br/create', '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleCreateGame} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Jogo no Wordwall
                    <ExternalLink className="w-4 h-4" />
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Jogo Existente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="game-url" className="text-sm font-medium">
                            URL do Jogo Wordwall
                        </label>
                        <Input
                            id="game-url"
                            type="url"
                            placeholder="https://wordwall.net/pt/resource/94433702/roleta"
                            value={url}
                            onChange={handleUrlChange}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="game-subject" className="text-sm font-medium">
                            Disciplina
                        </label>
                        <select
                            id="game-subject"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            disabled={isLoading}
                        >
                            {DISCIPLINAS.map((disciplina) => (
                                <option key={disciplina} value={disciplina}>{disciplina}</option>
                            ))}
                        </select>
                    </div>

                    {/* Seção para Professor */}
                    {user?.role === 'professor' && (
                        <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-foreground mb-1">
                                        Vinculação Automática
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Este jogo será vinculado automaticamente às suas turmas.
                                    </p>
                                    {isLoadingTeacherClasses ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Carregando suas turmas...
                                        </div>
                                    ) : teacherClasses.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-foreground">
                                                Suas turmas:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {teacherClasses.map((turma) => (
                                                    <Badge key={turma.id} variant="secondary" className="text-xs">
                                                        {turma.name} ({turma.grade})
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            Você não possui turmas vinculadas. Vincule-se a uma turma primeiro.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Seção para Diretor/Coordenador */}
                    {['diretor', 'coordenador'].includes(user?.role) && (
                        <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
                            <div className="flex items-start gap-2">
                                <School className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-foreground mb-1">
                                        Vincular Jogo
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Selecione turmas específicas e/ou séries para vincular este jogo.
                                    </p>
                                    
                                    <div className="space-y-4">
                                        {/* Escola (somente leitura) */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Escola
                                            </label>
                                            <Input
                                                value={userSchoolName || 'Carregando...'}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                        
                                        {/* Seleção múltipla de Séries */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Séries <span className="text-muted-foreground">(opcional)</span>
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Selecione uma ou mais séries. Todas as turmas dessas séries serão vinculadas.
                                            </p>
                                            <FormMultiSelect
                                                options={grades.map(grade => ({ id: grade.id, name: grade.name }))}
                                                selected={selectedGradeIds}
                                                onChange={setSelectedGradeIds}
                                                placeholder={selectedGradeIds.length === 0 ? "Selecione séries (opcional)" : `${selectedGradeIds.length} selecionada(s)`}
                                                disabled={isLoadingFilters}
                                            />
                                        </div>
                                        
                                        {/* Seleção múltipla de Turmas */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Turmas Específicas <span className="text-muted-foreground">(opcional)</span>
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Selecione uma ou mais turmas específicas para vincular.
                                            </p>
                                            <FormMultiSelect
                                                options={classes.map(classItem => ({ 
                                                    id: classItem.id, 
                                                    name: classItem.grade_name ? `${classItem.name} (${classItem.grade_name})` : classItem.name 
                                                }))}
                                                selected={selectedClassIds}
                                                onChange={setSelectedClassIds}
                                                placeholder={selectedClassIds.length === 0 ? "Selecione turmas (opcional)" : `${selectedClassIds.length} selecionada(s)`}
                                                disabled={isLoadingFilters}
                                            />
                                        </div>
                                        
                                        {/* Preview */}
                                        {(selectedClassIds.length > 0 || selectedGradeIds.length > 0) && (
                                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-md border border-amber-300">
                                                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                                    {isCalculatingPreview ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Calculando...
                                                        </span>
                                                    ) : (
                                                        `📊 ${previewLinkedClasses} turma(s) serão vinculadas a este jogo`
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {selectedClassIds.length === 0 && selectedGradeIds.length === 0 && (
                                            <p className="text-xs text-red-600">
                                                Selecione pelo menos uma turma ou uma série
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Seção para Admin/Tecadm */}
                    {['admin', 'tecadm'].includes(user?.role) && (
                        <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
                            <div className="flex items-start gap-2">
                                <Globe className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-foreground mb-1">
                                        Opções de Vinculação
                                    </h4>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Selecione turmas, escolas e/ou séries para vincular este jogo. Você pode combinar múltiplas opções.
                                    </p>
                                    
                                    <div className="space-y-6">
                                        {/* Filtros hierárquicos */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {/* Estado */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Estado *</label>
                                                <Select
                                                    value={selectedState}
                                                    onValueChange={setSelectedState}
                                                    disabled={isLoadingFilters}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o estado" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todos</SelectItem>
                                                        {states.map(state => (
                                                            <SelectItem key={state.id} value={state.id}>
                                                                {state.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Município */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Município *</label>
                                                <Select
                                                    value={selectedMunicipality}
                                                    onValueChange={setSelectedMunicipality}
                                                    disabled={isLoadingFilters || selectedState === 'all'}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o município" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todos</SelectItem>
                                                        {municipalities.map(municipality => (
                                                            <SelectItem key={municipality.id} value={municipality.id}>
                                                                {municipality.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Escola (filtro para séries/turmas) */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Escola (filtro)</label>
                                                <Select
                                                    value={selectedSchool}
                                                    onValueChange={setSelectedSchool}
                                                    disabled={isLoadingFilters || selectedMunicipality === 'all'}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Escola (filtro)" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas as escolas</SelectItem>
                                                        {schools.map(school => (
                                                            <SelectItem key={school.id} value={school.id}>
                                                                {school.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    Use este filtro para carregar séries e turmas de uma escola específica
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Seleção múltipla de Escolas */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Escolas <span className="text-muted-foreground">(opcional)</span>
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Selecione uma ou mais escolas. Todas as turmas dessas escolas serão vinculadas.
                                            </p>
                                            <FormMultiSelect
                                                options={schools.map(school => ({ id: school.id, name: school.name }))}
                                                selected={selectedSchoolIds}
                                                onChange={setSelectedSchoolIds}
                                                placeholder={selectedSchoolIds.length === 0 ? "Selecione escolas (opcional)" : `${selectedSchoolIds.length} selecionada(s)`}
                                                disabled={isLoadingFilters || selectedMunicipality === 'all'}
                                            />
                                        </div>
                                        
                                        {/* Seleção múltipla de Séries */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Séries <span className="text-muted-foreground">(opcional)</span>
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Selecione uma ou mais séries. Todas as turmas dessas séries serão vinculadas.
                                            </p>
                                            <FormMultiSelect
                                                options={grades.map(grade => ({ id: grade.id, name: grade.name }))}
                                                selected={selectedGradeIds}
                                                onChange={setSelectedGradeIds}
                                                placeholder={selectedGradeIds.length === 0 ? "Selecione séries (opcional)" : `${selectedGradeIds.length} selecionada(s)`}
                                                disabled={isLoadingFilters || (selectedSchool === 'all' && selectedSchoolIds.length === 0)}
                                            />
                                        </div>
                                        
                                        {/* Seleção múltipla de Turmas */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                Turmas Específicas <span className="text-muted-foreground">(opcional)</span>
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-2">
                                                Selecione uma ou mais turmas específicas para vincular.
                                            </p>
                                            <FormMultiSelect
                                                options={classes.map(classItem => ({ 
                                                    id: classItem.id, 
                                                    name: classItem.grade_name ? `${classItem.name} (${classItem.grade_name})` : classItem.name 
                                                }))}
                                                selected={selectedClassIds}
                                                onChange={setSelectedClassIds}
                                                placeholder={selectedClassIds.length === 0 ? "Selecione turmas (opcional)" : `${selectedClassIds.length} selecionada(s)`}
                                                disabled={isLoadingFilters || (selectedSchool === 'all' && selectedSchoolIds.length === 0) || selectedGradeIds.length === 0}
                                            />
                                        </div>
                                        
                                        {/* Preview */}
                                        {(selectedClassIds.length > 0 || selectedSchoolIds.length > 0 || selectedGradeIds.length > 0) && (
                                            <div className="p-3 bg-muted rounded-md border border-border">
                                                <p className="text-sm font-medium text-foreground">
                                                    {isCalculatingPreview ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Calculando...
                                                        </span>
                                                    ) : (
                                                        `📊 ${previewLinkedClasses} turma(s) serão vinculadas a este jogo`
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {selectedClassIds.length === 0 && selectedSchoolIds.length === 0 && selectedGradeIds.length === 0 && (
                                            <p className="text-xs text-red-600">
                                                Selecione pelo menos uma turma, uma escola ou uma série
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Sucesso</AlertTitle>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2">Carregando...</span>
                        </div>
                    )}

                    {gameData && !isLoading && (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4 bg-muted/50">
                                <h4 className="font-medium mb-2">{gameData.title}</h4>
                                {gameData.author_name && (
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Criado por: {gameData.author_name}
                                    </p>
                                )}
                                <div
                                    className="w-full h-64 border rounded overflow-hidden"
                                    dangerouslySetInnerHTML={{ __html: gameData.html }}
                                />
                            </div>

                            <CardFooter className="px-0">
                                <Button
                                    onClick={handleSaveGame}
                                    disabled={isLoading}
                                    className="flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar Jogo
                                </Button>
                            </CardFooter>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default WordwallGameForm; 