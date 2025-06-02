import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/authContext";

const Profile = () => {
  const user = useAuth((state) => state.user);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Data não informada";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Mock data for the profile page
  const personalDetails = {
    "Nome completo": user.name || "Nome não informado",
    "Data de Nascimento": user.birth_date || "Data não informada",
    "Gênero": user.gender || "Gênero não informado",
    "Nacionalidade": user.nationality || "Nacionalidade não informada",
    "Endereço": user.address || "Endereço não informado",
    "Telefone": user.phone || "Telefone não informado",
    "Email": user.email || "usuario@exemplo.com",
  };

  const accountDetails = {
    "Nome de exibição": user.name || "s_wilson_168920",
    "Conta criada": formatDate(user.created_at) || "Data não informada",
    "Último login": "August 22, 2024",
    "Status da assinatura": "Membro Premium",
    "Verificação da conta": "Verificada",
    "Preferência de idioma": "Português",
    "Fuso horário": "GMT-3 (Brasília)",
  };
  // const securitySettings = {
  //   "Senha alterada": "July 15, 2024",
  //   "Autenticação de dois fatores": "Ativada",
  //   "Perguntas de segurança": "Sim",
  //   "Notificações de login": "Ativadas",
  //   "Dispositivos conectados": "3 Dispositivos",
  //   "Atividade recente": "Nenhuma atividade suspeita detectada",
  // };

  // const preferences = {
  //   "Notificações por email": "Inscrito",
  //   "Alertas SMS": "Ativados",
  //   "Preferências de conteúdo": "Tecnologia, Educação, Inovação",
  //   "Visualização padrão": "Modo compacto",
  //   "Modo escuro": "Ativado",
  //   "Idioma do conteúdo": "Português",
  // };

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

  return (
    <>
      <div className="container max-w-5xl mx-auto py-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-innov-blue flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold">
              {user.name?.charAt(0) || "U"}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{user.name || "Usuário"}</h1>
          <p className="text-muted-foreground">{user.email || "usuario@exemplo.com"}</p>
          <span className="inline-flex items-center mt-2 px-2 py-1 text-xs font-medium rounded-md bg-gradient-to-r from-innov-blue to-innov-purple text-white">
            {user.role === "admin" ? "Administrador" : user.role === "professor" ? "Professor" : "Aluno"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {renderDetailSection("Dados Pessoais", personalDetails)}
            {/* {renderDetailSection("Configurações de Segurança", securitySettings)} */}
          </div>
          <div>
            {renderDetailSection("Detalhes da Conta", accountDetails)}
            {/* {renderDetailSection("Preferências", preferences)} */}
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;