import { api } from '@/lib/api';
import type { Aviso, CreateAvisoDTO, AvisosFilters } from '@/types/avisos';

// TODO: Integrar com API quando endpoints estiverem disponíveis
// Endpoints esperados:
// GET /avisos - Lista todos os avisos (com filtros por role)
// GET /avisos/:id - Busca aviso específico
// POST /avisos - Cria novo aviso
// PUT /avisos/:id - Atualiza aviso
// DELETE /avisos/:id - Deleta aviso

/**
 * Dados mockados temporários para desenvolvimento do front-end
 */
const MOCK_AVISOS: Aviso[] = [
  {
    id: '1',
    titulo: 'Início do Período de Avaliações - 1º Bimestre',
    mensagem: 'Informamos que o período de avaliações do 1º bimestre iniciará na próxima semana. Pedimos que todos os professores estejam atentos aos horários e que os alunos compareçam pontualmente às avaliações.',
    data: '2025-10-29',
    autor: 'Secretaria de Educação',
    autor_id: 'admin-001',
    autor_role: 'admin',
    destinatarios: {
      tipo: 'todos',
    },
    created_at: '2025-10-29T08:00:00Z',
  },
  {
    id: '2',
    titulo: 'Reunião Pedagógica Municipal',
    mensagem: 'Convocamos todos os diretores e coordenadores das escolas do município para reunião pedagógica no dia 05/11. A reunião será realizada no auditório da Secretaria de Educação às 14h. Presença obrigatória.',
    data: '2025-10-28',
    autor: 'Coordenação Municipal',
    autor_id: 'tecadm-001',
    autor_role: 'tecadm',
    destinatarios: {
      tipo: 'municipio',
      municipio_id: 'mun-001',
      municipio_nome: 'São Paulo',
    },
    created_at: '2025-10-28T10:30:00Z',
  },
  {
    id: '3',
    titulo: 'Manutenção no Sistema de Energia',
    mensagem: 'Haverá manutenção preventiva no sistema elétrico da escola na sexta-feira (01/11). As aulas serão suspensas neste dia. Os alunos deverão retornar normalmente na segunda-feira.',
    data: '2025-10-27',
    autor: 'Direção - Escola Municipal Centro',
    autor_id: 'diretor-001',
    autor_role: 'diretor',
    destinatarios: {
      tipo: 'escola',
      escola_id: 'escola-001',
      escola_nome: 'Escola Municipal Centro',
    },
    created_at: '2025-10-27T15:20:00Z',
  },
  {
    id: '4',
    titulo: 'Nova Plataforma de Jogos Educacionais',
    mensagem: 'Temos o prazer de anunciar que uma nova plataforma de jogos educacionais foi adicionada ao sistema Afirme Play. Os jogos abordam matemática, português e ciências de forma lúdica e interativa. Acesse o menu "Jogos" para começar!',
    data: '2025-10-26',
    autor: 'Equipe Afirme Play',
    autor_id: 'admin-002',
    autor_role: 'admin',
    destinatarios: {
      tipo: 'todos',
    },
    created_at: '2025-10-26T09:00:00Z',
  },
  {
    id: '5',
    titulo: 'Campanha de Vacinação nas Escolas',
    mensagem: 'A Secretaria de Saúde realizará campanha de vacinação em todas as escolas municipais nos dias 10 e 11 de novembro. Os pais devem enviar a caderneta de vacinação com os alunos.',
    data: '2025-10-25',
    autor: 'Secretaria Municipal',
    autor_id: 'tecadm-002',
    autor_role: 'tecadm',
    destinatarios: {
      tipo: 'municipio',
      municipio_id: 'mun-001',
      municipio_nome: 'São Paulo',
    },
    created_at: '2025-10-25T11:45:00Z',
  },
  {
    id: '6',
    titulo: 'Festa Junina - Save the Date',
    mensagem: 'Nossa tradicional Festa Junina acontecerá no dia 15 de junho. Em breve divulgaremos mais informações sobre as apresentações e barracas. Contamos com a participação de todos!',
    data: '2025-10-24',
    autor: 'Direção - Escola Estadual Jardim',
    autor_id: 'diretor-002',
    autor_role: 'diretor',
    destinatarios: {
      tipo: 'escola',
      escola_id: 'escola-002',
      escola_nome: 'Escola Estadual Jardim',
    },
    created_at: '2025-10-24T16:00:00Z',
  },
  {
    id: '7',
    titulo: 'Recesso Escolar - Dia da Consciência Negra',
    mensagem: 'Informamos que no dia 20 de novembro (Dia da Consciência Negra) não haverá aulas em toda a rede municipal. As atividades retornam normalmente no dia 21/11.',
    data: '2025-10-23',
    autor: 'Secretaria de Educação',
    autor_id: 'admin-001',
    autor_role: 'admin',
    destinatarios: {
      tipo: 'todos',
    },
    created_at: '2025-10-23T08:30:00Z',
  },
  {
    id: '8',
    titulo: 'Atualização nos Horários das Turmas',
    mensagem: 'Atenção! Houve alteração nos horários das turmas do 6º e 7º ano. A nova grade estará disponível na secretaria da escola a partir de segunda-feira. Favor verificar os novos horários.',
    data: '2025-10-22',
    autor: 'Coordenação Pedagógica - Escola Centro',
    autor_id: 'diretor-001',
    autor_role: 'diretor',
    destinatarios: {
      tipo: 'escola',
      escola_id: 'escola-001',
      escola_nome: 'Escola Municipal Centro',
    },
    created_at: '2025-10-22T13:15:00Z',
  },
];

