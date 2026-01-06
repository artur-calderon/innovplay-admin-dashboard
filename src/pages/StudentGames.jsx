import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import {
    ExternalLink,
    Gamepad2,
    Loader2,
    BookOpen,
    Users,
    School,
    Globe,
    Calendar,
    User,
    Search
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '@/context/authContext';

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

const StudentGames = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState('Todas');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estados para dados do aluno
    const [studentClassId, setStudentClassId] = useState(null);
    const [studentSchoolId, setStudentSchoolId] = useState(null);
    const [teacherIds, setTeacherIds] = useState([]);
    const [schoolAdminIds, setSchoolAdminIds] = useState([]);
    const [isLoadingStudentInfo, setIsLoadingStudentInfo] = useState(true);

    // Buscar informações do aluno (turma, escola, professores)
    const loadStudentInfo = async () => {
        try {
            setIsLoadingStudentInfo(true);
            
            // Buscar dados do aluno
            const studentResponse = await api.get(`/students/${user.id}`);
            const studentData = studentResponse.data;
            
            // A resposta da API retorna class ou turma (objeto com id e name)
            const classId = studentData.class?.id || studentData.turma?.id;
            // A resposta da API retorna school (objeto com id e name)
            const schoolId = studentData.school?.id;
            
            setStudentClassId(classId);
            setStudentSchoolId(schoolId);
            
            // A resposta da API já inclui teachers ou professores no objeto do aluno
            if (studentData.teachers || studentData.professores) {
                const teachers = studentData.teachers || studentData.professores || [];
                const teacherUserIds = teachers
                    .map((t) => t.user_id || t.usuario?.id || t.id)
                    .filter(Boolean);
                setTeacherIds(teacherUserIds);
            } else if (classId) {
                // Fallback: buscar professores da turma se não vierem na resposta
                try {
                    const teachersResponse = await api.get(`/classes/${classId}/teachers`);
                    const teachers = teachersResponse.data?.professores || teachersResponse.data || [];
                    const teacherUserIds = teachers
                        .map((t) => t.professor?.user_id || t.usuario?.id || t.user_id || t.id)
                        .filter(Boolean);
                    setTeacherIds(teacherUserIds);
                } catch (error) {
                    console.error('Erro ao buscar professores da turma:', error);
                    setTeacherIds([]);
                }
            }
            
            // Buscar diretores e coordenadores da escola (após ter o schoolId)
            if (schoolId) {
                try {
                    // Buscar diretores da escola
                    const directorsResponse = await api.get(`/school/${schoolId}/directors`);
                    const directors = Array.isArray(directorsResponse.data) 
                        ? directorsResponse.data 
                        : (directorsResponse.data?.data || []);
                    
                    // Buscar coordenadores da escola
                    const coordinatorsResponse = await api.get(`/school/${schoolId}/coordinators`);
                    const coordinators = Array.isArray(coordinatorsResponse.data)
                        ? coordinatorsResponse.data
                        : (coordinatorsResponse.data?.data || []);
                    
                    const adminUserIds = [
                        ...directors.map((d) => d.user_id || d.usuario?.id || d.id).filter(Boolean),
                        ...coordinators.map((c) => c.user_id || c.usuario?.id || c.id).filter(Boolean)
                    ];
                    setSchoolAdminIds(adminUserIds);
                } catch (error) {
                    console.error('Erro ao buscar administradores da escola:', error);
                    setSchoolAdminIds([]);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar informações do aluno:', error);
            toast.error('Erro ao carregar informações do aluno');
        } finally {
            setIsLoadingStudentInfo(false);
        }
    };

    // Buscar jogos
    const fetchGames = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/games');
            const allGames = response.data.jogos || [];
            
            // Filtrar jogos da turma do aluno
            let filteredGames = allGames;
            
            if (studentClassId) {
                // Filtrar jogos que estão vinculados à turma do aluno
                filteredGames = allGames.filter((game) => {
                    // Verificar se o jogo tem classes vinculadas e se inclui a turma do aluno
                    if (game.classes && Array.isArray(game.classes)) {
                        return game.classes.some((c) => c.id === studentClassId);
                    }
                    return false;
                });
            }
            
            setGames(filteredGames);
        } catch (error) {
            console.error('Erro ao buscar jogos:', error);
            toast.error('Erro ao carregar os jogos');
            setGames([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStudentInfo();
    }, [user.id]);

    useEffect(() => {
        if (!isLoadingStudentInfo && studentClassId) {
            fetchGames();
        }
    }, [user.id, studentClassId, isLoadingStudentInfo]);

    // Abrir jogo na página GameView
    const openGame = (gameId) => {
        navigate(`/aluno/jogos/${gameId}`);
    };

    // Categorizar jogos por seção
    const categorizeGames = () => {
        const teacherGames = [];
        const schoolAdminGames = [];
        const otherGames = [];

        games.forEach((game) => {
            const gameUserId = game.userId;
            
            // Verificar se é jogo do professor
            if (teacherIds.includes(gameUserId)) {
                teacherGames.push(game);
            }
            // Verificar se é jogo da administração da escola
            else if (schoolAdminIds.includes(gameUserId)) {
                schoolAdminGames.push(game);
            }
            // Outros jogos (admin/tecadmin)
            else {
                otherGames.push(game);
            }
        });

        return {
            teacherGames,
            schoolAdminGames,
            otherGames
        };
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

    // Filtrar jogos por disciplina
    const filterGamesBySubject = (gamesList) => {
        if (selectedSubject === 'Todas') {
            return gamesList;
        }
        return gamesList.filter((game) => game.subject === selectedSubject);
    };

    // Agrupar jogos por disciplina dentro de cada categoria
    const groupGamesBySubject = (gamesList) => {
        const grouped = {};

        gamesList.forEach((game) => {
            const subject = game.subject || 'Sem Disciplina';
            if (!grouped[subject]) {
                grouped[subject] = [];
            }
            grouped[subject].push(game);
        });

        return grouped;
    };

    const categorizedGames = categorizeGames();
    const filteredTeacherGames = filterGamesBySubject(filterGamesByName(categorizedGames.teacherGames));
    const filteredSchoolAdminGames = filterGamesBySubject(filterGamesByName(categorizedGames.schoolAdminGames));
    const filteredOtherGames = filterGamesBySubject(filterGamesByName(categorizedGames.otherGames));

    if (isLoading || isLoadingStudentInfo) {
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
            <div>
                <h2 className="text-2xl font-bold">Meus Jogos</h2>
                <p className="text-muted-foreground">Jogue e aprenda com seus jogos educativos</p>
            </div>

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

            {/* Filtro por Disciplina */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={selectedSubject === 'Todas' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSubject('Todas')}
                >
                    Todas as Disciplinas
                </Button>
                {DISCIPLINAS.map((disciplina) => (
                    <Button
                        key={disciplina}
                        variant={selectedSubject === disciplina ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedSubject(disciplina)}
                    >
                        {disciplina}
                    </Button>
                ))}
            </div>

            {games.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">Nenhum jogo encontrado</h3>
                        <p className="text-muted-foreground">
                            Nenhum jogo disponível no momento. Aguarde seu professor adicionar jogos.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {/* Seção: Jogos do Professor */}
                    {filteredTeacherGames.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-2 border-b">
                                <Users className="w-6 h-6 text-blue-600" />
                                <h3 className="text-xl font-semibold">Jogos do Professor</h3>
                                <Badge variant="secondary">{filteredTeacherGames.length} jogo{filteredTeacherGames.length !== 1 ? 's' : ''}</Badge>
                            </div>
                            {Object.entries(groupGamesBySubject(filteredTeacherGames)).map(([subject, subjectGames]) => (
                                subjectGames.length > 0 && (
                                    <div key={`teacher-${subject}`} className="space-y-4 ml-4">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                            <h4 className="text-lg font-medium">{subject}</h4>
                                            <Badge variant="outline">{subjectGames.length} jogo{subjectGames.length !== 1 ? 's' : ''}</Badge>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {subjectGames.map((game) => (
                                                <Card key={game.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openGame(game.id)}>
                                                    <CardHeader className="pb-3">
                                                        <div className="flex justify-between items-start">
                                                            <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                                                            <Badge variant="secondary" className="ml-2">
                                                                {game.subject}
                                                            </Badge>
                                                        </div>
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
                                                                    <Gamepad2 className="w-12 h-12 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Informações do jogo */}
                                                        <div className="space-y-2">
                                                            {game.subject && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <BookOpen className="w-4 h-4" />
                                                                    <span>{game.subject}</span>
                                                                </div>
                                                            )}

                                                            {game.author && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <User className="w-4 h-4" />
                                                                    <span>{game.author}</span>
                                                                </div>
                                                            )}

                                                            {(game.createdAt || game.created_at) && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <Calendar className="w-4 h-4" />
                                                                    <span>{new Date(game.createdAt || game.created_at).toLocaleDateString('pt-BR')}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openGame(game.id);
                                                            }}
                                                            className="w-full"
                                                        >
                                                            <ExternalLink className="w-4 h-4 mr-1" />
                                                            Jogar
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {/* Seção: Jogos da Administração da Escola */}
                    {filteredSchoolAdminGames.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-2 border-b">
                                <School className="w-6 h-6 text-green-600" />
                                <h3 className="text-xl font-semibold">Jogos da Administração da Escola</h3>
                                <Badge variant="secondary">{filteredSchoolAdminGames.length} jogo{filteredSchoolAdminGames.length !== 1 ? 's' : ''}</Badge>
                            </div>
                            {Object.entries(groupGamesBySubject(filteredSchoolAdminGames)).map(([subject, subjectGames]) => (
                                subjectGames.length > 0 && (
                                    <div key={`admin-${subject}`} className="space-y-4 ml-4">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                            <h4 className="text-lg font-medium">{subject}</h4>
                                            <Badge variant="outline">{subjectGames.length} jogo{subjectGames.length !== 1 ? 's' : ''}</Badge>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {subjectGames.map((game) => (
                                                <Card key={game.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openGame(game.id)}>
                                                    <CardHeader className="pb-3">
                                                        <div className="flex justify-between items-start">
                                                            <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                                                            <Badge variant="secondary" className="ml-2">
                                                                {game.subject}
                                                            </Badge>
                                                        </div>
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
                                                                    <Gamepad2 className="w-12 h-12 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Informações do jogo */}
                                                        <div className="space-y-2">
                                                            {game.subject && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <BookOpen className="w-4 h-4" />
                                                                    <span>{game.subject}</span>
                                                                </div>
                                                            )}

                                                            {game.author && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <User className="w-4 h-4" />
                                                                    <span>{game.author}</span>
                                                                </div>
                                                            )}

                                                            {(game.createdAt || game.created_at) && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <Calendar className="w-4 h-4" />
                                                                    <span>{new Date(game.createdAt || game.created_at).toLocaleDateString('pt-BR')}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openGame(game.id);
                                                            }}
                                                            className="w-full"
                                                        >
                                                            <ExternalLink className="w-4 h-4 mr-1" />
                                                            Jogar
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {/* Seção: Outros Jogos */}
                    {filteredOtherGames.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-2 border-b">
                                <Globe className="w-6 h-6 text-purple-600" />
                                <h3 className="text-xl font-semibold">Outros Jogos</h3>
                                <Badge variant="secondary">{filteredOtherGames.length} jogo{filteredOtherGames.length !== 1 ? 's' : ''}</Badge>
                            </div>
                            {Object.entries(groupGamesBySubject(filteredOtherGames)).map(([subject, subjectGames]) => (
                                subjectGames.length > 0 && (
                                    <div key={`other-${subject}`} className="space-y-4 ml-4">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-primary" />
                                            <h4 className="text-lg font-medium">{subject}</h4>
                                            <Badge variant="outline">{subjectGames.length} jogo{subjectGames.length !== 1 ? 's' : ''}</Badge>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {subjectGames.map((game) => (
                                                <Card key={game.id} className="group hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openGame(game.id)}>
                                                    <CardHeader className="pb-3">
                                                        <div className="flex justify-between items-start">
                                                            <CardTitle className="text-lg line-clamp-2">{game.title}</CardTitle>
                                                            <Badge variant="secondary" className="ml-2">
                                                                {game.subject}
                                                            </Badge>
                                                        </div>
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
                                                                    <Gamepad2 className="w-12 h-12 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Informações do jogo */}
                                                        <div className="space-y-2">
                                                            {game.subject && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <BookOpen className="w-4 h-4" />
                                                                    <span>{game.subject}</span>
                                                                </div>
                                                            )}

                                                            {game.author && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <User className="w-4 h-4" />
                                                                    <span>{game.author}</span>
                                                                </div>
                                                            )}

                                                            {(game.createdAt || game.created_at) && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <Calendar className="w-4 h-4" />
                                                                    <span>{new Date(game.createdAt || game.created_at).toLocaleDateString('pt-BR')}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openGame(game.id);
                                                            }}
                                                            className="w-full"
                                                        >
                                                            <ExternalLink className="w-4 h-4 mr-1" />
                                                            Jogar
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    )}

                    {/* Mensagem quando não há jogos em nenhuma categoria */}
                    {filteredTeacherGames.length === 0 && 
                     filteredSchoolAdminGames.length === 0 && 
                     filteredOtherGames.length === 0 && (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Gamepad2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">Nenhum jogo encontrado</h3>
                                <p className="text-muted-foreground">
                                    Não há jogos disponíveis para a disciplina selecionada.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentGames; 