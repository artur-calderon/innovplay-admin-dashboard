import EvaluationStepper from "../components/evaluations/EvaluationStepper";

const CreateEvaluation = () => {
  return (
    <>
      <div className="container max-w-5xl mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Criar Avaliação</h1>
          <p className="text-muted-foreground">
            Crie uma nova avaliação com questões personalizadas ou do banco de questões
          </p>
        </div>
        <EvaluationStepper />
      </div>
    </>
  );
};

export default CreateEvaluation;
