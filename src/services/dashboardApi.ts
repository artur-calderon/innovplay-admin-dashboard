import { api } from "@/lib/api";
import type {
  AdminDashboard,
  DiretorDashboard,
  ProfessorDashboard,
} from "@/types/dashboard";

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
    } catch (error) {
      console.error("❌ Erro ao buscar dashboard admin:", error);
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
    } catch (error) {
      console.error("❌ Erro ao buscar dashboard tecadm:", error);
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
    } catch (error) {
      console.error("❌ Erro ao buscar dashboard diretor:", error);
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
    } catch (error) {
      console.error("❌ Erro ao buscar dashboard coordenador:", error);
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
    } catch (error) {
      console.error("❌ Erro ao buscar dashboard professor:", error);
      return null;
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
        console.warn(`Role não reconhecido: ${role}`);
        return null;
    }
  }
}

