import { api } from '@/lib/api';

/**
 * Cria um evento no Google Calendar com Google Meet usando a API do Google Calendar
 * 
 * @param title - Título do evento
 * @param description - Descrição do evento
 * @param startTime - Data/hora de início (ISO string)
 * @param endTime - Data/hora de fim (ISO string)
 * @returns Promise com o link do Google Meet
 */
export const createGoogleMeetLink = async (
  title: string,
  description?: string,
  startTime?: string,
  endTime?: string
): Promise<string> => {
  try {
    // Chamada ao backend que criará o evento no Google Calendar
    const response = await api.post('/plantao-online/create-meet-link', {
      title,
      description,
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora depois por padrão
    });

    // O backend deve retornar o link do Meet no formato:
    // { meetLink: "https://meet.google.com/xxx-xxxx-xxx" }
    if (response.data?.meetLink) {
      return response.data.meetLink;
    }

    throw new Error('Resposta do servidor não contém link do Meet');
  } catch (error: any) {
    console.error('Erro ao criar link do Google Meet:', error);
    
    // Se o endpoint não existir ainda, lançar erro específico
    if (error.response?.status === 404) {
      throw new Error('Endpoint não implementado no backend. Verifique a documentação.');
    }
    
    throw error;
  }
};

