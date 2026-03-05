import { api } from "@/lib/api";
import type {
  AdminDashboard,
  DiretorDashboard,
  ProfessorDashboard,
} from "@/types/dashboard";

export interface AnaliseSistemaResponse {
  metricas: {
    students: number;
    schools: number;
    evaluations: number;
    games: number;
    users: number;
    questions: number;
    classes: number;
    teachers: number;
    certificates: number;
    last_sync: string;
  };
  /** Status da conexão com o banco (admin/tecadm) */
  conexao?: {
    db_engine: string;
    db_origem: "local" | "remoto";
    db_status: string;
    verificado_em: string;
    ambiente: string;
    timezone: string;
  };
  dados_tecnicos: {
    ambiente: string;
    timestamp: string;
    timezone: string;
  };
  por_escopo: {
    geral?: Record<string, unknown>;
    estado?: Array<{
      estado: string;
      municipios: number;
      escolas: number;
      alunos: number;
      avaliacoes: number;
    }>;
    municipio?: Array<{
      municipio_id: string;
      nome: string;
      estado: string;
      escolas: number;
      alunos: number;
    }>;
    escola?: Array<{
      escola_id: string;
      nome: string;
      municipio: string;
      estado: string;
      alunos: number;
      turmas: number;
    }>;
  };
  graficos: {
    evolucao_ultimos_12_meses?: Array<{
      mes: string;
      alunos: number;
      avaliacoes: number;
      sessoes: number;
    }>;
    distribuicao_por_estado?: Array<{
      estado: string;
      alunos: number;
      escolas: number;
    }>;
    distribuicao_por_municipio?: Array<{
      municipio: string;
      estado: string;
      alunos: number;
    }>;
    avaliacoes_por_tipo?: Array<{ tipo: string; total: number }>;
    participacao?: {
      total_alunos: number;
      alunos_com_pelo_menos_uma_avaliacao: number;
      percentual_participacao: number;
    };
  };
  administracao: {
    taxa_conclusao_geral: number;
    total_sessoes: number;
    sessoes_concluidas: number;
    certificados_emitidos: number;
    media_notas_geral?: number;
    total_respostas_questoes?: number;
    alunos_com_pelo_menos_uma_avaliacao?: number;
    percentual_participacao?: number;
    escolas_ativas?: number;
    ultima_atividade?: string;
    disciplinas_com_questoes?: number;
  };
}

/**
 * Serviço de API para buscar dados dos dashboards por role
 */
