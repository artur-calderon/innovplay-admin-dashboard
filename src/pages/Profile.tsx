import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/authContext";
import { useNavigate } from "react-router-dom";
import { Lock, User, GraduationCap, Building2, MapPin, Calendar, Mail, Phone, Home, Users, School, BookOpen, Trophy, Shield, Clock, Globe, Heart } from "lucide-react";
import { getRoleDisplayName } from "@/lib/constants";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface StudentData {
  id: string;
  name: string;
  registration: string;
  birth_date: string;
  class_id: string;
  grade_id: string;
  school_id: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    registration: string;
    role: string;
    city_id: string | null;
    created_at: string;
    updated_at: string;
  };
  school: {
    id: string;
    name: string;
    domain: string;
    address: string;
    city_id: string;
  };
  class: {
    id: string;
    name: string;
    school_id: string;
    grade_id: string;
  };
  grade: {
    id: string;
    name: string;
  };
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
          // Para admin, tecadm, diretor, coordenador
          response = await api.get(`/users/${user.id}`);
          setProfileData(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        toast.error('Erro ao carregar dados do perfil');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchProfileData();
    }
  }, [user.id, user.role]);

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

  // Mock data for the profile page (mantendo as seções existentes)
  const personalDetails = {
    "Nome completo": user?.name || "Nome não informado",
    "Data de Nascimento": user?.birth_date || "Data não informada",
    "Gênero": user?.gender || "Gênero não informado",
    "Nacionalidade": user?.nationality || "Nacionalidade não informada",
    "Endereço": user?.address || "Endereço não informado",
    "Telefone": user?.phone || "Telefone não informado",
    "Email": user?.email || "usuario@exemplo.com",
  };

  const accountDetails = {
    "Nome de exibição": user?.name || "s_wilson_168920",
    "Conta criada": formatDate(user?.created_at) || "Data não informada",
    "Último login": "August 22, 2024",
    "Status da assinatura": "Membro Premium",
    "Verificação da conta": "Verificada",
    "Preferência de idioma": "Português",
    "Fuso horário": "GMT-3 (Brasília)",
  };

  const renderDetailSection = (title: string, details: Record<string, string>) => (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

  const renderStudentProfile = (data: StudentData) => (
    <div className="space-y-6">
      {/* Informações Escolares */}
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
                <span className="font-medium">{data.grade?.name || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Turma:</span>
                <span className="font-medium">{data.class?.name || "Não informado"}</span>
              </div>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da Conta */}
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
                <span className="font-medium">{data.user?.email || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Conta criada:</span>
                <span className="font-medium">{formatDate(data.user?.created_at)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Última atualização:</span>
                <span className="font-medium">{formatDate(data.user?.updated_at)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTeacherProfile = (data: TeacherData) => (
    <div className="space-y-6">
      {/* Estatísticas */}
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

      {/* Informações Pessoais */}
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

      {/* Escolas Vinculadas */}
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

      {/* Turmas */}
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

      {/* Dados do Estudante (se aplicável) */}
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

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-innov-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-6">
      {/* Header do Perfil - Coluna Esquerda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda - Informações Pessoais */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="pt-8 pb-6">
              {/* Foto do Usuário */}
              <div className="flex flex-col items-center mb-6">
                               <div className="w-32 h-32 rounded-full bg-gradient-to-r from-innov-blue to-innov-purple flex items-center justify-center mb-4 shadow-lg">
                 <span className="text-white text-5xl font-bold">
                   {user?.name?.charAt(0) || "U"}
                 </span>
               </div>
               <h1 className="text-2xl font-bold text-center mb-2">{user?.name || "Usuário"}</h1>
               <p className="text-muted-foreground text-center mb-3">{user?.email || "usuario@exemplo.com"}</p>
               
               <Badge className="text-sm px-4 py-2 bg-gradient-to-r from-innov-blue to-innov-purple text-white border-0 mb-4">
                 {getRoleDisplayName(user?.role || "")}
               </Badge>

                <Button
                  onClick={() => navigate("/change-password")}
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-innov-blue hover:text-white transition-colors w-full"
                >
                  <Lock className="h-4 w-4" />
                  Alterar senha
                </Button>
              </div>

              {/* Detalhes Básicos */}
              <div className="space-y-4">

                {/* Características */}
                <div>
                  <h3 className="font-semibold mb-3 text-innov-blue">Características</h3>
                  <div className="flex flex-wrap gap-2">
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Conteúdo Principal */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* Seções existentes mantidas */}
            {renderDetailSection("Dados Pessoais", personalDetails)}
            {renderDetailSection("Detalhes da Conta", accountDetails)}

                         {/* Conteúdo específico por role */}
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
    </div>
  );
};

export default Profile;