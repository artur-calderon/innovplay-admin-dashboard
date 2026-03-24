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
    nome?: string;
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
 * Obtém o school_id do vínculo manager (diretor/coordenador) pelo user_id.
 * Tenta GET /managers (lista com user_id e school_id) ou endpoints alternativos.
 */
async function getManagerSchoolIdByUserId(userId: string): Promise<string | null> {
  try {
    // Tentar GET /managers (pode retornar lista de vínculos)
    const res = await api.get("/managers");
    const data = res.data;
    const list = Array.isArray(data) ? data : (data?.managers ?? data?.data ?? []);
    const item = (list as Array<{ user_id?: string; user?: { id?: string }; school_id?: string; school?: { id?: string } }>).find(
      (m) => m.user_id === userId || m.user?.id === userId
    );
    const schoolId = item?.school_id ?? item?.school?.id;
    if (schoolId) return String(schoolId);
  } catch {
    // Ignorar
  }
  try {
    // Alguns backends expõem GET /managers/me com school do usuário logado
    const meRes = await api.get("/managers/me");
    const me = meRes.data;
    const id = me?.school_id ?? me?.school?.id ?? me?.schools?.[0]?.id ?? me?.schools?.[0];
    if (id) return String(id);
  } catch {
    // Ignorar
  }
  return null;
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
              
              const schoolName = (s: any) => s?.name ?? s?.nome ?? s?.school_name ?? '';

              // Se há apenas 1 escola, selecionar automaticamente
              if (municipalitySchools.length === 1) {
                const context = {
                  school: {
                    id: municipalitySchools[0].id,
                    name: schoolName(municipalitySchools[0]),
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

              // Múltiplas escolas: tentar obter a escola vinculada ao usuário (school_id, escola_id, escolas_ids)
              const userSchoolId = userData.school_id ?? userData.escola_id ?? userData.escolas_ids?.[0];
              if (userSchoolId) {
                try {
                  const schoolResponse = await api.get(`/school/${userSchoolId}`);
                  const schoolData = schoolResponse.data;
                  const context = {
                    school: {
                      id: schoolData.id ?? userSchoolId,
                      name: schoolName(schoolData),
                      municipality_id: schoolData.city_id ?? municipalityData.id
                    },
                    municipality: {
                      id: municipalityData.id,
                      name: municipalityData.name,
                      state: municipalityData.state
                    },
                    restrictions
                  };
                  console.log('🔍 Contexto hierárquico retornado (escola do usuário):', context);
                  return context;
                } catch (err) {
                  console.warn('Erro ao buscar escola do usuário:', err);
                }
              }

              // Sem escola definida no user: tentar obter via API de managers (fallback)
              const managerSchoolId = await getManagerSchoolIdByUserId(userId);
              if (managerSchoolId) {
                try {
                  const schoolResponse = await api.get(`/school/${managerSchoolId}`);
                  const schoolData = schoolResponse.data;
                  const schoolNameFn = (s: any) => s?.name ?? s?.nome ?? s?.school_name ?? '';
                  return {
                    school: {
                      id: schoolData.id ?? managerSchoolId,
                      name: schoolNameFn(schoolData),
                      municipality_id: schoolData.city_id ?? municipalityData.id
                    },
                    municipality: {
                      id: municipalityData.id,
                      name: municipalityData.name,
                      state: municipalityData.state
                    },
                    restrictions
                  };
                } catch (err) {
                  console.warn('Erro ao buscar escola do manager:', err);
                }
              }

              // Sem escola definida: retornar só o município
              const context = {
                municipality: {
                  id: municipalityData.id,
                  name: municipalityData.name,
                  state: municipalityData.state
                },
                restrictions
              };
              console.log('🔍 Contexto hierárquico retornado (múltiplas escolas, sem escola definida):', context);
              return context;
            } catch (error) {
              console.error('🔍 Erro ao buscar município/escolas:', error);
            }
          }

          // Fallback: sem city_id no user — tentar obter escola apenas via managers
          const managerSchoolId = await getManagerSchoolIdByUserId(userId);
          if (managerSchoolId) {
            try {
              const schoolResponse = await api.get(`/school/${managerSchoolId}`);
              const schoolData = schoolResponse.data;
              const schoolNameFn = (s: any) => s?.name ?? s?.nome ?? s?.school_name ?? '';
              let municipality: { id: string; name: string; state: string } | undefined;
              if (schoolData?.city_id) {
                const municipalityResponse = await api.get(`/city/${schoolData.city_id}`);
                const municipalityData = municipalityResponse.data;
                municipality = { id: municipalityData.id, name: municipalityData.name, state: municipalityData.state };
              }
              return {
                school: { id: schoolData.id ?? managerSchoolId, name: schoolNameFn(schoolData), municipality_id: schoolData?.city_id ?? '' },
                municipality,
                restrictions
              };
            } catch (err) {
              console.warn('Erro ao buscar escola/município do manager:', err);
            }
          }
          
          console.log('🔍 Nenhum city_id encontrado no usuário');
        } catch (error) {
          console.error('🔍 Erro ao buscar dados do diretor:', error);
        }
        return { restrictions };
        
      case 'professor':
        // Buscar turmas do professor: tentar por user id e fallback por teacher id
        try {
          type TeacherData = {
            id?: string;
            turmas?: Array<{ school_id: string; school_name: string; class_id?: string; class_name?: string; grade_id?: string; grade_name?: string }>;
            classes?: TeacherData['turmas'];
          };
          let teacherData: TeacherData | null = null;
          let teacherId: string | null = null;

          // 1) Tentar GET /teacher/:userId (backend pode aceitar user id)
          try {
            const byUserResponse = await api.get(`/teacher/${userId}`);
            teacherData = byUserResponse.data;
            if (teacherData?.id) teacherId = teacherData.id;
          } catch {
            teacherData = null;
          }

          // 2) Fallback: listar professores e encontrar por user_id / usuario_id
          if (!teacherData?.turmas?.length && !teacherData?.classes?.length) {
            const listResponse = await api.get('/teacher');
            const list = Array.isArray(listResponse.data) ? listResponse.data : (listResponse.data?.data ?? listResponse.data?.professores ?? []);
            const teacher = (list as Array<{ id?: string; user_id?: string; usuario_id?: string; user?: { id?: string } }>).find(
              (t) => t?.user_id === userId || t?.usuario_id === userId || t?.user?.id === userId
            );
            if (teacher?.id) {
              teacherId = teacher.id;
              try {
                const byIdResponse = await api.get(`/teacher/${teacher.id}`);
                teacherData = byIdResponse.data;
              } catch {
                teacherData = null;
              }
            }
          }

          const turmas = Array.isArray(teacherData?.turmas) ? teacherData.turmas : (Array.isArray(teacherData?.classes) ? teacherData.classes : []);

          if (turmas && turmas.length > 0) {
            const firstClass = turmas[0];
            const schoolId = firstClass.school_id;
            const schoolName = firstClass.school_name ?? '';

            // Buscar município da escola do professor
            let municipality: { id: string; name: string; state: string } | undefined;
            try {
              const schoolResponse = await api.get(`/school/${schoolId}`);
              const schoolData = schoolResponse.data;
              if (schoolData?.city_id) {
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

            const classes = turmas.map((t: { class_id?: string; class_name?: string; school_id: string; school_name: string; grade_id?: string; grade_name?: string }) => ({
              class_id: t.class_id ?? '',
              class_name: t.class_name ?? '',
              school_id: t.school_id,
              school_name: t.school_name ?? '',
              grade_id: t.grade_id ?? '',
              grade_name: t.grade_name ?? ''
            }));

            return {
              classes,
              school: { id: schoolId, name: schoolName, municipality_id: municipality?.id ?? '' },
              municipality,
              restrictions
            };
          }

          // 3) Professor sem turmas: tentar obter ao menos a escola via school-teacher (para ver relatório da escola)
          if (teacherId) {
            try {
              const linksResp = await api.get('/school-teacher', { params: { teacher_id: teacherId } });
              const links = Array.isArray(linksResp.data) ? linksResp.data : (linksResp.data?.data ?? []);
              const firstLink = links[0];
              const schoolId = firstLink?.school_id ?? firstLink?.school?.id;
              if (schoolId) {
                const schoolResponse = await api.get(`/school/${schoolId}`);
                const schoolData = schoolResponse.data;
                const schoolName = schoolData?.name ?? schoolData?.nome ?? '';
                let municipality: { id: string; name: string; state: string } | undefined;
                if (schoolData?.city_id) {
                  try {
                    const municipalityResponse = await api.get(`/city/${schoolData.city_id}`);
                    const municipalityData = municipalityResponse.data;
                    municipality = { id: municipalityData.id, name: municipalityData.name, state: municipalityData.state };
                  } catch {
                    // ignore
                  }
                }
                return {
                  classes: [],
                  school: { id: schoolId, name: schoolName, municipality_id: municipality?.id ?? '' },
                  municipality,
                  restrictions
                };
              }
            } catch {
              // ignore
            }
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
      // Professor pode ver relatórios da sua escola e das suas turmas
      const professorSchoolIds = new Set<string>();
      if (userContext.school?.id) professorSchoolIds.add(String(userContext.school.id));
      if (userContext.classes?.length) {
        userContext.classes.forEach((c) => {
          if (c.school_id) professorSchoolIds.add(String(c.school_id));
        });
      }
      if (filters.school && professorSchoolIds.size > 0 && !professorSchoolIds.has(String(filters.school))) {
        return { 
          isValid: false, 
          reason: 'Você só pode visualizar relatórios da sua escola' 
        };
      }
      if (userContext.classes?.length && filters.class) {
        const allowedClassIds = userContext.classes.map((c) => String(c.class_id)).filter(Boolean);
        if (allowedClassIds.length > 0 && !allowedClassIds.includes(String(filters.class))) {
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

/**
 * Valor para o query param `city_id` em rotas que exigem município explícito.
 * - **Admin:** o JWT costuma não ter cidade; enviar o UUID do município escolhido nos filtros.
 * - **Demais perfis:** retorna `undefined` — o backend usa o tenant/cidade do token.
 */
export function cityIdQueryParamForAdmin(
  role: string | undefined,
  selectedMunicipalityId: string | undefined
): string | undefined {
  if (!role || role.toLowerCase() !== 'admin') return undefined;
  const id = selectedMunicipalityId?.trim();
  if (!id || id === 'all') return undefined;
  return id;
}