export class DashboardApiService {
  /**
   * Busca dados do dashboard Admin
   * GET /dashboard/admin
   */
  static async getAdminDashboard(): Promise<AdminDashboard | null> {
    try {
      const response = await api.get<AdminDashboard>("/dashboard/admin");
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Busca dados do dashboard TecAdm
   * GET /dashboard/tecadm
   */
  static async getTecAdmDashboard(): Promise<AdminDashboard | null> {
    try {
      const response = await api.get<AdminDashboard>("/dashboard/tecadm");
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Busca dados do dashboard Diretor
   * GET /dashboard/diretor
   */
  static async getDiretorDashboard(): Promise<DiretorDashboard | null> {
    try {
      const response = await api.get<DiretorDashboard>("/dashboard/diretor");
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Busca dados do dashboard Coordenador
   * GET /dashboard/coordenador
   */
  static async getCoordenadorDashboard(): Promise<DiretorDashboard | null> {
    try {
      const response = await api.get<DiretorDashboard>("/dashboard/coordenador");
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Busca dados do dashboard Professor
   * GET /dashboard/professor
   */
  static async getProfessorDashboard(): Promise<ProfessorDashboard | null> {
    try {
      const response = await api.get<ProfessorDashboard>("/dashboard/professor");
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Ranking de escolas (escopo do usuário: município ou escola).
   * GET /dashboard/ranking-escolas
   * @param limit - máximo de escolas (padrão 20, máximo 100)
   * @param offset - paginação (padrão 0)
   */
  static async getSchoolRanking(limit: number = 20, offset: number = 0): Promise<{
    ranking: Array<{
      posicao: number;
      escola_id: string;
      nome_escola: string;
      municipio: string;
      media: number;
      media_score_percent: number;
      quantidade_alunos: number;
      taxa_conclusao: number;
      quantidade_avaliacoes: number;
      total_turmas: number;
      total_provas_entregues: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  } | null> {
    try {
      const safeLimit = Math.min(100, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);
      const response = await api.get("/dashboard/ranking-escolas", {
        params: { limit: safeLimit, offset: safeOffset },
      });
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Ranking de turmas (substitui ranking de escolas para admin/tecadm).
   * GET /dashboard/ranking-turmas
   * Requer contexto de cidade. Autenticação: JWT + roles admin, tecadm, diretor, coordenador.
   * @param limit - máximo de turmas (padrão 20, máximo 100)
   * @param offset - paginação (padrão 0)
   */
  static async getClassRanking(limit: number = 20, offset: number = 0): Promise<{
    ranking: Array<{
      posicao: number;
      class_id: string;
      turma: string;
      serie: string;
      media: number;
      acerto: number;
      acerto_percent: number;
      conclusao: number;
      alunos: number;
      avaliacoes: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  } | null> {
    try {
      const safeLimit = Math.min(100, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);
      const response = await api.get("/dashboard/ranking-turmas", {
        params: { limit: safeLimit, offset: safeOffset },
      });
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Ranking de alunos (dashboard).
   * GET /dashboard/ranking-alunos
   * Mesmo endpoint para todos os escopos; variam apenas os query params.
   * Sem scope/ids o backend usa o escopo do usuário logado.
   * @param options.scope - "turma" | "escola" | "municipio" (opcional; se omitido, backend usa contexto do usuário)
   * @param options.class_id - usado se scope=turma
   * @param options.school_id - usado se scope=escola
   * @param options.city_id - usado se scope=municipio
   * @param options.limit - quantidade de alunos (default 20, máx. 50)
   */
  static async getStudentRanking(options: {
    scope?: "turma" | "escola" | "municipio";
    class_id?: string | null;
    school_id?: string | null;
    city_id?: string | null;
    limit?: number;
    /** Contexto de cidade para X-City-ID (obrigatório quando a rota usa @requires_city_context) */
    meta?: { cityId?: string };
  }): Promise<{
    ranking: Array<{
      position: number;
      student_id: string;
      name: string;
      school_name: string;
      class_name: string;
      serie: string;
      media: number;
      completed_evaluations: number;
      profile_picture?: string | null;
      avatar_config?: Record<string, unknown> | null;
      /** Classificação por posição: 1º platina, 2º ouro, 3º prata, 4º bronze, 5º+ null */
      medalha?: "platina" | "ouro" | "prata" | "bronze" | null;
    }>;
    total?: number;
  } | null> {
    try {
      const { scope, class_id, school_id, city_id, limit = 20 } = options;
      const safeLimit = Math.min(50, Math.max(1, limit));
      const params: Record<string, string | number> = { limit: safeLimit };
      // Sempre envia scope quando informado (turma | escola | municipio); ids opcionais (backend usa contexto se faltar)
      if (scope) {
        params.scope = scope;
        if (scope === "turma" && class_id) params.class_id = class_id;
        else if (scope === "escola" && school_id) params.school_id = school_id;
        else if (scope === "municipio" && city_id) params.city_id = city_id;
      }
      const config = { params } as { params: Record<string, string | number>; meta?: { cityId?: string } };
      if (options.meta?.cityId) config.meta = { cityId: options.meta.cityId };
      const response = await api.get("/dashboard/ranking-alunos", config);
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Avaliações recentes (escopo do usuário: município, escola ou todos para admin).
   * Só retorna type = AVALIACAO (sem olimpíada/simulado).
   * GET /dashboard/avaliacoes-recentes
   * @param limit - quantidade (padrão 10, máximo 50)
   */
  static async getAvaliacoesRecentes(limit: number = 10): Promise<{
    avaliacoes: Array<{
      avaliacao_id: string;
      titulo: string;
      quantidade_alunos_fizeram: number;
      quantidade_alunos_vao_fazer: number;
      prazo: string | null;
      progresso: number;
      status: string;
      disciplina: string;
      escola: string;
      escolas: string[];
    }>;
  } | null> {
    try {
      const safeLimit = Math.min(50, Math.max(1, limit));
      const response = await api.get("/dashboard/avaliacoes-recentes", {
        params: { limit: safeLimit },
      });
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Questões do dashboard (escopo do usuário: município, escola ou todos para admin).
   * GET /dashboard/questoes
   * @param limit - quantidade (padrão 20, máximo 50)
   * @param offset - paginação (padrão 0)
   */
  static async getQuestoesDashboard(
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    questoes: Array<{
      id: string;
      titulo: string;
      disciplina: string;
      ano_serie: string;
      autor: string;
      data_criacao: string;
      dificuldade: string;
      tipo_questao: string;
      quantidade_respostas: number;
      taxa_acerto: number | null;
      quantidade_avaliacoes: number;
      ultima_utilizacao: string | null;
      habilidade: string | null;
    }>;
    total: number;
    limit: number;
    offset: number;
  } | null> {
    try {
      const safeLimit = Math.min(50, Math.max(1, limit));
      const safeOffset = Math.max(0, offset);
      const response = await api.get("/dashboard/questoes", {
        params: { limit: safeLimit, offset: safeOffset },
      });
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Análise do sistema (admin, tecadm).
   * GET /dashboard/analise-sistema
   */
  static async getAnaliseSistema(): Promise<AnaliseSistemaResponse | null> {
    try {
      const response = await api.get<AnaliseSistemaResponse>("/dashboard/analise-sistema");
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Busca quantidade de avisos (escopo do usuário logado).
   * GET /dashboard/avisos/quantidade
   */
  static async getAvisosQuantidade(): Promise<number> {
    try {
      const response = await api.get<{ quantidade: number }>("/dashboard/avisos/quantidade");
      return response.data?.quantidade ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Busca dados do dashboard baseado no role do usuário
   */
  static async getDashboardByRole(role: string): Promise<
    AdminDashboard | DiretorDashboard | ProfessorDashboard | null
  > {
    const normalizedRole = role.toLowerCase();

    switch (normalizedRole) {
      case "admin":
        return this.getAdminDashboard();
      case "tecadm":
        return this.getTecAdmDashboard();
      case "diretor":
        return this.getDiretorDashboard();
      case "coordenador":
        return this.getCoordenadorDashboard();
      case "professor":
        return this.getProfessorDashboard();
      default:
        return null;
    }
  }
}

