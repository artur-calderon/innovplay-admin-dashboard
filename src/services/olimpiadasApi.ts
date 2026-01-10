import { api } from '@/lib/api';
import { Olimpiada, OlimpiadaFormData, OlimpiadaResult, OlimpiadaRanking } from '@/types/olimpiada-types';
import { Evaluation } from '@/types/evaluation-types';
import { convertDateTimeLocalToISO, toLocalOffsetISO } from '@/utils/date';

/**
 * Serviço de API para Olimpíadas
 * Reutiliza endpoints de avaliação, diferenciando apenas pelo type: "OLIMPIADA"
 */
export class OlimpiadasApiService {
  /**
   * Criar nova olimpíada
   * Usa o mesmo endpoint de avaliação com type: "OLIMPIADA"
   */
  static async createOlimpiada(data: OlimpiadaFormData): Promise<Olimpiada> {
    try {
      // Formatar questões no mesmo formato que avaliações (apenas IDs com número)
      const formattedQuestions = data.questions.map((q, index) => {
        // Se for apenas um ID (string), retornar objeto simples
        if (typeof q === 'string') {
          return {
            id: q,
            number: index + 1
          };
        }
        
        // Se for objeto com id, retornar objeto simples
        if (typeof q === 'object' && q !== null && 'id' in q) {
          return {
            id: (q as { id: string }).id,
            number: index + 1
          };
        }
        
        // Fallback: retornar como string
        return q;
      });

      // Garantir que arrays sejam arrays válidos
      const schoolsArray = Array.isArray(data.schools) 
        ? data.schools 
        : (typeof data.schools === 'string' ? [data.schools] : []);
      
      const municipalitiesArray = Array.isArray(data.municipalities) 
        ? data.municipalities 
        : (data.municipalities ? [data.municipalities] : []);
      
      const classesArray = Array.isArray(data.classes) 
        ? data.classes 
        : (data.classes ? [data.classes] : []);

      // Garantir que o título tenha o prefixo [OLIMPÍADA] para identificação
      const titleWithPrefix = data.title.includes('[OLIMPÍADA]') 
        ? data.title 
        : `[OLIMPÍADA] ${data.title}`;

      const payload = {
        title: titleWithPrefix,
        description: data.description || '',
        type: 'OLIMPIADA', // Enviando como OLIMPIADA para a tabela test
        model: data.model || 'PROVA',
        course: data.course,
        grade: data.grade,
        subject: data.subjects.length > 0 ? data.subjects[0].id : '', // Campo singular também necessário
        subjects: data.subjects.map(s => s.id),
        subjects_info: data.subjects.map(subject => ({
          subject: subject.id,
          weight: Math.round(100 / data.subjects.length) // Distribuir peso igualmente entre disciplinas
        })),
        schools: schoolsArray,
        municipalities: municipalitiesArray,
        classes: classesArray,
        questions: formattedQuestions,
        time_limit: new Date().toISOString(), // Valor padrão, não será usado na aplicação
        end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Valor padrão, não será usado na aplicação
        duration: typeof data.duration === 'string' ? parseInt(data.duration, 10) : (data.duration || 60),
        evaluation_mode: data.evaluation_mode || 'virtual',
        created_by: data.created_by,
      };

      console.log('📤 Payload para criar olimpíada (salvando como OLIMPIADA):', payload);

      const response = await api.post('/test', payload);
      
      // Se o backend retornou com sucesso, marcar como olimpíada no frontend
      const result = response.data;
      if (result) {
        // Adicionar flag para identificar como olimpíada no frontend
        result.type = 'OLIMPIADA';
        // Garantir que o título tenha o prefixo (caso o backend tenha removido)
        if (result.title && !result.title.includes('[OLIMPÍADA]')) {
          result.title = `[OLIMPÍADA] ${result.title}`;
        }
        
        console.log('✅ Olimpíada criada com sucesso:', {
          id: result.id,
          title: result.title,
          type: result.type
        });

        // ✅ REMOVIDO: Aplicação automática após criação
        // O admin deve aplicar manualmente usando o botão "Aplicar" com as datas escolhidas
        console.log('ℹ️ Olimpíada criada. Use o botão "Aplicar" para enviar aos alunos.');
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao criar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Buscar lista de olimpíadas
   * Filtra por type: "OLIMPIADA" ou por título contendo "[OLIMPÍADA]"
   */
  static async getOlimpiadas(params?: {
    page?: number;
    per_page?: number;
    school_id?: string;
  }): Promise<{ data: Olimpiada[]; total?: number }> {
    try {
      // Tentar buscar por type: "OLIMPIADA" primeiro
      const queryParams = new URLSearchParams({
        type: 'OLIMPIADA',
        ...(params?.page && { page: params.page.toString() }),
        ...(params?.per_page && { per_page: params.per_page.toString() }),
        ...(params?.school_id && { school_id: params.school_id }),
      });

      let response;
      try {
        response = await api.get(`/test?${queryParams.toString()}`);
      } catch (error) {
        // Se falhar, buscar todas as avaliações e filtrar por título
        console.warn('Busca por type=OLIMPIADA falhou, buscando todas e filtrando por título...');
        const allParams = new URLSearchParams({
          type: 'AVALIACAO',
          ...(params?.page && { page: params.page.toString() }),
          ...(params?.per_page && { per_page: params.per_page.toString() }),
          ...(params?.school_id && { school_id: params.school_id }),
        });
        response = await api.get(`/test?${allParams.toString()}`);
      }
      
      let allTests = [];
      // Se a resposta for um array direto
      if (Array.isArray(response.data)) {
        allTests = response.data;
      } else {
        // Se a resposta tiver estrutura { data: [...], total: ... }
        allTests = response.data.data || response.data || [];
      }
      
      // TEMPORÁRIO: Filtrar todas as avaliações do tipo PROVA para aparecerem como olimpíadas
      // TODO: Voltar a filtrar apenas por título contendo [OLIMPÍADA] quando o sistema estiver estável
      const olimpiadas = allTests
        .filter((test: Evaluation) => {
          const isOlimpiada = 
            test.model === 'PROVA' ||
            test.type === 'OLIMPIADA' || 
            (test.title && (test.title.includes('[OLIMPÍADA]') || test.title.toUpperCase().includes('OLIMPÍADA')));
          
          return isOlimpiada;
        })
        .map((test: Evaluation) => ({
          ...test,
          type: 'OLIMPIADA' as const,
          title: test.title?.replace(/\[OLIMPÍADA\]\s?/gi, '') || test.title // Remover prefixo do título
        }));
      
      return {
        data: olimpiadas,
        total: response.data.total || olimpiadas.length,
      };
    } catch (error) {
      console.error('Erro ao buscar olimpíadas:', error);
      throw error;
    }
  }

  /**
   * Buscar olimpíada por ID
   * Usa o mesmo endpoint de avaliação
   */
  static async getOlimpiada(id: string): Promise<Olimpiada> {
    try {
      const response = await api.get(`/test/${id}`);
      const result = response.data;
      
      // Se o título contém [OLIMPÍADA], remover o prefixo e marcar como OLIMPIADA
      if (result) {
        if (result.title && result.title.includes('[OLIMPÍADA]')) {
          result.title = result.title.replace('[OLIMPÍADA] ', '');
          result.type = 'OLIMPIADA';
        } else if (result.type === 'OLIMPIADA') {
          // Já está marcado como olimpíada
        }
        
        // Mapear campos de timezone para garantir formatação correta de datas
        // O backend pode retornar application_info com timezone
        if (result.application_info) {
          result.timeZone = result.application_info.time_zone || result.application_info.timezone;
          result.applicationTimeZone = result.application_info.time_zone || result.application_info.timezone;
          if (!result.availability) {
            result.availability = {};
          }
          result.availability.timezone = result.application_info.timezone;
          result.availability.time_zone = result.application_info.time_zone;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Atualizar olimpíada
   * Usa o mesmo endpoint de avaliação (salva como OLIMPIADA)
   */
  static async updateOlimpiada(id: string, data: Partial<OlimpiadaFormData>): Promise<Olimpiada> {
    try {
      // Formatar questões se fornecidas
      let formattedQuestions = undefined;
      if (data.questions) {
        formattedQuestions = data.questions.map((q, index) => {
          if (typeof q === 'string') {
            return { id: q, number: index + 1 };
          }
          if (typeof q === 'object' && q !== null && 'id' in q) {
            return { id: (q as { id: string }).id, number: index + 1 };
          }
          return q;
        });
      }

      // Garantir que título tenha o prefixo [OLIMPÍADA]
      const titleWithPrefix = data.title && !data.title.includes('[OLIMPÍADA]') 
        ? `[OLIMPÍADA] ${data.title}` 
        : data.title;

      const payload: Record<string, unknown> = {
        ...(titleWithPrefix && { title: titleWithPrefix }),
        ...(data.description !== undefined && { description: data.description }),
        type: 'OLIMPIADA', // Enviando como OLIMPIADA para a tabela test
        ...(data.model && { model: data.model }),
        ...(data.course && { course: data.course }),
        ...(data.grade && { grade: data.grade }),
        ...(data.subjects && { 
          subject: data.subjects.length > 0 ? data.subjects[0].id : '',
          subjects: data.subjects.map(s => s.id),
          subjects_info: data.subjects.map(subject => ({
            subject: subject.id,
            weight: Math.round(100 / data.subjects.length)
          }))
        }),
        ...(data.schools && { 
          schools: Array.isArray(data.schools) ? data.schools : [data.schools] 
        }),
        ...(data.municipalities && { 
          municipalities: Array.isArray(data.municipalities) ? data.municipalities : [data.municipalities] 
        }),
        ...(data.classes && { 
          classes: Array.isArray(data.classes) ? data.classes : [data.classes] 
        }),
        ...(formattedQuestions && { questions: formattedQuestions }),
        ...(data.startDateTime && { 
          time_limit: data.startDateTime,
          startDateTime: data.startDateTime 
        }),
        ...(data.endDateTime && { 
          end_time: data.endDateTime,
          endDateTime: data.endDateTime 
        }),
        ...(data.duration && { 
          duration: typeof data.duration === 'string' ? parseInt(data.duration, 10) : data.duration 
        }),
        ...(data.evaluation_mode && { evaluation_mode: data.evaluation_mode }),
      };

      console.log('📤 Payload para atualizar olimpíada (salvando como OLIMPIADA):', payload);

      const response = await api.put(`/test/${id}`, payload);
      
      const result = response.data;
      if (result) {
        result.type = 'OLIMPIADA';
        // Remover prefixo do título no retorno
        if (result.title && result.title.includes('[OLIMPÍADA]')) {
          result.title = result.title.replace('[OLIMPÍADA] ', '');
        }
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Deletar olimpíada
   * Usa o mesmo endpoint de avaliação
   */
  static async deleteOlimpiada(id: string): Promise<void> {
    try {
      await api.delete(`/test/${id}`);
    } catch (error) {
      console.error('Erro ao deletar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Aplicar/enviar olimpíada para alunos
   * Usa o mesmo endpoint de avaliação
   * @param id - ID da olimpíada
   * @param classes - Array de IDs das turmas
   * @param startDateTime - Data/hora de início (ISO ou datetime-local)
   * @param endDateTime - Data/hora de fim (ISO ou datetime-local)
   * @param timezone - Timezone do usuário (opcional, será detectado automaticamente se não fornecido)
   */
  static async applyOlimpiada(
    id: string,
    classes: string[],
    startDateTime: string,
    endDateTime: string,
    timezone?: string
  ): Promise<void> {
    try {
      // Obter timezone se não fornecido
      const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Verificar se já está em formato ISO com timezone antes de converter
      // Mesmo padrão usado em ViewEvaluation.tsx
      const isISOFormat = (dateStr: string) => {
        // Verifica se tem timezone offset (formato +/-HH:MM no final)
        const timezonePattern = /[+-]\d{2}:\d{2}$/;
        return timezonePattern.test(dateStr);
      };

      // Se já estiver em formato ISO, usar diretamente; caso contrário, converter
      const startDateTimeISO = isISOFormat(startDateTime)
        ? startDateTime
        : convertDateTimeLocalToISO(startDateTime);
      const endDateTimeISO = isISOFormat(endDateTime)
        ? endDateTime
        : convertDateTimeLocalToISO(endDateTime);

      // Formatar classes no mesmo formato usado para avaliações
      const classesData = classes.map(classId => ({
        class_id: classId,
        application: startDateTimeISO,
        expiration: endDateTimeISO
      }));

      // ✅ VALIDAÇÃO: Verificar se as datas estão corretas antes de enviar
      const startDateObj = new Date(startDateTimeISO);
      const endDateObj = new Date(endDateTimeISO);
      const now = new Date();
      const diffMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);
      
      console.log('📡 [olimpiadasApi] Enviando dados para backend:', {
        endpoint: `/test/${id}/apply`,
        payload: {
          classes: classesData,
          timezone: userTimezone
        },
        datas_enviadas: {
          application: startDateTimeISO,
          expiration: endDateTimeISO
        },
        validacao: {
          inicio: {
            iso: startDateObj.toISOString(),
            local: startDateObj.toLocaleString('pt-BR'),
            timestamp: startDateObj.getTime()
          },
          termino: {
            iso: endDateObj.toISOString(),
            local: endDateObj.toLocaleString('pt-BR'),
            timestamp: endDateObj.getTime()
          },
          agora: {
            iso: now.toISOString(),
            local: now.toLocaleString('pt-BR'),
            timestamp: now.getTime()
          },
          diferenca_minutos: diffMinutes,
          termino_esta_no_futuro: endDateObj > now,
          termino_apos_inicio: endDateObj > startDateObj
        }
      });
      
      // ✅ VALIDAÇÃO FINAL: Garantir que a data de término está no futuro
      if (endDateObj <= now) {
        console.error('❌ ERRO: Data de término está no passado!', {
          endDateTimeISO,
          endDateObj: endDateObj.toISOString(),
          now: now.toISOString(),
          diferenca_ms: endDateObj.getTime() - now.getTime()
        });
        throw new Error('A data de término não pode estar no passado');
      }
      
      if (endDateObj <= startDateObj) {
        console.error('❌ ERRO: Data de término não é posterior à de início!', {
          startDateTimeISO,
          endDateTimeISO,
          diferenca_ms: endDateObj.getTime() - startDateObj.getTime()
        });
        throw new Error('A data de término deve ser posterior à data de início');
      }

      const response = await api.post(`/test/${id}/apply`, {
        classes: classesData,
        timezone: userTimezone
      });
      
      console.log('✅ [olimpiadasApi] Resposta do backend:', {
        status: response.status,
        data: response.data,
        // Log das datas retornadas se disponíveis
        applied_classes: response.data?.applied_classes?.map((ac: any) => ({
          class_id: ac.class_id,
          application: ac.application,
          expiration: ac.expiration,
          timezone: ac.timezone
        }))
      });

      console.log('✅ Olimpíada aplicada com sucesso:', response.data);
    } catch (error) {
      console.error('Erro ao aplicar olimpíada:', error);
      throw error;
    }
  }

  /**
   * Buscar resultados da olimpíada
   * Reutiliza endpoint de resultados de avaliação
   */
  static async getOlimpiadaResults(olimpiadaId: string): Promise<{
    results: OlimpiadaResult[];
    ranking: OlimpiadaRanking[];
    totalStudents: number;
    completedStudents: number;
    averageScore: number;
  }> {
    try {
      const response = await api.get('/test-sessions/results', {
        params: { test_id: olimpiadaId },
      });

      // Transformar dados do backend para formato de olimpíada
      const results: OlimpiadaResult[] = (response.data?.results || response.data || []).map(
        (item: unknown) => ({
          id: (item as { id?: string }).id || '',
          olimpiada_id: olimpiadaId,
          student_id: (item as { student_id?: string }).student_id || '',
          student_name: (item as { student_name?: string; nome?: string }).student_name || 
                       (item as { nome?: string }).nome || '',
          score: (item as { score?: number; nota?: number }).score || 
                (item as { nota?: number }).nota || 0,
          proficiency: (item as { proficiency?: number; proficiencia?: number }).proficiency || 
                       (item as { proficiencia?: number }).proficiencia || 0,
          classification: (item as { classification?: string; classificacao?: string }).classification || 
                          (item as { classificacao?: string }).classificacao || '',
          correct_answers: (item as { correct_answers?: number; acertos?: number }).correct_answers || 
                          (item as { acertos?: number }).acertos || 0,
          total_questions: (item as { total_questions?: number; total_questoes?: number }).total_questions || 
                          (item as { total_questoes?: number }).total_questoes || 0,
          completed_at: (item as { completed_at?: string; submitted_at?: string }).completed_at || 
                        (item as { submitted_at?: string }).submitted_at || new Date().toISOString(),
        })
      );

      // Criar ranking ordenado por score
      const ranking: OlimpiadaRanking[] = results
        .map((result, index) => ({
          position: index + 1,
          student_id: result.student_id,
          student_name: result.student_name,
          score: result.score,
          proficiency: result.proficiency,
          classification: result.classification,
          correct_answers: result.correct_answers,
          total_questions: result.total_questions,
        }))
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({ ...item, position: index + 1 }));

      return {
        results,
        ranking,
        totalStudents: response.data?.total_students || results.length,
        completedStudents: results.length,
        averageScore: results.length > 0
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length
          : 0,
      };
    } catch (error) {
      console.error('Erro ao buscar resultados da olimpíada:', error);
      throw error;
    }
  }

  /**
   * Buscar olimpíadas do aluno
   * Filtra avaliações do tipo OLIMPIADA ou com título contendo "[OLIMPÍADA]" para o aluno logado
   * IMPORTANTE: A olimpíada precisa estar aplicada/enviada para aparecer aqui
   */
  static async getStudentOlimpiadas(): Promise<Olimpiada[]> {
    try {
      const response = await api.get('/test/my-class/tests');
      
      // O endpoint retorna { tests: [...] }
      const allTests = response.data?.tests || [];
      
      console.log('📋 Total de testes retornados pelo /test/my-class/tests:', allTests.length);
      console.log('📋 Todos os testes (primeiros 5):', allTests.slice(0, 5).map((t: unknown) => {
        const test = t as { 
          test_id?: string;
          title?: string;
          type?: string;
          availability?: unknown;
          student_status?: unknown;
          application_info?: {
            application?: string;
            expiration?: string;
            timezone?: string;
            time_zone?: string;
          };
        };
        return {
          test_id: test.test_id,
          title: test.title,
          type: test.type,
          availability: test.availability,
          student_status: test.student_status,
          application_info: test.application_info,
          // Log completo do application_info
          application_info_detalhado: test.application_info ? {
            application: test.application_info.application,
            expiration: test.application_info.expiration,
            timezone: test.application_info.timezone,
            time_zone: test.application_info.time_zone
          } : null
        };
      }));
      
      // TEMPORÁRIO: Filtrar todas as avaliações do tipo PROVA para aparecerem como olimpíadas
      // TODO: Voltar a filtrar apenas por título contendo [OLIMPÍADA] quando o sistema estiver estável
      const olimpiadas = allTests
        .filter((test: unknown) => {
          const testObj = test as { 
            type?: string; 
            title?: string; 
            test_id?: string;
            model?: string;
          };
          const title = testObj.title || '';
          const type = testObj.type || '';
          const model = testObj.model || '';
          
          // TEMPORÁRIO: Aceitar todas as avaliações do tipo PROVA
          const isOlimpiada = 
            model === 'PROVA' ||
            type === 'OLIMPIADA' || 
            title.toUpperCase().includes('[OLIMPÍADA]') || 
            title.toUpperCase().includes('OLIMPÍADA') ||
            title.toUpperCase().includes('OLIMPIADA');
          
          if (isOlimpiada) {
            console.log('✅ Olimpíada encontrada:', {
              test_id: testObj.test_id,
              title: title,
              type: type,
              model: model
            });
          } else {
            // Log para debug - ver quais testes estão sendo ignorados
            console.log('❌ Não é olimpíada:', {
              test_id: testObj.test_id,
              title: title.substring(0, 50),
              type: type,
              model: model
            });
          }
          
          return isOlimpiada;
        })
        .map((test: unknown) => {
          const testObj = test as {
            test_id?: string;
            id?: string;
            title?: string;
            description?: string;
            type?: string;
            duration?: number;
            startDateTime?: string;
            time_limit?: string;
            subjects?: unknown[];
            subjects_info?: Array<{ id: string; name: string }>;
            application_info?: {
              application?: string;
              expiration?: string;
              timezone?: string;
              time_zone?: string;
            };
            availability?: unknown;
            student_status?: unknown;
          };
          
          // Log SUPER detalhado do que está chegando do backend
          console.log('🔍 [olimpiadasApi] Dados brutos do teste do backend:', {
            test_id: testObj.test_id,
            title: testObj.title,
            application_info: testObj.application_info,
            startDateTime: testObj.startDateTime,
            time_limit: testObj.time_limit,
            availability: testObj.availability,
            // Detalhar application_info se existir
            application_info_detalhado: testObj.application_info ? {
              application: testObj.application_info.application,
              expiration: testObj.application_info.expiration,
              timezone: testObj.application_info.timezone,
              time_zone: testObj.application_info.time_zone,
              // Parsear as datas para ver como estão sendo interpretadas
              application_parsed: testObj.application_info.application ? {
                original: testObj.application_info.application,
                asDate: new Date(testObj.application_info.application).toISOString(),
                asLocaleString: new Date(testObj.application_info.application).toLocaleString('pt-BR'),
                hours: new Date(testObj.application_info.application).getHours(),
                timezoneOffset: new Date(testObj.application_info.application).getTimezoneOffset()
              } : null,
              expiration_parsed: testObj.application_info.expiration ? {
                original: testObj.application_info.expiration,
                asDate: new Date(testObj.application_info.expiration).toISOString(),
                asLocaleString: new Date(testObj.application_info.expiration).toLocaleString('pt-BR'),
                hours: new Date(testObj.application_info.expiration).getHours(),
                timezoneOffset: new Date(testObj.application_info.expiration).getTimezoneOffset()
              } : null
            } : 'application_info não existe'
          });
          
          const id = testObj.test_id || testObj.id || '';
          let title = testObj.title || '';
          
          // Remover prefixo [OLIMPÍADA] do título se existir
          title = title.replace(/\[OLIMPÍADA\]\s?/gi, '').trim();
          
          // ✅ PADRONIZADO: Usar exatamente o mesmo padrão de StudentEvaluations.tsx
          const applicationTimeZone =
            testObj.application_info?.timezone ||
            testObj.application_info?.time_zone ||
            (testObj.availability as { timezone?: string; time_zone?: string })?.time_zone ||
            (testObj.availability as { timezone?: string; time_zone?: string })?.timezone;

          // Resolver timezone (função local similar ao StudentEvaluations)
          const resolveTimeZone = (candidate?: string): string => {
            const DEFAULT_TIME_ZONE = (() => {
              try {
                return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
              } catch (error) {
                return "America/Sao_Paulo";
              }
            })();
            
            if (!candidate) {
              return DEFAULT_TIME_ZONE;
            }

            try {
              new Intl.DateTimeFormat("pt-BR", { timeZone: candidate });
              return candidate;
            } catch (error) {
              return DEFAULT_TIME_ZONE;
            }
          };

          const resolvedTimeZone = resolveTimeZone(applicationTimeZone);
          
          // ✅ PADRONIZADO: Mapear exatamente como StudentEvaluations.tsx
          const olimpiada: Olimpiada = {
            id,
            title,
            description: testObj.description,
            type: 'OLIMPIADA' as const,
            duration: testObj.duration,
            // ✅ CRÍTICO: Usar application_info.application e expiration (mesmo padrão de avaliações)
            startDateTime: testObj.application_info?.application || new Date().toISOString(),
            endDateTime: testObj.application_info?.expiration,
            subjects: testObj.subjects_info || (testObj.subjects as Array<{ id: string; name: string }>) || [],
            // ✅ PADRONIZADO: Usar availability e student_status diretamente do backend (mesmo padrão de StudentEvaluations)
            // O backend já retorna no formato correto, apenas garantir que existe
            availability: (testObj.availability as {
              is_available: boolean;
              status: "available" | "not_available" | "not_yet_available" | "expired" | "completed" | "not_started";
              timezone?: string;
              time_zone?: string;
            }) || {
              is_available: false,
              status: 'not_available' as const
            },
            student_status: (testObj.student_status as {
              has_completed: boolean;
              status: "nao_iniciada" | "em_andamento" | "finalizada" | "expirada" | "corrigida" | "revisada";
              can_start: boolean;
              score?: number;
              grade?: number;
            }) || {
              has_completed: false,
              status: 'nao_iniciada' as const,
              can_start: false
            },
            // Campos de timezone para formatação correta de datas
            timeZone: resolvedTimeZone,
            applicationTimeZone: applicationTimeZone
          };
          
          console.log('✅ Olimpíada mapeada (padrão StudentEvaluations):', {
            id: olimpiada.id,
            title: olimpiada.title,
            startDateTime: olimpiada.startDateTime,
            endDateTime: olimpiada.endDateTime,
            timeZone: olimpiada.timeZone,
            applicationTimeZone: olimpiada.applicationTimeZone,
            availability: olimpiada.availability,
            student_status: olimpiada.student_status
          });
          
          return olimpiada;
        });
      
      console.log('🏆 Total de olimpíadas encontradas:', olimpiadas.length);
      console.log('🏆 Olimpíadas:', olimpiadas.map(o => ({ id: o.id, title: o.title })));
      
      // Se não encontrou nenhuma olimpíada, pode ser que:
      // 1. A olimpíada não foi aplicada/enviada
      // 2. A olimpíada não está associada às turmas do aluno
      // 3. O título não contém [OLIMPÍADA]
      if (olimpiadas.length === 0 && allTests.length > 0) {
        console.warn('⚠️ Nenhuma olimpíada encontrada, mas há testes disponíveis. Verifique:');
        console.warn('1. Se a olimpíada foi aplicada/enviada (endpoint /test/{id}/apply)');
        console.warn('2. Se a olimpíada está associada às turmas do aluno');
        console.warn('3. Se o título contém [OLIMPÍADA]');
      }
      
      return olimpiadas;
    } catch (error) {
      console.error('Erro ao buscar olimpíadas do aluno:', error);
      throw error;
    }
  }
}
