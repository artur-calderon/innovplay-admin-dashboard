/**
 * Utilitários para tratamento de erros da API
 */

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
      detail?: string;
    };
  };
  message?: string;
}

/**
 * Extrai mensagem de erro amigável de uma resposta da API
 */
export const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  const apiError = error as ApiError;
  
  // Tentar extrair mensagem do response.data
  if (apiError.response?.data) {
    const data = apiError.response.data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
  }
  
  // Mensagens baseadas no status HTTP
  if (apiError.response?.status) {
    switch (apiError.response.status) {
      case 400:
        return 'Dados inválidos. Verifique as informações fornecidas.';
      case 401:
        return 'Não autorizado. Faça login novamente.';
      case 403:
        return 'Acesso negado. Você não tem permissão para esta ação.';
      case 404:
        return 'Recurso não encontrado.';
      case 409:
        return 'Conflito. Este recurso já existe ou está em uso.';
      case 422:
        return 'Dados inválidos. Verifique os campos do formulário.';
      case 500:
        return 'Erro interno do servidor. Tente novamente mais tarde.';
      case 503:
        return 'Serviço temporariamente indisponível. Tente novamente mais tarde.';
      default:
        return defaultMessage;
    }
  }
  
  // Mensagem padrão do erro
  if (apiError.message) {
    return apiError.message;
  }
  
  return defaultMessage;
};

/**
 * Verifica se o erro é de rede (sem conexão)
 */
export const isNetworkError = (error: unknown): boolean => {
  const apiError = error as ApiError;
  return !apiError.response && apiError.message?.includes('Network');
};

/**
 * Verifica se o erro é de timeout
 */
export const isTimeoutError = (error: unknown): boolean => {
  const apiError = error as ApiError;
  return apiError.message?.includes('timeout') || apiError.message?.includes('Timeout') || false;
};

/**
 * Obtém sugestão de ação baseada no erro
 */
export const getErrorSuggestion = (error: unknown): string | null => {
  if (isNetworkError(error)) {
    return 'Verifique sua conexão com a internet e tente novamente.';
  }
  
  if (isTimeoutError(error)) {
    return 'A operação está demorando mais que o esperado. Tente novamente.';
  }
  
  const apiError = error as ApiError;
  if (apiError.response?.status === 401) {
    return 'Faça logout e login novamente.';
  }
  
  if (apiError.response?.status === 403) {
    return 'Entre em contato com o administrador se acredita que deveria ter acesso.';
  }
  
  return null;
};


