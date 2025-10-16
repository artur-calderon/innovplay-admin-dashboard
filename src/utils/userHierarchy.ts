import { api } from "@/lib/api";

export interface UserHierarchyContext {
  municipality?: {
    id: string;
    name: string;
    state: string;
  };
  school?: {
    id: string;
    name: string;
    municipality_id: string;
  };
  classes?: Array<{
    class_id: string;
    class_name: string;
    school_id: string;
    school_name: string;
    grade_id: string;
    grade_name: string;
  }>;
  restrictions: {
    canSelectState: boolean;
    canSelectMunicipality: boolean;
    canSelectSchool: boolean;
    canSelectGrade: boolean;
    canSelectClass: boolean;
  };
}

export interface FilterRestrictions {
  state: boolean;
  municipality: boolean;
  school: boolean;
  grade: boolean;
  class: boolean;
}

/**
 * Busca o contexto hierárquico do usuário baseado na sua role
 */
export async function getUserHierarchyContext(
  userId: string, 
  role: string
): Promise<UserHierarchyContext> {
  const restrictions = getFilterRestrictions(role);
  
  try {
    switch (role) {
      case 'admin':
        return {
          restrictions
        };
        
      case 'tecadm':
        // Buscar dados do usuário para obter city_id
        const userResponse = await api.get(`/users/${userId}`);
        const userData = userResponse.data;
        
        if (userData.city_id) {
          // Buscar dados do município
          try {
            const municipalityResponse = await api.get(`/city/${userData.city_id}`);
            const municipalityData = municipalityResponse.data;
            
            return {
              municipality: {
                id: municipalityData.id,
                name: municipalityData.name,
                state: municipalityData.state
              },
              restrictions
            };
          } catch (error) {
            console.error('Erro ao buscar município do tecadm:', error);
          }
        }
        return { restrictions };
        
      case 'diretor':
      case 'coordenador':
        // Buscar escola vinculada ao usuário
        try {
          const schoolResponse = await api.get(`/users/school/${userId}`);
          const schoolData = schoolResponse.data?.school || schoolResponse.data;
          
          if (schoolData) {
            return {
              school: {
                id: schoolData.id || schoolData.school_id,
                name: schoolData.name || schoolData.nome,
                municipality_id: schoolData.city_id || schoolData.municipality_id
              },
              restrictions
            };
          }
        } catch (error) {
          console.error('Erro ao buscar escola do diretor/coordenador:', error);
        }
        return { restrictions };
        
      case 'professor':
        // Buscar turmas do professor
        try {
          const teacherResponse = await api.get(`/teacher/${userId}`);
          const teacherData = teacherResponse.data;
          
          if (teacherData.turmas && Array.isArray(teacherData.turmas)) {
            return {
              classes: teacherData.turmas,
              school: teacherData.turmas.length > 0 ? {
                id: teacherData.turmas[0].school_id,
                name: teacherData.turmas[0].school_name,
                municipality_id: '' // Será preenchido se necessário
              } : undefined,
              restrictions
            };
          }
        } catch (error) {
          console.error('Erro ao buscar turmas do professor:', error);
        }
        return { restrictions };
        
      default:
        return { restrictions };
    }
  } catch (error) {
    console.error('Erro ao buscar contexto hierárquico:', error);
    return { restrictions };
  }
}

/**
 * Retorna quais filtros devem ser desabilitados para cada role
 */
export function getFilterRestrictions(role: string): FilterRestrictions {
  switch (role) {
    case 'admin':
      return {
        state: false,
        municipality: false,
        school: false,
        grade: false,
        class: false
      };
      
    case 'tecadm':
      return {
        state: true,        // Pre-selecionado
        municipality: true, // Pre-selecionado
        school: false,
        grade: false,
        class: false
      };
      
    case 'diretor':
    case 'coordenador':
      return {
        state: true,        // Pre-selecionado
        municipality: true, // Pre-selecionado
        school: true,       // Pre-selecionado
        grade: false,
        class: false
      };
      
    case 'professor':
      return {
        state: true,        // Pre-selecionado
        municipality: true, // Pre-selecionado
        school: true,       // Pre-selecionado
        grade: false,
        class: false        // Pode selecionar suas turmas
      };
      
    default:
      return {
        state: true,
        municipality: true,
        school: true,
        grade: true,
        class: true
      };
  }
}

/**
 * Valida se o usuário pode acessar os dados solicitados
 */
export function validateReportAccess(
  userRole: string, 
  filters: {
    state?: string;
    municipality?: string;
    school?: string;
    grade?: string;
    class?: string;
  },
  userContext: UserHierarchyContext
): { isValid: boolean; reason?: string } {
  switch (userRole) {
    case 'admin':
      return { isValid: true };
      
    case 'tecadm':
      if (userContext.municipality && filters.municipality !== userContext.municipality.id) {
        return { 
          isValid: false, 
          reason: 'Você só pode visualizar dados do seu município' 
        };
      }
      return { isValid: true };
      
    case 'diretor':
    case 'coordenador':
      if (userContext.school && filters.school !== userContext.school.id) {
        return { 
          isValid: false, 
          reason: 'Você só pode visualizar dados da sua escola' 
        };
      }
      return { isValid: true };
      
    case 'professor':
      if (userContext.classes && filters.class) {
        const allowedClassIds = userContext.classes.map(c => c.class_id);
        if (!allowedClassIds.includes(filters.class)) {
          return { 
            isValid: false, 
            reason: 'Você só pode visualizar dados das suas turmas' 
          };
        }
      }
      return { isValid: true };
      
    default:
      return { 
        isValid: false, 
        reason: 'Role não reconhecida' 
      };
  }
}

/**
 * Gera mensagem explicativa sobre as restrições do usuário
 */
export function getRestrictionMessage(role: string): string {
  switch (role) {
    case 'admin':
      return 'Como administrador, você pode visualizar dados de todos os estados, municípios, escolas e turmas.';
      
    case 'tecadm':
      return 'Como técnico administrativo, você pode visualizar dados apenas do seu município.';
      
    case 'diretor':
    case 'coordenador':
      return 'Como diretor/coordenador, você pode visualizar dados apenas da sua escola.';
      
    case 'professor':
      return 'Como professor, você pode visualizar dados apenas das suas turmas.';
      
    default:
      return 'Suas permissões de visualização são limitadas.';
  }
}


