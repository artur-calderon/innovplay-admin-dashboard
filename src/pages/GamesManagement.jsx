import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import {
    ExternalLink,
    Plus,
    Edit,
    Trash2,
    AlertCircle,
    CheckCircle,
    Loader2,
    Gamepad2,
    Link,
    User,
    Globe,
    Search
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/authContext';
import { useGamesCount } from '@/hooks/useGamesCount';
import { useNavigate } from 'react-router-dom';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const DISCIPLINAS = [
    'Português',
    'Matemática',
    'História',
    'Geografia',
    'Ciências',
    'Artes',
    'Educação Física',
    'Inglês',
];

const GamesManagement = () => {
    const { user } = useAuth();
    const { refetch: refetchGamesCount } = useGamesCount();
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingGame, setEditingGame] = useState(null);
    const [editUrl, setEditUrl] = useState('');
    const [editSubject, setEditSubject] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [gameToDelete, setGameToDelete] = useState(null);
    const [activeTab, setActiveTab] = useState('my_games'); // 'my_games' ou 'all_games'
    const [editError, setEditError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados para edição de turmas
    const [editingClasses, setEditingClasses] = useState([]);
    const [isEditingClasses, setIsEditingClasses] = useState(false);
    const [showEditClassesSection, setShowEditClassesSection] = useState(false);
    
    // Estados para filtros de edição de turmas (admin/tecadm)
    const [editSelectedState, setEditSelectedState] = useState('all');
    const [editSelectedMunicipality, setEditSelectedMunicipality] = useState('all');
    const [editSelectedSchool, setEditSelectedSchool] = useState('all');
    const [editSelectedGrade, setEditSelectedGrade] = useState('all');
    const [editSelectedClass, setEditSelectedClass] = useState('all');
    const [editLinkOption, setEditLinkOption] = useState('class');
    
    // Estados para dados dos filtros de edição
    const [editStates, setEditStates] = useState([]);
    const [editMunicipalities, setEditMunicipalities] = useState([]);
    const [editSchools, setEditSchools] = useState([]);
    const [editGrades, setEditGrades] = useState([]);
    const [editClasses, setEditClasses] = useState([]);
    const [isLoadingEditFilters, setIsLoadingEditFilters] = useState(false);

    // Verificar se o usuário pode criar jogos
    const canCreateGames = ['admin', 'tecadm', 'professor', 'diretor', 'coordenador'].includes(user?.role);

    // Buscar jogos
    const fetchGames = async (showMyGames = true) => {
        try {
            setIsLoading(true);
            
            // Se showMyGames=true, usar parâmetro my_games=true
            const params = showMyGames ? { my_games: 'true' } : {};
            const response = await api.get('/games', { params });
            
            // Buscar jogos da estrutura correta da API
            const gamesData = response.data.jogos || [];
            setGames(gamesData);
        } catch (error) {
            console.error('Erro ao buscar jogos:', error);
            toast.error('Erro ao carregar os jogos');
            setGames([]); // Definir como array vazio em caso de erro
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Por padrão, mostrar apenas os jogos do usuário
        fetchGames(activeTab === 'my_games');
    }, [activeTab]);

    // Verificar se o usuário pode editar/excluir um jogo
    const canEditGame = (game) => {
        if (!game) return false;
        // Criador ou admin/tecadm podem editar
        return game.userId === user.id || ['admin', 'tecadm'].includes(user?.role);
    };

    // Atualizar jogo
    const handleUpdateGame = async () => {
        if (!editingGame || !editUrl.trim()) return;

        // Verificar permissão antes de atualizar
        if (!canEditGame(editingGame)) {
            setEditError('Você não tem permissão para editar este jogo. Apenas o criador ou administradores podem editar.');
            return;
        }

        try {
            setIsEditing(true);
            setEditError('');
            
            const updatePayload = {
                url: editUrl,
                subject: editSubject
            };
            
            // Se está editando turmas e é admin/tecadm ou criador, incluir classes
            if (showEditClassesSection && (['admin', 'tecadm'].includes(user?.role) || editingGame.userId === user.id)) {
                // Usar arrays como na criação de jogos
                if (editLinkOption === 'class' && editingClasses.length > 0) {
                    // Turmas específicas
                    updatePayload.class_ids = editingClasses;
                } else if (editLinkOption === 'school' && editSelectedSchool !== 'all') {
                    // Todas as turmas de uma escola
                    updatePayload.school_ids = [editSelectedSchool];
                } else if (editLinkOption === 'grade' && editSelectedSchool !== 'all' && editSelectedGrade !== 'all') {
                    // Todas as turmas de uma série em uma escola
                    updatePayload.school_ids = [editSelectedSchool];
                    updatePayload.grade_ids = [editSelectedGrade];
                }
            }
            
            await api.put(`/games/${editingGame.id}`, updatePayload);

            toast.success('Jogo atualizado com sucesso!');
            setEditingGame(null);
            setEditUrl('');
            setEditSubject('');
            setEditingClasses([]);
            setShowEditClassesSection(false);
            fetchGames(activeTab === 'my_games'); // Recarregar lista
            refetchGamesCount(); // Atualizar contador no sidebar
        } catch (error) {
            console.error('Erro ao atualizar jogo:', error);
            const errorMessage = error.response?.data?.erro || error.response?.data?.error || 'Erro ao atualizar o jogo';
            setEditError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsEditing(false);
        }
    };

    // Excluir jogo
    const handleDeleteGame = async () => {
        if (!gameToDelete) return;

        // Verificar permissão antes de excluir
        if (!canEditGame(gameToDelete)) {
            toast.error('Você não tem permissão para excluir este jogo. Apenas o criador ou administradores podem excluir.');
            setIsDeleteDialogOpen(false);
            setGameToDelete(null);
            return;
        }

        try {
            await api.delete(`/games/${gameToDelete.id}`);
            toast.success('Jogo excluído com sucesso!');
            setIsDeleteDialogOpen(false);
            setGameToDelete(null);
            fetchGames(activeTab === 'my_games'); // Recarregar lista
            refetchGamesCount(); // Atualizar contador no sidebar
        } catch (error) {
            console.error('Erro ao excluir jogo:', error);
            const errorMessage = error.response?.data?.erro || error.response?.data?.error || 'Erro ao excluir o jogo';
            toast.error(errorMessage);
        }
    };

    // Abrir modal de edição
    const openEditModal = (game) => {
        // Verificar permissão antes de abrir o modal
        if (!canEditGame(game)) {
            toast.error('Você não tem permissão para editar este jogo. Apenas o criador ou administradores podem editar.');
            return;
        }
        
        setEditingGame(game);
        setEditUrl(game.url);
        setEditSubject(game.subject || 'Português');
        setEditError('');
        
        // Inicializar turmas vinculadas
        if (game.classes && Array.isArray(game.classes)) {
            setEditingClasses(game.classes.map((c) => c.id));
        } else {
            setEditingClasses([]);
        }
        
        setShowEditClassesSection(false);
        
        // Resetar filtros de edição
        setEditSelectedState('all');
        setEditSelectedMunicipality('all');
        setEditSelectedSchool('all');
        setEditSelectedGrade('all');
        setEditSelectedClass('all');
        setEditLinkOption('class');
    };
    
    // Carregar estados para edição (admin/tecadm)
    useEffect(() => {
        const loadEditStates = async () => {
            if (!showEditClassesSection || !['admin', 'tecadm'].includes(user?.role)) return;
            
            try {
                setIsLoadingEditFilters(true);
                const statesData = await EvaluationResultsApiService.getFilterStates();
                setEditStates(statesData.map(state => ({
                    id: state.id,
                    name: state.nome
                })));
            } catch (error) {
                console.error('Erro ao carregar estados:', error);
            } finally {
                setIsLoadingEditFilters(false);
            }
        };
        
        loadEditStates();
    }, [showEditClassesSection, user?.role]);
    
    // Carregar municípios para edição
    useEffect(() => {
        const loadEditMunicipalities = async () => {
            if (editSelectedState === 'all' || !['admin', 'tecadm'].includes(user?.role)) {
                setEditMunicipalities([]);
                return;
            }
            
            try {
                setIsLoadingEditFilters(true);
                const municipalitiesData = await EvaluationResultsApiService.getFilterMunicipalities(editSelectedState);
                setEditMunicipalities(municipalitiesData.map(m => ({
                    id: m.id,
                    name: m.nome
                })));
                setEditSelectedMunicipality('all');
                setEditSelectedSchool('all');
                setEditSelectedGrade('all');
                setEditSelectedClass('all');
            } catch (error) {
                console.error('Erro ao carregar municípios:', error);
            } finally {
                setIsLoadingEditFilters(false);
            }
        };
        
        loadEditMunicipalities();
    }, [editSelectedState, user?.role]);
    
    // Carregar escolas para edição
    useEffect(() => {
        const loadEditSchools = async () => {
            if (editSelectedMunicipality === 'all') {
                setEditSchools([]);
                setEditSelectedSchool('all');
                setEditSelectedGrade('all');
                setEditSelectedClass('all');
                return;
            }
            
            try {
                setIsLoadingEditFilters(true);
                // Usar endpoint direto como em AnswerSheetGenerator.tsx e CreateEvaluationStep1.tsx
                const response = await api.get(`/school/city/${editSelectedMunicipality}`);
                const allSchoolsData = response.data?.schools || response.data || [];
                
                setEditSchools(allSchoolsData.map(s => ({
                    id: s.id,
                    name: s.name || s.nome || `Escola ${s.id}`
                })));
                setEditSelectedSchool('all');
                setEditSelectedGrade('all');
                setEditSelectedClass('all');
            } catch (error) {
                console.error('Erro ao carregar escolas:', error);
                setEditSchools([]);
            } finally {
                setIsLoadingEditFilters(false);
            }
        };
        
        loadEditSchools();
    }, [editSelectedMunicipality]);
    
    // Carregar séries para edição
    useEffect(() => {
        const loadEditGrades = async () => {
            if (editSelectedSchool === 'all') {
                setEditGrades([]);
                return;
            }
            
            try {
                setIsLoadingEditFilters(true);
                // Buscar classes da escola para extrair as séries
                const classesResponse = await api.get(`/classes/school/${editSelectedSchool}`);
                const classesData = Array.isArray(classesResponse.data) 
                    ? classesResponse.data 
                    : (classesResponse.data?.data || []);
                
                // Extrair séries únicas das classes
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
                
                setEditGrades(Array.from(gradeMap.values()));
                setEditSelectedGrade('all');
                setEditSelectedClass('all');
            } catch (error) {
                console.error('Erro ao carregar séries:', error);
                setEditGrades([]);
            } finally {
                setIsLoadingEditFilters(false);
            }
        };
        
        loadEditGrades();
    }, [editSelectedSchool]);
    
    // Carregar turmas para edição
    useEffect(() => {
        const loadEditClasses = async () => {
            if (editSelectedSchool === 'all' || editLinkOption !== 'class') {
                setEditClasses([]);
                return;
            }
            
            if (editSelectedGrade === 'all') {
                setEditClasses([]);
                return;
            }
            
            try {
                setIsLoadingEditFilters(true);
                const classesResponse = await api.get(`/classes/school/${editSelectedSchool}`);
                let classesData = Array.isArray(classesResponse.data) 
                    ? classesResponse.data 
                    : (classesResponse.data?.data || []);
                
                if (editSelectedGrade !== 'all') {
                    classesData = classesData.filter((classItem) => {
                        const gradeId = classItem.grade_id || classItem.grade?.id;
                        return gradeId === editSelectedGrade;
                    });
                }
                
                setEditClasses(classesData.map((c) => ({
                    id: c.id,
                    name: c.name || c.nome || `Turma ${c.id}`
                })));
                setEditSelectedClass('all');
            } catch (error) {
                console.error('Erro ao carregar turmas:', error);
                setEditClasses([]);
            } finally {
                setIsLoadingEditFilters(false);
            }
        };
        
        loadEditClasses();
    }, [editSelectedSchool, editSelectedGrade, editLinkOption]);
    
    // Adicionar turma à lista de edição
    const handleAddClassToEdit = () => {
        if (editLinkOption === 'class' && editSelectedClass !== 'all') {
            if (!editingClasses.includes(editSelectedClass)) {
                setEditingClasses([...editingClasses, editSelectedClass]);
            }
            setEditSelectedClass('all');
        } else if (editLinkOption === 'school' && editSelectedSchool !== 'all') {
            // Para escola, buscar todas as turmas e adicionar
            // Isso será feito no backend, então apenas marcamos
            toast.info('Todas as turmas da escola serão vinculadas ao salvar');
        } else if (editLinkOption === 'grade' && editSelectedSchool !== 'all' && editSelectedGrade !== 'all') {
            // Para série, buscar todas as turmas da série e adicionar
            toast.info('Todas as turmas da série serão vinculadas ao salvar');
        }
    };
    
    // Remover turma da lista de edição
    const handleRemoveClassFromEdit = (classId) => {
        setEditingClasses(editingClasses.filter(id => id !== classId));
    };

    // Abrir modal de exclusão
    const openDeleteModal = (game) => {
        // Verificar permissão antes de abrir o modal
        if (!canEditGame(game)) {
            toast.error('Você não tem permissão para excluir este jogo. Apenas o criador ou administradores podem excluir.');
            return;
        }
        
        setGameToDelete(game);
        setIsDeleteDialogOpen(true);
    };

    // Abrir jogo na página GameView
    const openGame = (gameId) => {
        navigate(`/app/jogos/${gameId}`);
    };

    // Filtrar jogos por nome
    const filterGamesByName = (gamesList) => {
        if (!searchTerm.trim()) {
            return gamesList;
        }
        const term = searchTerm.toLowerCase().trim();
        return gamesList.filter((game) => 
            game.title?.toLowerCase().includes(term)
        );
    };



    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mr-2" />
                    <span>Carregando jogos...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Gerenciamento de Jogos</h2>
                    <p className="text-muted-foreground">
                        {activeTab === 'my_games' 
                            ? 'Gerencie os jogos que você criou' 
                            : 'Visualize todos os jogos disponíveis'}
                    </p>
                </div>
                {canCreateGames && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/app/jogos/adicionar')}
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Jogo
                        </Button>
                        <Button onClick={() => window.open('https://wordwall.net/pt-br/create', '_blank')} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Criar Novo Jogo
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Abas para alternar entre Meus Jogos e Todos os Jogos */}
            {canCreateGames && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="my_games" className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Meus Jogos
                        </TabsTrigger>
                        <TabsTrigger value="all_games" className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Todos os Jogos
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            {/* Campo de Busca */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                    type="text"
                    placeholder="Buscar jogos por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {!games || games.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Nenhum jogo encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                            {activeTab === 'my_games' 
                                ? 'Você ainda não criou nenhum jogo. Clique no botão acima para criar seu primeiro jogo no Wordwall.'
                                : 'Não há jogos disponíveis no momento.'}
                        </p>
                        {activeTab === 'my_games' && canCreateGames && (
                            <Button onClick={() => window.open('https://wordwall.net/pt-br/create', '_blank')}>
                                Criar Primeiro Jogo
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : filterGamesByName(games).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Nenhum jogo encontrado</h3>
                        <p className="text-muted-foreground mb-4">
                            Nenhum jogo corresponde à busca "{searchTerm}".
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filterGamesByName(games).map((game) => {
                        const canEdit = canEditGame(game);
                        return (
                            <Card key={game.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                                        <Badge variant="secondary">{game.subject}</Badge>
                                    </div>
                                    {activeTab === 'all_games' && game.userId !== user.id && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Criado por outro usuário
                                        </p>
                                    )}
                                    {/* Mostrar turmas vinculadas */}
                                    {game.classes && Array.isArray(game.classes) && game.classes.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-muted-foreground mb-1">
                                                Vinculado a:
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {game.classes.map((classItem) => (
                                                    <Badge key={classItem.id} variant="outline" className="text-xs">
                                                        {classItem.name || classItem.nome || `Turma ${classItem.id}`}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                        {game.thumbnail ? (
                                            <img
                                                src={game.thumbnail}
                                                alt={game.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Gamepad2 className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openGame(game.id)}
                                            className="flex-1"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-1" />
                                            Jogar
                                        </Button>
                                        {canEdit && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditModal(game)}
                                                    title="Editar jogo"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openDeleteModal(game)}
                                                    className="text-destructive hover:text-destructive"
                                                    title="Excluir jogo"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal de Edição */}
            <Dialog open={!!editingGame} onOpenChange={() => {
                setEditingGame(null);
                setEditError('');
            }}>
                <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Editar Jogo</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {editError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro</AlertTitle>
                                <AlertDescription>{editError}</AlertDescription>
                            </Alert>
                        )}
                        {editingGame && !canEditGame(editingGame) && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Sem Permissão</AlertTitle>
                                <AlertDescription>
                                    Você não tem permissão para editar este jogo. Apenas o criador ou administradores podem editar.
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL do Jogo</label>
                            <Input
                                type="url"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                placeholder="https://wordwall.net/pt/resource/..."
                                disabled={!canEditGame(editingGame)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Disciplina</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={editSubject}
                                onChange={(e) => setEditSubject(e.target.value)}
                                disabled={!canEditGame(editingGame)}
                            >
                                {DISCIPLINAS.map((disciplina) => (
                                    <option key={disciplina} value={disciplina}>{disciplina}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Seção de Turmas Vinculadas */}
                        {editingGame && (['admin', 'tecadm'].includes(user?.role) || editingGame.userId === user.id) && (
                            <div className="space-y-4 p-4 bg-muted rounded-lg border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium mb-1">Turmas Vinculadas</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {editingGame.classes && Array.isArray(editingGame.classes) && editingGame.classes.length > 0
                                                ? `${editingGame.classes.length} turma(s) vinculada(s)`
                                                : 'Nenhuma turma vinculada'}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowEditClassesSection(!showEditClassesSection)}
                                        disabled={!canEditGame(editingGame)}
                                    >
                                        {showEditClassesSection ? 'Ocultar' : 'Editar Turmas'}
                                    </Button>
                                </div>
                                
                                {/* Lista de turmas atuais */}
                                {editingGame.classes && Array.isArray(editingGame.classes) && editingGame.classes.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {editingGame.classes.map((classItem) => (
                                            <Badge key={classItem.id} variant="secondary" className="text-xs">
                                                {classItem.name || classItem.nome || `Turma ${classItem.id}`}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Seção de edição de turmas (apenas admin/tecadm) */}
                                {showEditClassesSection && ['admin', 'tecadm'].includes(user?.role) && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <p className="text-sm text-muted-foreground">
                                            Escolha como deseja atualizar as turmas vinculadas:
                                        </p>
                                        
                                        <RadioGroup value={editLinkOption} onValueChange={setEditLinkOption} className="space-y-4">
                                            {/* Opção 1: Turma específica */}
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="class" id="edit-option-class" />
                                                    <Label htmlFor="edit-option-class" className="font-medium cursor-pointer text-sm">
                                                        Adicionar Turma Específica
                                                    </Label>
                                                </div>
                                                {editLinkOption === 'class' && (
                                                    <div className="ml-6 space-y-3 p-3 bg-background rounded-md border">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Estado</label>
                                                                <Select
                                                                    value={editSelectedState}
                                                                    onValueChange={setEditSelectedState}
                                                                    disabled={isLoadingEditFilters}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Estado" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Estado</SelectItem>
                                                                        {editStates.map(state => (
                                                                            <SelectItem key={state.id} value={state.id}>
                                                                                {state.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Município</label>
                                                                <Select
                                                                    value={editSelectedMunicipality}
                                                                    onValueChange={setEditSelectedMunicipality}
                                                                    disabled={isLoadingEditFilters || editSelectedState === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Município" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Município</SelectItem>
                                                                        {editMunicipalities.map(municipality => (
                                                                            <SelectItem key={municipality.id} value={municipality.id}>
                                                                                {municipality.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Escola</label>
                                                                <Select
                                                                    value={editSelectedSchool}
                                                                    onValueChange={setEditSelectedSchool}
                                                                    disabled={isLoadingEditFilters || editSelectedMunicipality === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Escola" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Escola</SelectItem>
                                                                        {editSchools.map(school => (
                                                                            <SelectItem key={school.id} value={school.id}>
                                                                                {school.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Série</label>
                                                                <Select
                                                                    value={editSelectedGrade}
                                                                    onValueChange={setEditSelectedGrade}
                                                                    disabled={isLoadingEditFilters || editSelectedSchool === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Série" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Série</SelectItem>
                                                                        {editGrades.map(grade => (
                                                                            <SelectItem key={grade.id} value={grade.id}>
                                                                                {grade.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Turma</label>
                                                                <Select
                                                                    value={editSelectedClass}
                                                                    onValueChange={setEditSelectedClass}
                                                                    disabled={isLoadingEditFilters || editSelectedGrade === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Turma" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Turma</SelectItem>
                                                                        {editClasses.map(classItem => (
                                                                            <SelectItem key={classItem.id} value={classItem.id}>
                                                                                {classItem.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleAddClassToEdit}
                                                            disabled={editSelectedClass === 'all' || isLoadingEditFilters}
                                                            className="w-full"
                                                        >
                                                            Adicionar Turma
                                                        </Button>
                                                        
                                                        {/* Lista de turmas selecionadas para adicionar */}
                                                        {editingClasses.length > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-medium">Turmas que serão vinculadas:</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {editingClasses.map((classId) => {
                                                                        // Tentar encontrar o nome da turma
                                                                        const classItem = editClasses.find(c => c.id === classId);
                                                                        const originalClass = editingGame.classes?.find((c) => c.id === classId);
                                                                        const className = classItem?.name || originalClass?.name || originalClass?.nome || `Turma ${classId}`;
                                                                        
                                                                        return (
                                                                            <Badge key={classId} variant="secondary" className="text-xs flex items-center gap-1">
                                                                                {className}
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveClassFromEdit(classId)}
                                                                                    className="ml-1 hover:text-destructive"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </Badge>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Opção 2: Todas as turmas de uma escola */}
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="school" id="edit-option-school" />
                                                    <Label htmlFor="edit-option-school" className="font-medium cursor-pointer text-sm">
                                                        Todas as Turmas de uma Escola
                                                    </Label>
                                                </div>
                                                {editLinkOption === 'school' && (
                                                    <div className="ml-6 space-y-3 p-3 bg-background rounded-md border">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Estado</label>
                                                                <Select
                                                                    value={editSelectedState}
                                                                    onValueChange={setEditSelectedState}
                                                                    disabled={isLoadingEditFilters}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Estado" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Estado</SelectItem>
                                                                        {editStates.map(state => (
                                                                            <SelectItem key={state.id} value={state.id}>
                                                                                {state.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Município</label>
                                                                <Select
                                                                    value={editSelectedMunicipality}
                                                                    onValueChange={setEditSelectedMunicipality}
                                                                    disabled={isLoadingEditFilters || editSelectedState === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Município" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Município</SelectItem>
                                                                        {editMunicipalities.map(municipality => (
                                                                            <SelectItem key={municipality.id} value={municipality.id}>
                                                                                {municipality.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2 col-span-2">
                                                                <label className="text-xs font-medium">Escola</label>
                                                                <Select
                                                                    value={editSelectedSchool}
                                                                    onValueChange={setEditSelectedSchool}
                                                                    disabled={isLoadingEditFilters || editSelectedMunicipality === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Escola" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Escola</SelectItem>
                                                                        {editSchools.map(school => (
                                                                            <SelectItem key={school.id} value={school.id}>
                                                                                {school.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Opção 3: Todas as turmas de uma série */}
                                            <div className="space-y-3">
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="grade" id="edit-option-grade" />
                                                    <Label htmlFor="edit-option-grade" className="font-medium cursor-pointer text-sm">
                                                        Todas as Turmas de uma Série
                                                    </Label>
                                                </div>
                                                {editLinkOption === 'grade' && (
                                                    <div className="ml-6 space-y-3 p-3 bg-background rounded-md border">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Estado</label>
                                                                <Select
                                                                    value={editSelectedState}
                                                                    onValueChange={setEditSelectedState}
                                                                    disabled={isLoadingEditFilters}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Estado" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Estado</SelectItem>
                                                                        {editStates.map(state => (
                                                                            <SelectItem key={state.id} value={state.id}>
                                                                                {state.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Município</label>
                                                                <Select
                                                                    value={editSelectedMunicipality}
                                                                    onValueChange={setEditSelectedMunicipality}
                                                                    disabled={isLoadingEditFilters || editSelectedState === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Município" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Município</SelectItem>
                                                                        {editMunicipalities.map(municipality => (
                                                                            <SelectItem key={municipality.id} value={municipality.id}>
                                                                                {municipality.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Escola</label>
                                                                <Select
                                                                    value={editSelectedSchool}
                                                                    onValueChange={setEditSelectedSchool}
                                                                    disabled={isLoadingEditFilters || editSelectedMunicipality === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Escola" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Escola</SelectItem>
                                                                        {editSchools.map(school => (
                                                                            <SelectItem key={school.id} value={school.id}>
                                                                                {school.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Série</label>
                                                                <Select
                                                                    value={editSelectedGrade}
                                                                    onValueChange={setEditSelectedGrade}
                                                                    disabled={isLoadingEditFilters || editSelectedSchool === 'all'}
                                                                >
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue placeholder="Série" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">Série</SelectItem>
                                                                        {editGrades.map(grade => (
                                                                            <SelectItem key={grade.id} value={grade.id}>
                                                                                {grade.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </RadioGroup>
                                        
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Atenção</AlertTitle>
                                            <AlertDescription className="text-xs">
                                                Ao salvar, as turmas vinculadas serão atualizadas conforme a opção selecionada. 
                                                As turmas antigas serão substituídas pelas novas.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 justify-end pt-4 border-t mt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingGame(null);
                                setEditError('');
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdateGame}
                            disabled={isEditing || !editUrl.trim() || !canEditGame(editingGame)}
                        >
                            {isEditing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Alterações'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Exclusão */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Exclusão</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>
                            Tem certeza que deseja excluir o jogo "{gameToDelete?.title}"?
                            Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteGame}
                            >
                                Excluir Jogo
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GamesManagement; 