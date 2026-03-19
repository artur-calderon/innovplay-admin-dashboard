import { PhysicalEvaluationWorkspaceTabContent } from "./PhysicalEvaluationWorkspaceTabContent";

interface PhysicalCorrectionTabContentProps {
  isProfessor: boolean;
  /** Quando false, reseta lista/workspace (usuário mudou de aba). */
  tabActive: boolean;
}

export function PhysicalCorrectionTabContent({
  isProfessor,
  tabActive,
}: PhysicalCorrectionTabContentProps) {
  return (
    <PhysicalEvaluationWorkspaceTabContent
      isProfessor={isProfessor}
      tabActive={tabActive}
      mode="correction"
    />
  );
}

