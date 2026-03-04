import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import { User, GraduationCap, Building2, MapPin, Calendar, Mail, Phone, Users, School, BookOpen, Trophy, Shield, Heart, Star, Target, Zap, Brain } from "lucide-react";
import { getRoleDisplayName } from "@/lib/constants";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AvatarPreview } from "@/components/profile/AvatarPreview";
import { AvatarCustomizer } from "@/components/profile/AvatarCustomizer";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { PersonalDataForm } from "@/components/profile/PersonalDataForm";
import { useAvatarConfig } from "@/hooks/useAvatarConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentData {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  registration: string;
  birth_date: string;
  address?: string;
  created_at: string;
  school: {
    id: string;
    name: string;
    domain: string;
    address: string;
  };
  city?: {
    id: string;
    name: string;
    state: string;
  };
  municipio?: string;
  estado?: string;
  class?: {
    id: string;
    name: string;
    school_id: string;
  };
  turma?: {
    id: string;
    name: string;
    school_id: string;
  };
  grade?: {
    id: string;
    name: string;
  };
  serie?: {
    id: string;
    name: string;
  };
  teachers?: Array<{
    id: string;
    name: string;
    email: string;
    registration: string;
    user_id: string;
  }>;
  professores?: Array<{
    id: string;
    name: string;
    email: string;
    registration: string;
    user_id: string;
  }>;
}

interface TeacherData {
  professor: {
    id: string;
    name: string;
    registration: string;
    birth_date: string;
    user_id: string;
  };
  usuario: {
    id: string;
    name: string;
    email: string;
    registration: string;
    role: string;
    city_id: string;
    created_at: string;
    updated_at: string;
  };
  municipio: {
    id: string;
    name: string;
    state: string;
  };
  vinculos_escolares: Array<{
    registration: string;
    school_id: string;
    school_name: string;
    school_domain: string;
    school_address: string;
    school_city_id: string;
  }>;
  turmas: Array<{
    class_id: string;
    class_name: string;
    school_id: string;
    school_name: string;
    grade_id: string;
    grade_name: string;
    teacher_registration: string;
  }>;
  estatisticas: {
    total_escolas: number;
    total_turmas: number;
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
  registration: string;
  role: string;
  city_id: string | null;
  created_at: string;
  updated_at: string;
  student_details?: StudentData;
}

const Profile = () => {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<StudentData | TeacherData | UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTraits, setUserTraits] = useState<string[]>([]);
  const { config, updateConfig, saveConfig, isSaving } = useAvatarConfig();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        let response;

        if (user?.role === 'aluno') {
          response = await api.get('/students/me');
          setProfileData(response.data);
        } else if (user?.role === 'professor') {
          response = await api.get(`/teacher/${user.id}`);
          setProfileData(response.data);
        } else {
          response = await api.get(`/users/${user.id}`);
          setProfileData(response.data);
        }

