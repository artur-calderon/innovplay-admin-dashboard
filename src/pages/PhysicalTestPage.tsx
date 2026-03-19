import { useParams, Navigate } from "react-router-dom";
import { PhysicalTestWorkspace } from "@/pages/physical-test/PhysicalTestWorkspace";

/**
 * Shell de rota para prova física. A implementação completa está em `PhysicalTestWorkspace`.
 */
export default function PhysicalTestPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <Navigate to="/app/avaliacoes" replace />;
  }

  return <PhysicalTestWorkspace testId={id} embed={false} />;
}