/**
 * Busca todos os avisos (mockado)
 * TODO: Substituir por chamada real à API
 */
export const getAvisos = async (): Promise<Aviso[]> => {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // TODO: Descomentar quando API estiver disponível
  // const response = await api.get('/avisos');
  // return response.data;
  
  return MOCK_AVISOS;
};

/**
 * Busca avisos filtrados baseado no contexto do usuário
 * TODO: Substituir por chamada real à API com parâmetros de filtro
 */
export const getFilteredAvisos = async (filters: AvisosFilters): Promise<Aviso[]> => {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // TODO: Descomentar quando API estiver disponível
  // const response = await api.get('/avisos', { params: filters });
  // return response.data;
  
  // Lógica temporária de filtro no front-end
  let filteredAvisos = [...MOCK_AVISOS];
  
  // Filtrar baseado no escopo do usuário
  switch (filters.role) {
    case 'admin':
      // Admin vê todos
      break;
    case 'tecadm':
      // Tec Adm vê avisos do município e gerais
      filteredAvisos = filteredAvisos.filter(
        aviso => 
          aviso.destinatarios.tipo === 'todos' ||
          (aviso.destinatarios.tipo === 'municipio' && aviso.destinatarios.municipio_id === filters.municipio_id)
      );
      break;
    case 'diretor':
    case 'coordenador':
    case 'professor':
    case 'aluno':
      // Diretor, coordenador, professor e aluno veem avisos da escola e gerais
      filteredAvisos = filteredAvisos.filter(
        aviso => 
          aviso.destinatarios.tipo === 'todos' ||
          (aviso.destinatarios.tipo === 'escola' && aviso.destinatarios.escola_id === filters.escola_id)
      );
      break;
    default:
      filteredAvisos = [];
  }
  
  // Ordenar por data (mais recentes primeiro)
  filteredAvisos.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  return filteredAvisos;
};

/**
 * Busca aviso específico por ID
 * TODO: Substituir por chamada real à API
 */
export const getAvisoById = async (id: string): Promise<Aviso | null> => {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // TODO: Descomentar quando API estiver disponível
  // const response = await api.get(`/avisos/${id}`);
  // return response.data;
  
  const aviso = MOCK_AVISOS.find(a => a.id === id);
  return aviso || null;
};

/**
 * Cria novo aviso
 * TODO: Substituir por chamada real à API
 */
export const createAviso = async (data: CreateAvisoDTO): Promise<Aviso> => {
  // Simula delay de rede
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // TODO: Descomentar quando API estiver disponível
  // const response = await api.post('/avisos', data);
  // return response.data;
  
  // Simulação temporária
  const newAviso: Aviso = {
    id: `temp-${Date.now()}`,
    titulo: data.titulo,
    mensagem: data.mensagem,
    data: new Date().toISOString().split('T')[0],
    autor: 'Usuário Atual', // TODO: Pegar do contexto
    autor_id: 'current-user', // TODO: Pegar do contexto
    autor_role: 'admin', // TODO: Pegar do contexto
    destinatarios: data.destinatarios,
    created_at: new Date().toISOString(),
  };
  
  // Em produção, a API retornará o aviso criado
  console.log('Aviso criado (mock):', newAviso);
  
  return newAviso;
};

/**
 * Atualiza aviso existente
 * TODO: Implementar quando API estiver disponível
 */
export const updateAviso = async (id: string, data: Partial<CreateAvisoDTO>): Promise<Aviso> => {
  // TODO: Implementar quando necessário
  // const response = await api.put(`/avisos/${id}`, data);
  // return response.data;
  
  throw new Error('Funcionalidade de edição ainda não implementada');
};

/**
 * Deleta aviso
 * TODO: Implementar quando API estiver disponível
 */
export const deleteAviso = async (id: string): Promise<void> => {
  // TODO: Implementar quando necessário
  // await api.delete(`/avisos/${id}`);
  
  throw new Error('Funcionalidade de exclusão ainda não implementada');
};

