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
        // Buscar escola vinculada ao usuário usando city_id
        try {
          console.log('🔍 Buscando escola para diretor/coordenador:', userId);
          
          // Buscar dados do usuário
          const userResponse = await api.get(`/users/${userId}`);
          const userData = userResponse.data;
          console.log('🔍 Dados do usuário:', userData);
          
          // Se usuário tem city_id, buscar município e escolas
          if (userData.city_id) {
            try {
              // Buscar dados do município
              const municipalityResponse = await api.get(`/city/${userData.city_id}`);
              const municipalityData = municipalityResponse.data;
              console.log('🔍 Dados do município:', municipalityData);
              
              // Buscar escolas do município
              const schoolsResponse = await api.get(`/school`);
              const allSchools = Array.isArray(schoolsResponse.data) 
                ? schoolsResponse.data 
                : (schoolsResponse.data?.data || []);
              
              // Filtrar escolas do município do diretor
              const municipalitySchools = allSchools.filter(
                (school: any) => school.city_id === userData.city_id
              );
              
              console.log('🔍 Escolas do município:', municipalitySchools);
              
              // Se há apenas 1 escola, selecionar automaticamente
              if (municipalitySchools.length === 1) {
                const context = {
                  school: {
                    id: municipalitySchools[0].id,
                    name: municipalitySchools[0].name || municipalitySchools[0].nome,
                    municipality_id: municipalitySchools[0].city_id
                  },
                  municipality: {
                    id: municipalityData.id,
                    name: municipalityData.name,
                    state: municipalityData.state
                  },
                  restrictions
                };
                console.log('🔍 Contexto hierárquico retornado (escola única):', context);
                return context;
              }
              
              // Se há múltiplas escolas, retornar só o município
              // Usuário escolherá a escola manualmente
              const context = {
                municipality: {
                  id: municipalityData.id,
                  name: municipalityData.name,
                  state: municipalityData.state
                },
                restrictions
              };
              console.log('🔍 Contexto hierárquico retornado (múltiplas escolas):', context);
              return context;
            } catch (error) {
              console.error('🔍 Erro ao buscar município/escolas:', error);
            }
          }
          
          console.log('🔍 Nenhum city_id encontrado no usuário');
        } catch (error) {
          console.error('🔍 Erro ao buscar dados do diretor:', error);
        }
        return { restrictions };
        
      case 'professor':
        // Buscar turmas do professor
        try {
          const teacherResponse = await api.get(`/teacher/${userId}`);
          const teacherData = teacherResponse.data;
          
          if (teacherData.turmas && Array.isArray(teacherData.turmas)) {
            // Buscar município da escola do professor
            let municipality = undefined;
            if (teacherData.turmas.length > 0) {
              const firstClass = teacherData.turmas[0];
              
              // Buscar dados da escola para obter city_id
              try {
                const schoolResponse = await api.get(`/school/${firstClass.school_id}`);
                const schoolData = schoolResponse.data;
                
                if (schoolData.city_id) {
                  // Buscar dados do município
                  const municipalityResponse = await api.get(`/city/${schoolData.city_id}`);
                  const municipalityData = municipalityResponse.data;
                  
                  municipality = {
                    id: municipalityData.id,
                    name: municipalityData.name,
                    state: municipalityData.state
                  };
                }
              } catch (error) {
                console.error('🔍 Erro ao buscar município da escola:', error);
              }
            }
            
            const context = {
              classes: teacherData.turmas,
              school: teacherData.turmas.length > 0 ? {
                id: teacherData.turmas[0].school_id,
                name: teacherData.turmas[0].school_name,
                municipality_id: municipality?.id || ''
              } : undefined,
              municipality,
              restrictions
            };
            return context;
          }
        } catch (error) {
          console.error('🔍 Erro ao buscar turmas do professor:', error);
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


