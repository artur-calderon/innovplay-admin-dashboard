import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from 'react-toastify'
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/authContext";
import Layout from "./components/layout/Layout";
import { PrivateRoute } from "./components/PrivateRoute";

// Lazy loading para reduzir o tamanho dos chunks
const Index = React.lazy(() => import("./pages/Index"));
const Evaluations = React.lazy(() => import("./pages/Evaluations"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Login = React.lazy(() => import("./pages/Login"));
const EmBreve = React.lazy(() => import("./pages/EmBreve"));
const StudentEvaluations = React.lazy(() => import("./components/evaluations/StudentEvaluations"));
const Users = React.lazy(() => import("./pages/Users"));
const Schools = React.lazy(() => import("./pages/Schools"));
const Profile = React.lazy(() => import("./pages/Profile"));
const SchoolDetails = React.lazy(() => import("./components/schools/SchoolDetails"));
const ClassDetails = React.lazy(() => import("./components/schools/ClassDetails"));
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
const StudentAgenda = React.lazy(() => import("./pages/StudentAgenda"));
const TakeEvaluationPage = React.lazy(() => import("./pages/TakeEvaluationPage"));
const EvaluationCorrection = React.lazy(() => import("./pages/EvaluationCorrection"));
const Results = React.lazy(() => import("./pages/Results"));

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
              user.id ? <Navigate to={getBaseRoute()} /> : <Login />
            }
          />

          {/* Rotas do aluno */}
          <Route path="/aluno" element={<Layout />}>
            <Route index element={<PrivateRoute><Index /></PrivateRoute>} />
            <Route path="/aluno/avaliacoes" element={<PrivateRoute><StudentEvaluations /></PrivateRoute>} />
            <Route path="/aluno/agenda" element={<PrivateRoute><StudentAgenda /></PrivateRoute>} />
            <Route path="/aluno/editar-atalhos" element={<PrivateRoute><EditQuickLinks /></PrivateRoute>} />
            <Route path="/aluno/jogos" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/aluno/play-tv" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/aluno/certificados" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/aluno/competicoes" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/aluno/olimpiadas" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/aluno/escolas" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/aluno/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/aluno/avisos" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
          </Route>

          {/* Rotas do app (admin/professor/etc) */}
          <Route path="/app" element={<Layout />}>
            <Route index element={<PrivateRoute><Index /></PrivateRoute>} />
            <Route path="/app/avaliacoes" element={<PrivateRoute><Evaluations /></PrivateRoute>} />
            <Route path="/app/avaliacoes/correcao" element={<PrivateRoute><EvaluationCorrection /></PrivateRoute>} />
            <Route path="/app/resultados" element={<PrivateRoute><Results /></PrivateRoute>} />
            <Route path="/app/avaliacao/:id" element={<PrivateRoute><ViewEvaluation /></PrivateRoute>} />
            <Route path="/app/avaliacao/:id/editar" element={<PrivateRoute><EditEvaluation /></PrivateRoute>} />
            <Route path="/app/avaliacao/:id/fazer" element={<PrivateRoute><TakeEvaluationPage /></PrivateRoute>} />
            <Route path="/app/editar-atalhos" element={<PrivateRoute><EditQuickLinks /></PrivateRoute>} />
            <Route path="/app/criar-avaliacao" element={<PrivateRoute><CreateEvaluation /></PrivateRoute>} />
            <Route path="/app/agenda" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/jogos" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/play-tv" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/plantao" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/cartao-resposta" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/certificados" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/competicoes" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/olimpiadas" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/escolas" element={<PrivateRoute><Schools /></PrivateRoute>} />
            <Route path="/app/city" element={<PrivateRoute><Cities /></PrivateRoute>} />
            <Route path="/app/escola/:id" element={<PrivateRoute><SchoolDetails /></PrivateRoute>} />
            <Route path="/app/turma/:id" element={<PrivateRoute><ClassDetails /></PrivateRoute>} />
            <Route path="/app/escola/:id/adicionar-aluno" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/escola/:id/criar-turma" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/usuarios" element={<PrivateRoute><Users /></PrivateRoute>} />
            <Route path="/app/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/app/avisos" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
            <Route path="/app/configuracoes" element={<PrivateRoute><EmBreve /></PrivateRoute>} />

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
