import { PhysicalEvaluationWorkspaceTabContent } from "./PhysicalEvaluationWorkspaceTabContent";

interface DigitalToPhysicalTabContentProps {
  isProfessor: boolean;
  /** Quando false, reseta lista/workspace (usuário mudou de aba). */
  tabActive: boolean;
}

export function DigitalToPhysicalTabContent({
  isProfessor,
  tabActive,
}: DigitalToPhysicalTabContentProps) {
  return (
    <PhysicalEvaluationWorkspaceTabContent
      isProfessor={isProfessor}
      tabActive={tabActive}
      mode="transform"
    />
  );
}
