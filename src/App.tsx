import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from 'react-toastify'
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/authContext";
import Layout from "./components/layout/Layout";
import FullscreenLayout from "./components/layout/FullscreenLayout";
import { PrivateRoute } from "./components/PrivateRoute";

// Lazy loading para reduzir o tamanho dos chunks
const Index = React.lazy(() => import("./pages/Index"));
const Evaluations = React.lazy(() => import("./pages/Evaluations"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const ChangePassword = React.lazy(() => import("./pages/ChangePassword"));
const EmBreve = React.lazy(() => import("./pages/EmBreve"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Certificates = React.lazy(() => import("./pages/Certificates"));
const StudentCertificates = React.lazy(() => import("./pages/StudentCertificates"));
const StudentEvaluations = React.lazy(() => import("./components/evaluations/StudentEvaluations"));
const Users = React.lazy(() => import("./pages/Users"));
const Profile = React.lazy(() => import("./pages/Profile"));
const ClassDetails = React.lazy(() => import("./components/schools/ClassDetails"));
const SchoolDetails = React.lazy(() => import("./components/schools/SchoolDetails"));
const CreateEvaluation = React.lazy(() => import("./pages/CreateEvaluation"));
const EditEvaluation = React.lazy(() => import("./pages/EditEvaluation"));
const Cities = React.lazy(() => import("./pages/Cities"));
const EditQuickLinks = React.lazy(() => import("./pages/EditQuickLinks"));
const ViewEvaluation = React.lazy(() => import("./pages/ViewEvaluation"));
const CreateQuestionPage = React.lazy(() => import("./pages/CreateQuestionPage"));
const QuestionsPage = React.lazy(() => import("./pages/QuestionsPage"));
const EditQuestionPage = React.lazy(() => import("./pages/EditQuestionPage"));
const Turmas = React.lazy(() => import("./pages/Turmas"));
const Instituicao = React.lazy(() => import("./pages/Instituicao"));
const Curso = React.lazy(() => import("./pages/Curso"));
const Serie = React.lazy(() => import("./pages/Serie"));
const Disciplina = React.lazy(() => import("./pages/Disciplina"));
const StudentAgenda = React.lazy(() => import("./pages/StudentAgendaOptimized"));
const AdminAgenda = React.lazy(() => import("./pages/AdminAgendaOptimized"));
const TakeEvaluation = React.lazy(() => import("./components/evaluations/TakeEvaluation/index"));
const EvaluationCorrection = React.lazy(() => import("./pages/EvaluationCorrection"));
const Results = React.lazy(() => import("./pages/Results"));
const EvaluationResults = React.lazy(() => import("./components/evaluations/EvaluationResults"));
const DetailedResultsView = React.lazy(() => import("./components/evaluations/DetailedResultsView"));
const StudentDetailedResults = React.lazy(() => import("./components/evaluations/StudentDetailedResults"));
const AnaliseAvaliacoes = React.lazy(() => import("./pages/AnaliseAvaliacoes"));
const AcertoNiveis = React.lazy(() => import("./pages/AcertoNiveis"));
const RelatorioEscolar = React.lazy(() => import("./pages/RelatorioEscolar"));
const PhysicalTestPage = React.lazy(() => import("./pages/PhysicalTestPage"));
const Evolution = React.lazy(() => import("./pages/Evolution"));

// Lazy loading para componentes de jogos
const GamesManagement = React.lazy(() => import("./pages/GamesManagement"));
const AddGame = React.lazy(() => import("./pages/AddGame"));
const StudentGames = React.lazy(() => import("./pages/StudentGames"));
const GameView = React.lazy(() => import("./components/games/GameView"));

// Lazy loading para calculadora SAEB
const IdebCalculatorPage = React.lazy(() => import("./pages/IdebCalculatorPage"));

// Lazy loading para avisos
const Avisos = React.lazy(() => import("./pages/Avisos"));

// Lazy loading para questionários
const FormRegistration = React.lazy(() => import("./pages/FormRegistration"));
const FormView = React.lazy(() => import("./pages/FormView"));
const FormCreate = React.lazy(() => import("./pages/FormCreate"));
const FormReports = React.lazy(() => import("./pages/FormReports"));

// Lazy loading para competições e torneios
const Competicoes = React.lazy(() => import("./pages/Competicoes"));
const TorneioExecucao = React.lazy(() => import("./pages/TorneioExecucao"));

// Lazy loading para dashboards específicos
const StudentDashboard = React.lazy(() => import("./pages/StudentDashboard"));
const StudentResult = React.lazy(() => import("./pages/StudentResult"));
const ProfessorDashboard = React.lazy(() => import("./pages/ProfessorDashboard"));

// Lazy loading para Play TV
const PlayTvManagement = React.lazy(() => import("./pages/PlayTvManagement"));
const PlayTvStudent = React.lazy(() => import("./pages/PlayTvStudent"));
const PlayTvVideoView = React.lazy(() => import("./pages/PlayTvVideoView"));

// Lazy loading para Plantão Online
const PlantaoOnline = React.lazy(() => import("./pages/PlantaoOnline"));
const PlantaoOnlineStudent = React.lazy(() => import("./pages/PlantaoOnlineStudent"));
const AnswerSheetGenerator = React.lazy(() => import("./pages/AnswerSheetGenerator"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  const { user } = useAuth();

  // Função para determinar a rota baseada no papel do usuário
  const getBaseRoute = () => {
    if (!user.id) return '/';
    return user.role === 'aluno' ? '/aluno' : '/app';
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Sonner />

        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Rota raiz - redireciona baseado no papel do usuário */}
            <Route
              path="/"
              element={
                user.id ? <Navigate to={getBaseRoute()} /> : <Login key="login" />
              }
            />

            {/* Rotas de autenticação */}
            <Route path="/forgot-password" element={<ForgotPassword key="forgot-password" />} />
            <Route path="/reset-password" element={<ResetPassword key="reset-password" />} />
            <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />

            {/* Rotas do aluno */}
            <Route path="/aluno" element={<Layout />}>
              <Route index element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
              <Route path="/aluno/avaliacoes" element={<PrivateRoute><StudentEvaluations /></PrivateRoute>} />
              {/** Rota removida: página de resultados do aluno foi descontinuada */}
              <Route path="/aluno/avaliacao/:id/resultado" element={<PrivateRoute><StudentResult /></PrivateRoute>} />
              <Route path="/aluno/agenda" element={<PrivateRoute><StudentAgenda /></PrivateRoute>} />
              <Route path="/aluno/editar-atalhos" element={<PrivateRoute><EditQuickLinks /></PrivateRoute>} />
              <Route path="/aluno/jogos" element={<PrivateRoute><StudentGames /></PrivateRoute>} />
              <Route path="/aluno/jogos/:id" element={<PrivateRoute><GameView /></PrivateRoute>} />
              <Route path="/aluno/play-tv" element={<PrivateRoute><PlayTvStudent /></PrivateRoute>} />
              <Route path="/aluno/play-tv/:id" element={<PrivateRoute><PlayTvVideoView /></PrivateRoute>} />
              <Route path="/aluno/plantao-online" element={<PrivateRoute><PlantaoOnlineStudent /></PrivateRoute>} />
              <Route path="/aluno/certificados" element={<PrivateRoute><StudentCertificates /></PrivateRoute>} />
              <Route path="/aluno/competicoes" element={<PrivateRoute><Competicoes /></PrivateRoute>} />
              <Route path="/aluno/torneio/:torneioId" element={<PrivateRoute><TorneioExecucao /></PrivateRoute>} />
              <Route path="/aluno/olimpiadas" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
              <Route path="/aluno/questionario" element={<PrivateRoute><EmBreve /></PrivateRoute>} />

              <Route path="/aluno/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/aluno/avisos" element={<PrivateRoute><Avisos /></PrivateRoute>} />
              <Route path="/aluno/configuracoes" element={<PrivateRoute><Settings /></PrivateRoute>} />
            </Route>

            {/* Rota de avaliação em tela cheia para alunos */}
            <Route path="/aluno/avaliacao/:id/fazer" element={<FullscreenLayout />}>
              <Route index element={<PrivateRoute><TakeEvaluation /></PrivateRoute>} />
            </Route>

            {/* Rotas do app (admin/professor/etc) */}
            <Route path="/app" element={<Layout />}>
              <Route index element={<PrivateRoute><Index /></PrivateRoute>} />
              <Route path="/app/avaliacoes" element={<PrivateRoute><Evaluations /></PrivateRoute>} />
              <Route path="/app/avaliacoes/correcao" element={<PrivateRoute><EvaluationCorrection /></PrivateRoute>} />
              <Route path="/app/resultados" element={<PrivateRoute><Results /></PrivateRoute>} />
              <Route path="/app/evolucao" element={<PrivateRoute><Evolution /></PrivateRoute>} />
              <Route path="/app/avaliacao/:id/resultados" element={<PrivateRoute><EvaluationResults /></PrivateRoute>} />
              <Route path="/app/avaliacao/:id/resultados-detalhados" element={<PrivateRoute><DetailedResultsView onBack={() => window.history.back()} /></PrivateRoute>} />
              <Route path="/app/avaliacao/:id/aluno/:studentId/resultados" element={<PrivateRoute><StudentDetailedResults onBack={() => window.history.back()} /></PrivateRoute>} />
              <Route path="/app/avaliacao/:id" element={<PrivateRoute><ViewEvaluation /></PrivateRoute>} />
              <Route path="/app/avaliacao/:id/editar" element={<PrivateRoute><EditEvaluation /></PrivateRoute>} />
              <Route path="/app/avaliacao/:id/fisica" element={<PrivateRoute><PhysicalTestPage /></PrivateRoute>} />
              <Route path="/app/provas-fisicas/:id" element={<PrivateRoute><PhysicalTestPage /></PrivateRoute>} />
              <Route path="/app/editar-atalhos" element={<PrivateRoute><EditQuickLinks /></PrivateRoute>} />
              <Route path="/app/criar-avaliacao" element={<PrivateRoute><CreateEvaluation /></PrivateRoute>} />
              <Route path="/app/calculadora-saeb" element={<PrivateRoute><IdebCalculatorPage /></PrivateRoute>} />
              <Route path="/app/calculo-metas" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
              <Route path="/app/agenda" element={<PrivateRoute><AdminAgenda /></PrivateRoute>} />
              <Route path="/app/jogos" element={<PrivateRoute><GamesManagement /></PrivateRoute>} />
              <Route path="/app/jogos/adicionar" element={<PrivateRoute><AddGame /></PrivateRoute>} />
              <Route path="/app/jogos/:id" element={<PrivateRoute><GameView /></PrivateRoute>} />
              <Route path="/app/play-tv" element={<PrivateRoute><PlayTvManagement /></PrivateRoute>} />
              <Route path="/app/play-tv/:id" element={<PrivateRoute><PlayTvVideoView /></PrivateRoute>} />
              <Route path="/app/plantao" element={<PrivateRoute><PlantaoOnline /></PrivateRoute>} />
              <Route path="/app/cartao-resposta" element={<PrivateRoute><AnswerSheetGenerator /></PrivateRoute>} />
              <Route path="/app/certificados" element={<PrivateRoute><Certificates /></PrivateRoute>} />
              <Route path="/app/competicoes" element={<PrivateRoute><Competicoes /></PrivateRoute>} />
              <Route path="/app/torneio/:torneioId" element={<PrivateRoute><TorneioExecucao /></PrivateRoute>} />
              <Route path="/app/olimpiadas" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
              <Route path="/app/city" element={<PrivateRoute><Cities /></PrivateRoute>} />
              <Route path="/app/turma/:id" element={<PrivateRoute><ClassDetails /></PrivateRoute>} />
              <Route path="/app/escola/:id" element={<PrivateRoute><SchoolDetails /></PrivateRoute>} />
              <Route path="/app/usuarios" element={<PrivateRoute><Users /></PrivateRoute>} />
              <Route path="/app/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/app/avisos" element={<PrivateRoute><Avisos /></PrivateRoute>} />
              <Route path="/app/configuracoes" element={<PrivateRoute><Settings /></PrivateRoute>} />

              {/* Rotas de gerenciamento de questões */}
              <Route path="/app/cadastros/questao" element={<PrivateRoute><QuestionsPage /></PrivateRoute>} />
              <Route path="/app/cadastros/questao/criar" element={<PrivateRoute><CreateQuestionPage /></PrivateRoute>} />
              <Route path="/app/cadastros/questao/editar/:id" element={<PrivateRoute><EditQuestionPage /></PrivateRoute>} />

              {/* Rotas de gerenciamento de turmas */}
              <Route path="/app/cadastros/turma" element={<PrivateRoute><Turmas /></PrivateRoute>} />

              {/* Rotas de cadastros institucionais */}
              <Route path="/app/cadastros/instituicao" element={<PrivateRoute><Instituicao /></PrivateRoute>} />
              <Route path="/app/cadastros/curso" element={<PrivateRoute><Curso /></PrivateRoute>} />
              <Route path="/app/cadastros/serie" element={<PrivateRoute><Serie /></PrivateRoute>} />
              <Route path="/app/cadastros/disciplina" element={<PrivateRoute><Disciplina /></PrivateRoute>} />

              {/* Rotas de Questionários */}
              <Route path="/app/questionarios/cadastro" element={<PrivateRoute><FormRegistration /></PrivateRoute>} />
              <Route path="/app/questionarios/criar/:formType" element={<PrivateRoute><FormCreate /></PrivateRoute>} />
              <Route path="/app/questionarios/:id" element={<PrivateRoute><FormView /></PrivateRoute>} />
              <Route path="/app/questionarios/relatorios-socio-economicos" element={<PrivateRoute><FormReports /></PrivateRoute>} />
              <Route path="/app/questionario" element={<PrivateRoute><EmBreve /></PrivateRoute>} />

              {/* Rotas de Relatórios */}
              <Route path="/app/relatorios/analise-avaliacoes" element={<PrivateRoute><AnaliseAvaliacoes /></PrivateRoute>} />
              <Route path="/app/relatorios/acerto-niveis" element={<PrivateRoute><AcertoNiveis /></PrivateRoute>} />
              <Route path="/app/relatorios/relatorio-escolar" element={<PrivateRoute><RelatorioEscolar /></PrivateRoute>} />
            </Route>

            {/* Rota de avaliação em tela cheia para admin/professor */}
            <Route path="/app/avaliacao/:id/fazer" element={<FullscreenLayout />}>
              <Route index element={<PrivateRoute><TakeEvaluation /></PrivateRoute>} />
            </Route>

            {/* Rota 404 para outras rotas não encontradas */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;