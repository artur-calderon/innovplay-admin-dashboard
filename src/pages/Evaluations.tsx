import { useAuth } from "@/context/authContext";
import StudentEvaluations from "@/components/evaluations/StudentEvaluations";
import { EvaluationsStaffView } from "@/pages/evaluations/EvaluationsStaffView";

/**
 * Central de Avaliações: alunos veem fluxo próprio; demais perfis veem gestão completa.
 */
export default function Evaluations() {
  const { user } = useAuth();

  if (user.role === "aluno") {
    return <StudentEvaluations />;
  }

  return <EvaluationsStaffView />;
}
