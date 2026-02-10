import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreateEvaluationModal } from "@/components/evaluations/CreateEvaluationModal";

const CreateEvaluation = () => {
  const [showModal, setShowModal] = useState(true);
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Navegar imediatamente antes de fechar o modal
    navigate("/app/avaliacoes", { replace: true });
    setShowModal(false);
  };

  const handleClose = () => {
    // Navegar imediatamente antes de fechar o modal
    navigate("/app/avaliacoes", { replace: true });
    setShowModal(false);
  };

  // Se o modal não estiver aberto, redirecionar imediatamente
  useEffect(() => {
    if (!showModal) {
      const timer = setTimeout(() => {
        navigate("/app/avaliacoes", { replace: true });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [showModal, navigate]);

  // Se o modal não estiver aberto, não renderizar nada (a navegação vai acontecer)
  if (!showModal) {
    return null;
  }

  return (
    <CreateEvaluationModal
      isOpen={showModal}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
};

export default CreateEvaluation;
