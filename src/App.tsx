import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from 'react-toastify'
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Evaluations from "./pages/Evaluations";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { useAuth } from "./context/authContext";
import EmBreve from "./pages/EmBreve";
import Layout from "./components/layout/Layout";
import StudentEvaluations from "./components/evaluations/StudentEvaluations";
import Users from "./pages/Users";
import Schools from "./pages/Schools";
import Profile from "./pages/Profile";
import { PrivateRoute } from "./components/PrivateRoute";
import SchoolDetails from "./components/schools/SchoolDetails";
import { ClassDetails } from "./components/schools/ClassDetails";
import CreateEvaluation from "./pages/CreateEvaluation";
import EditEvaluation from "./pages/EditEvaluation";
import Cities from "@/pages/Cities";
import EditQuickLinks from "./pages/EditQuickLinks";
import ViewEvaluation from "./pages/ViewEvaluation";
import CreateQuestionPage from "./pages/CreateQuestionPage";
import QuestionsPage from "./pages/QuestionsPage";
import EditQuestionPage from "./pages/EditQuestionPage";
import Turmas from "./pages/Turmas";

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
            <Route path="/aluno/agenda" element={<PrivateRoute><EmBreve /></PrivateRoute>} />
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
            <Route path="/app/avaliacao/:id" element={<PrivateRoute><ViewEvaluation /></PrivateRoute>} />
            <Route path="/app/avaliacao/:id/editar" element={<PrivateRoute><EditEvaluation /></PrivateRoute>} />
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
            
            {/* Rota de gerenciamento de turmas */}
            <Route path="/app/cadastros/turma" element={<PrivateRoute><Turmas /></PrivateRoute>} />
          </Route>

          {/* Rota 404 para outras rotas não encontradas */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