        // Carregar características do usuário
        try {
          const userResponse = await api.get(`/users/${user.id}`);
          const detailedUser = userResponse.data?.user ?? userResponse.data;
          if (detailedUser) {
            const traits = detailedUser.traits || detailedUser.characteristics || [];
            setUserTraits(Array.isArray(traits) ? traits : []);
          }
        } catch {
          // Ignorar erro ao carregar características
        }
      } catch {
        toast.error('Erro ao carregar dados do perfil');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchProfileData();
    }
  }, [user.id, user.role, user.phone, user.birth_date, user.nationality, user.gender]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Data não informada";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "Data não informada";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Usar dados do perfil quando disponível (especialmente para alunos)
  const studentData = user?.role === 'aluno' && profileData ? (profileData as StudentData) : null;
  
  const personalDetails = {
    "Nome completo": studentData?.full_name || studentData?.name || user?.name || "Nome não informado",
    "Data de Nascimento": studentData?.birth_date || user?.birth_date || "Data não informada",
    "Gênero": user?.gender || "Gênero não informado",
    "Nacionalidade": user?.nationality || "Nacionalidade não informada",
    "Endereço": studentData?.address || user?.address || "Endereço não informado",
    "Telefone": user?.phone || "Telefone não informado",
    "Email": studentData?.email || user?.email || "usuario@exemplo.com",
  };

  const renderDetailSection = (title: string, details: Record<string, string>) => (
    <Card className="mb-4 sm:mb-6 overflow-hidden">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {Object.entries(details).map(([key, value]) => (
            <div key={key} className="flex flex-col space-y-1">
              <div className="text-sm text-muted-foreground">{key}:</div>
              <div className="font-medium">
                {key === "Verificação da conta" && value === "Verificada" ? (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-green-100 text-green-800">
                    {value}
                  </span>
                ) : key.includes("Ativad") || key.includes("Inscrit") ? (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800">
                    {value}
                  </span>
                ) : (
                  value
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderStudentProfile = (data: StudentData) => {
    // Usar turma ou class (prioridade para turma)
    const turma = data.turma || data.class;
    // Usar serie ou grade (prioridade para serie)
    const serie = data.serie || data.grade;
    // Usar professores ou teachers (prioridade para professores)
    const professores = data.professores || data.teachers || [];
    // Usar city ou municipio/estado
    const cidadeNome = data.city?.name || data.municipio || "Não informado";
    const estadoNome = data.city?.state || data.estado || "";

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <School className="h-5 w-5 text-innov-blue" />
              Informações Escolares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Escola:</span>
                  <span className="font-medium">{data.school?.name || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Série:</span>
                  <span className="font-medium">{serie?.name || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Turma:</span>
                  <span className="font-medium">{turma?.name || "Não informado"}</span>
                </div>
                {data.school?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Endereço da Escola:</span>
                    <span className="font-medium">{data.school.address}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Data de Nascimento:</span>
                  <span className="font-medium">{formatDate(data.birth_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Matrícula:</span>
                  <span className="font-medium">{data.registration || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cadastrado em:</span>
                  <span className="font-medium">{formatDate(data.created_at)}</span>
                </div>
                {(cidadeNome !== "Não informado" || estadoNome) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cidade:</span>
                    <span className="font-medium">
                      {cidadeNome}{estadoNome ? ` - ${estadoNome}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <User className="h-5 w-5 text-innov-blue" />
              Dados da Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="font-medium">{data.email || "Não informado"}</span>
                </div>
                {data.full_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Nome Completo:</span>
                    <span className="font-medium">{data.full_name}</span>
                  </div>
                )}
                {data.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Endereço:</span>
                    <span className="font-medium">{data.address}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Conta criada:</span>
                  <span className="font-medium">{formatDate(data.created_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {professores.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-innov-blue" />
                Professores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {professores.map((professor, index) => (
                  <div key={professor.id || index} className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{professor.name || "Nome não informado"}</h4>
                      <Badge variant="secondary">{professor.registration || "N/A"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{professor.email || "Email não informado"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderTeacherProfile = (data: TeacherData) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-innov-blue to-innov-purple text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              <div>
                <p className="text-sm opacity-90">Total de Escolas</p>
                <p className="text-2xl font-bold">{data.estatisticas?.total_escolas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-innov-purple to-pink-500 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8" />
              <div>
                <p className="text-sm opacity-90">Total de Turmas</p>
                <p className="text-2xl font-bold">{data.estatisticas?.total_turmas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-innov-blue" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Data de Nascimento:</span>
                <span className="font-medium">{formatDate(data.professor?.birth_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Matrícula:</span>
                <span className="font-medium">{data.professor?.registration || "Não informado"}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="font-medium">{data.usuario?.email || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cidade:</span>
                <span className="font-medium">{data.municipio?.name || "Não informado"} - {data.municipio?.state || "Não informado"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-innov-blue" />
            Escolas Vinculadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.vinculos_escolares?.map((vinculo, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-lg">{vinculo.school_name || "Nome não informado"}</h4>
                  <Badge variant="secondary">{vinculo.school_domain || "Domínio não informado"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{vinculo.school_address || "Endereço não informado"}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>Matrícula: {vinculo.registration || "Não informado"}</span>
                </div>
              </div>
            )) || <p className="text-muted-foreground">Nenhum vínculo escolar encontrado</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-innov-blue" />
            Turmas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.turmas?.map((turma, index) => (
              <div key={index} className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{turma.class_name || "Nome não informado"}</h4>
                  <Badge variant="outline">{turma.grade_name || "Série não informada"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{turma.school_name || "Escola não informada"}</p>
              </div>
            )) || <p className="text-muted-foreground">Nenhuma turma encontrada</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAdminProfile = (data: UserData) => (
    <div className="space-y-6">
      {data.student_details && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="h-5 w-5 text-innov-blue" />
              Dados do Estudante
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Escola:</span>
                  <span className="font-medium">{data.student_details?.school?.name || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Série:</span>
                  <span className="font-medium">{data.student_details?.grade?.name || "Não informado"}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Turma:</span>
                  <span className="font-medium">{data.student_details?.class?.name || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Data de Nascimento:</span>
                  <span className="font-medium">{formatDate(data.student_details?.birth_date)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const handleSaveAvatar = async () => {
    try {
      await saveConfig();
      toast.success('Avatar personalizado salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações do avatar. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6 min-h-[50vh]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-innov-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 min-h-[50vh] overflow-x-hidden">
      <Tabs defaultValue="personalization" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6 h-auto gap-1.5 p-1.5 sm:p-1.5">
          <TabsTrigger value="personalization" className="text-xs sm:text-sm py-3 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap min-h-[44px] sm:min-h-0">
            Personalização
          </TabsTrigger>
          <TabsTrigger value="personal-data" className="text-xs sm:text-sm py-3 sm:py-2.5 px-2 sm:px-3 whitespace-nowrap min-h-[44px] sm:min-h-0">
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="password" className="text-xs sm:text-sm py-3 sm:py-2.5 px-2 sm:px-3 min-h-[44px] sm:min-h-0">
            Senha
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-xs sm:text-sm py-3 sm:py-2.5 px-2 sm:px-3 min-h-[44px] sm:min-h-0">
            Perfil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalization" className="space-y-4 sm:space-y-6 mt-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <AvatarPreview config={config} size={80} className="flex-shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="text-xl sm:text-2xl break-words">{user?.name || "Usuário"}</CardTitle>
                  <Badge className="mt-2 bg-gradient-to-r from-innov-blue to-innov-purple text-white border-0">
                    {getRoleDisplayName(user?.role || "")}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
          <AvatarCustomizer
            config={config}
            onConfigChange={updateConfig}
            onSave={handleSaveAvatar}
            isSaving={isSaving}
          />
        </TabsContent>

        <TabsContent value="personal-data" className="space-y-4 sm:space-y-6 mt-4">
          <PersonalDataForm />
        </TabsContent>

        <TabsContent value="password" className="space-y-4 sm:space-y-6 mt-4">
          <ChangePasswordForm />
        </TabsContent>

        <TabsContent value="profile" className="space-y-4 sm:space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-1 order-2 lg:order-1">
              <Card className="lg:sticky lg:top-6">
                <CardContent className="pt-6 sm:pt-8 pb-6">
                  <div className="flex flex-col items-center mb-4 sm:mb-6">
                    {user?.avatar_config ? (
                      <AvatarPreview config={user.avatar_config} size={128} className="mb-4 flex-shrink-0" />
                    ) : (
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-innov-blue to-innov-purple flex items-center justify-center mb-4 shadow-lg flex-shrink-0">
                        <span className="text-white text-4xl sm:text-5xl font-bold">
                          {user?.name?.charAt(0) || "U"}
                        </span>
                      </div>
                    )}
                    <h1 className="text-xl sm:text-2xl font-bold text-center mb-2 break-words px-1">{user?.name || "Usuário"}</h1>
                    <p className="text-sm sm:text-base text-muted-foreground text-center mb-3 break-all px-1">{user?.email || "usuario@exemplo.com"}</p>
                    <Badge className="text-sm px-4 py-2 bg-gradient-to-r from-innov-blue to-innov-purple text-white border-0 mb-4">
                      {getRoleDisplayName(user?.role || "")}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3 text-innov-blue">Características</h3>
                      {userTraits.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const traitMap: Record<string, { icon: any, label: string, color: string }> = {
                              organizado: { icon: Shield, label: "Organizado", color: "bg-blue-100 text-blue-800" },
                              dedicado: { icon: Heart, label: "Dedicado", color: "bg-green-100 text-green-800" },
                              focado: { icon: Trophy, label: "Focado", color: "bg-purple-100 text-purple-800" },
                              proativo: { icon: Target, label: "Proativo", color: "bg-orange-100 text-orange-800" },
                              criativo: { icon: Star, label: "Criativo", color: "bg-yellow-100 text-yellow-800" },
                              energetico: { icon: Zap, label: "Energético", color: "bg-pink-100 text-pink-800" },
                              analitico: { icon: Brain, label: "Analítico", color: "bg-indigo-100 text-indigo-800" },
                            };

                            return userTraits.map((trait) => {
                              const traitInfo = traitMap[trait] || { 
                                icon: Trophy, 
                                label: trait.charAt(0).toUpperCase() + trait.slice(1), 
                                color: "bg-gray-100 text-gray-800" 
                              };
                              const Icon = traitInfo.icon;
                              return (
                                <Badge key={trait} variant="secondary" className={`${traitInfo.color} hover:opacity-80`}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {traitInfo.label}
                                </Badge>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                              <Shield className="h-3 w-3 mr-1" />
                              Organizado
                            </Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                              <Heart className="h-3 w-3 mr-1" />
                              Dedicado
                            </Badge>
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                              <Trophy className="h-3 w-3 mr-1" />
                              Focado
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Nenhuma característica selecionada. Edite seu perfil para adicionar características.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 order-1 lg:order-2 min-w-0">
              <div className="space-y-4 sm:space-y-6">
                {renderDetailSection("Dados Pessoais", personalDetails)}

                {profileData && (
                  <>
                    {user?.role === 'aluno' && renderStudentProfile(profileData as StudentData)}
                    {user?.role === 'professor' && renderTeacherProfile(profileData as TeacherData)}
                    {(user?.role === 'admin' || user?.role === 'tecadm' || user?.role === 'diretor' || user?.role === 'coordenador') &&
                      renderAdminProfile(profileData as UserData)}
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
