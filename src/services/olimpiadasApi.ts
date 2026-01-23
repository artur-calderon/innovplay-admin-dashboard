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

      // ✅ VALIDAÇÃO: Verificar se escolas e municípios estão presentes
      if (schoolsArray.length === 0) {
        console.warn('⚠️ [olimpiadasApi] ATENÇÃO: Nenhuma escola enviada no payload!', {
          dataSchools: data.schools,
          schoolsArray
        });
      }
      
      if (municipalitiesArray.length === 0) {
        console.warn('⚠️ [olimpiadasApi] ATENÇÃO: Nenhum município enviado no payload!', {
          dataMunicipalities: data.municipalities,
          municipalitiesArray
        });
      }

      // Enviar título sem modificações (sem prefixo [OLIMPÍADA])
      const payload: Record<string, unknown> = {
        title: data.title,
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

      // ✅ NOVO: Adicionar alunos individuais selecionados se houver
      if (data.selected_students && Array.isArray(data.selected_students) && data.selected_students.length > 0) {
        // ✅ VALIDAÇÃO CRÍTICA: Garantir que estamos enviando apenas os IDs selecionados, não todos os alunos
        const studentsToSend = data.selected_students.map((id: any) => String(id));
        payload.selected_students = studentsToSend;
        // ✅ CORREÇÃO: Quando há alunos individuais, não enviar classes (aplicação será por aluno, não por turma)
        const classesBeforeRemoval = payload.classes;
        payload.classes = [];
        console.log('📤 [olimpiadasApi] Incluindo alunos individuais no payload:', {
          count: studentsToSend.length,
          ids: studentsToSend,
          warning: studentsToSend.length > 10 ? '⚠️ Muitos alunos selecionados - verifique se está correto' : 'OK',
          note: 'Classes removidas do payload pois aplicação será por aluno individual',
          classesRemoved: Array.isArray(classesBeforeRemoval) ? classesBeforeRemoval.length : 0,
          classesAfterRemoval: payload.classes.length
        });
      } else {
        console.log('ℹ️ [olimpiadasApi] Nenhum aluno individual selecionado - olimpíada será aplicada por turma');
      }

      // ✅ LOG DETALHADO: Verificar se escolas e municípios estão no payload final
      console.log('📤 Payload para criar olimpíada (salvando como OLIMPIADA):', {
        ...payload,
        // Destacar escolas e municípios
        _validation: {
          hasSchools: !!payload.schools && Array.isArray(payload.schools) && payload.schools.length > 0,
          schoolsCount: Array.isArray(payload.schools) ? payload.schools.length : 0,
          schools: payload.schools,
          hasMunicipalities: !!payload.municipalities && Array.isArray(payload.municipalities) && payload.municipalities.length > 0,
          municipalitiesCount: Array.isArray(payload.municipalities) ? payload.municipalities.length : 0,
          municipalities: payload.municipalities,
          hasSelectedStudents: !!payload.selected_students && Array.isArray(payload.selected_students) && payload.selected_students.length > 0,
          selectedStudentsCount: Array.isArray(payload.selected_students) ? payload.selected_students.length : 0
        }
      });

      const response = await api.post('/test', payload);
      
      // Se o backend retornou com sucesso, marcar como olimpíada no frontend
      const result = response.data;
      if (result) {
        // Adicionar flag para identificar como olimpíada no frontend
        result.type = 'OLIMPIADA';
        
        // ✅ CORREÇÃO: Preservar selected_students se foi enviado no payload
        // O backend pode não retornar esse campo, então preservamos do payload
        if (payload.selected_students && Array.isArray(payload.selected_students) && payload.selected_students.length > 0) {
          result.selected_students = payload.selected_students as string[];
          console.log('✅ [olimpiadasApi] Preservando selected_students na resposta de criação:', {
            count: result.selected_students.length,
            ids: result.selected_students
          });
        }
        
        console.log('✅ Olimpíada criada com sucesso:', {
          id: result.id,
          title: result.title,
          type: result.type,
          hasSelectedStudents: !!(result.selected_students && result.selected_students.length > 0)
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
      
      // Filtrar apenas avaliações do tipo OLIMPIADA
      const olimpiadas = allTests
        .filter((test: Evaluation) => {
          return test.type === 'OLIMPIADA';
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
   * IMPORTANTE: O backend não armazena selected_students na tabela test,
   * então buscamos os alunos aplicados individualmente da tabela student_test_olimpics
   */
  static async getOlimpiada(id: string): Promise<Olimpiada> {
    try {
      const response = await api.get(`/test/${id}`);
      const result = response.data;
      
      // ✅ LOG: Verificar o que o backend retornou
      console.log('📥 [olimpiadasApi] getOlimpiada - resposta bruta do backend:', {
        id,
        hasSelectedStudents: !!result?.selected_students,
        selectedStudentsType: typeof result?.selected_students,
        selectedStudentsValue: result?.selected_students,
        selectedStudentsLength: Array.isArray(result?.selected_students) ? result.selected_students.length : 'não é array',
        classes: result?.classes,
        fullResult: result
      });
      
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
          
          // ✅ CRÍTICO: Mapear application e expiration para startDateTime e endDateTime
          // Isso é necessário para que a validação de período funcione corretamente
          if (result.application_info.application && !result.startDateTime) {
            result.startDateTime = result.application_info.application;
          }
          if (result.application_info.expiration && !result.endDateTime) {
            result.endDateTime = result.application_info.expiration;
          }
        }
      }

      // ✅ NOVO: Buscar alunos aplicados individualmente da tabela student_test_olimpics
      // O backend não armazena selected_students na tabela test, então precisamos buscar
      // os alunos que têm a olimpíada aplicada individualmente
      let selectedStudentsFromBackend: string[] = [];
      
      // Primeiro, verificar se o backend retornou selected_students diretamente
      // ✅ CORREÇÃO: Verificar se é array E tem elementos (não apenas se existe)
      if (result.selected_students && Array.isArray(result.selected_students) && result.selected_students.length > 0) {
        selectedStudentsFromBackend = result.selected_students.map((id: any) => String(id));
        console.log('📥 [olimpiadasApi] Backend retornou selected_students diretamente:', {
          count: selectedStudentsFromBackend.length,
          ids: selectedStudentsFromBackend
        });
      } else {
        // Se não retornou ou retornou array vazio, tentar buscar da tabela student_test_olimpics
        // Isso só funciona se a olimpíada já foi aplicada
        try {
          const appliedStudents = await this.getIndividualAppliedStudents(id);
          if (appliedStudents.length > 0) {
            selectedStudentsFromBackend = appliedStudents;
            console.log('📥 [olimpiadasApi] Buscou alunos aplicados individualmente da tabela student_test_olimpics:', {
              count: selectedStudentsFromBackend.length,
              ids: selectedStudentsFromBackend
            });
          } else {
            // ✅ Se não encontrou alunos aplicados, verificar se o backend retornou array vazio
            // Isso pode indicar que a olimpíada foi criada sem alunos individuais OU
            // que o backend não está salvando/retornando selected_students
            if (result.selected_students && Array.isArray(result.selected_students) && result.selected_students.length === 0) {
              console.log('ℹ️ [olimpiadasApi] Backend retornou selected_students como array vazio - olimpíada pode ter sido criada sem alunos individuais ou backend não retorna esse campo');
            } else {
              console.log('ℹ️ [olimpiadasApi] Nenhum aluno aplicado individualmente encontrado e backend não retornou selected_students');
            }
          }
        } catch (error) {
          console.warn('⚠️ [olimpiadasApi] Erro ao buscar alunos aplicados individualmente:', error);
          // Continuar sem selected_students
        }
      }
      
      // ✅ Definir selected_students no resultado
      result.selected_students = selectedStudentsFromBackend;
      
      // ✅ AVISO: Se encontrou muitos alunos, pode estar incorreto
      if (selectedStudentsFromBackend.length > 10) {
        console.warn('⚠️ [olimpiadasApi] ATENÇÃO: Muitos alunos encontrados. Verifique se está correto:', {
          count: selectedStudentsFromBackend.length,
          ids: selectedStudentsFromBackend
        });
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

      // Enviar título sem modificações (sem prefixo [OLIMPÍADA])
      const payload: Record<string, unknown> = {
        ...(data.title && { title: data.title }),
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
        // ✅ IMPORTANTE: Sempre enviar escolas e municípios, mesmo quando há alunos individuais
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

      // ✅ NOVO: Adicionar alunos individuais selecionados se houver
      if (data.selected_students !== undefined) {
        if (Array.isArray(data.selected_students) && data.selected_students.length > 0) {
          // ✅ VALIDAÇÃO CRÍTICA: Garantir que estamos enviando apenas os IDs selecionados
          const studentsToSend = data.selected_students.map((id: any) => String(id));
          payload.selected_students = studentsToSend;
          console.log('📤 [olimpiadasApi] Incluindo alunos individuais no payload de atualização:', {
            count: studentsToSend.length,
            ids: studentsToSend,
            warning: studentsToSend.length > 10 ? '⚠️ Muitos alunos selecionados - verifique se está correto' : 'OK'
          });
        } else {
          // Se for array vazio, enviar para limpar (voltar para modo turma)
          payload.selected_students = [];
          console.log('ℹ️ [olimpiadasApi] Limpando alunos individuais - olimpíada voltará a ser aplicada por turma');
        }
      }

      // ✅ LOG DETALHADO: Verificar se escolas e municípios estão no payload final
      console.log('📤 Payload para atualizar olimpíada (salvando como OLIMPIADA):', {
        ...payload,
        // Destacar escolas e municípios
        _validation: {
          hasSchools: !!payload.schools && Array.isArray(payload.schools) && payload.schools.length > 0,
          schoolsCount: Array.isArray(payload.schools) ? payload.schools.length : 0,
          schools: payload.schools,
          hasMunicipalities: !!payload.municipalities && Array.isArray(payload.municipalities) && payload.municipalities.length > 0,
          municipalitiesCount: Array.isArray(payload.municipalities) ? payload.municipalities.length : 0,
          municipalities: payload.municipalities,
          hasSelectedStudents: !!payload.selected_students && Array.isArray(payload.selected_students) && payload.selected_students.length > 0,
          selectedStudentsCount: Array.isArray(payload.selected_students) ? payload.selected_students.length : 0
        }
      });

      const response = await api.put(`/test/${id}`, payload);
      
      const result = response.data;
      if (result) {
        result.type = 'OLIMPIADA';
        // Garantir que selected_students seja retornado
        if (result.selected_students) {
          result.selected_students = Array.isArray(result.selected_students) 
            ? result.selected_students.map((id: any) => String(id))
            : [];
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
   * Aplicar/enviar olimpíada para alunos individuais
   * Usa o endpoint apply-olympics para aplicar a alunos específicos
   * @param id - ID da olimpíada
   * @param studentIds - Array de IDs dos alunos
   * @param startDateTime - Data/hora de início (ISO ou datetime-local)
   * @param endDateTime - Data/hora de fim (ISO ou datetime-local)
   * @param timezone - Timezone do usuário (opcional, será detectado automaticamente se não fornecido)
   */
  static async applyOlimpiadaToStudents(
    id: string,
    studentIds: string[],
    startDateTime: string,
    endDateTime: string,
    timezone?: string
  ): Promise<void> {
    try {
      // Obter timezone se não fornecido
      const userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Verificar se já está em formato ISO com timezone antes de converter
      const isISOFormat = (dateStr: string) => {
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

      // Validar datas
      const startDateObj = new Date(startDateTimeISO);
      const endDateObj = new Date(endDateTimeISO);
      const now = new Date();

      if (endDateObj <= now) {
        throw new Error('A data de término não pode estar no passado');
      }

      if (endDateObj <= startDateObj) {
        throw new Error('A data de término deve ser posterior à data de início');
      }

      // Aplicar para cada aluno individualmente
      // O endpoint apply-olympics aceita um aluno por vez ou pode aceitar array
      // Vamos tentar aplicar todos de uma vez primeiro
      console.log('📡 [olimpiadasApi] Aplicando olimpíada para alunos individuais:', {
        endpoint: `/test/${id}/apply-olympics`,
        totalStudents: studentIds.length,
        studentIds,
        application: startDateTimeISO,
        expiration: endDateTimeISO,
        timezone: userTimezone
      });

      // Aplicar para cada aluno (o endpoint pode aceitar apenas um aluno por vez)
      const results = await Promise.all(
        studentIds.map(async (studentId) => {
          const response = await api.post(`/test/${id}/apply-olympics`, {
            student_id: studentId,
            application: startDateTimeISO,
            expiration: endDateTimeISO,
            timezone: userTimezone
          });
          return response.data;
        })
      );

      console.log('✅ [olimpiadasApi] Olimpíada aplicada para alunos individuais:', {
        totalApplied: results.length,
        results
      });
    } catch (error) {
      console.error('Erro ao aplicar olimpíada para alunos individuais:', error);
      throw error;
    }
  }

  /**
   * Aplicar/enviar olimpíada para alunos
   * Usa o mesmo endpoint de avaliação
   * @param id - ID da olimpíada
   * @param classes - Array de IDs das turmas (strings) ou objetos com propriedade id
   * @param startDateTime - Data/hora de início (ISO ou datetime-local)
   * @param endDateTime - Data/hora de fim (ISO ou datetime-local)
   * @param timezone - Timezone do usuário (opcional, será detectado automaticamente se não fornecido)
   */
  static async applyOlimpiada(
    id: string,
    classes: string[] | any[],
    startDateTime: string,
    endDateTime: string,
    timezone?: string
  ): Promise<void> {
    try {
      // ✅ VALIDAÇÃO CRÍTICA: Garantir que classes seja um array de strings (IDs)
      let classIds: string[] = [];
      if (Array.isArray(classes) && classes.length > 0) {
        const firstItem = classes[0];
        // Verificar se é array de objetos com propriedade id
        if (typeof firstItem === 'object' && firstItem !== null && 'id' in firstItem) {
          classIds = classes.map((item: any) => String(item.id));
          console.warn('⚠️ [olimpiadasApi] applyOlimpiada recebeu objetos em vez de IDs. Convertendo...', {
            original: classes,
            converted: classIds
          });
        } else {
          // Array direto de strings/números
          classIds = classes.map((item: any) => String(item));
        }
      }
      
      if (classIds.length === 0) {
        throw new Error('Nenhuma turma fornecida para aplicar a olimpíada');
      }
      
      console.log('📡 [olimpiadasApi] Aplicando olimpíada para turmas:', {
        olimpiadaId: id,
        classIds,
        classIdsCount: classIds.length,
        originalClasses: classes
      });
      
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
      // ✅ Usar classIds (já convertidos para strings) em vez de classes
      const classesData = classIds.map(classId => ({
        class_id: String(classId), // Garantir que seja string
        application: startDateTimeISO,
        expiration: endDateTimeISO
      }));
      
      console.log('📤 [olimpiadasApi] Dados das turmas sendo enviados:', {
        classesData,
        count: classesData.length
      });

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
   * Buscar lista de alunos individuais aplicados via apply-olympics
   * Retorna array de IDs de alunos que foram aplicados individualmente
   * IMPORTANTE: Não chama getOlimpiada para evitar recursão
   */
  static async getIndividualAppliedStudents(olimpiadaId: string): Promise<string[]> {
    try {
      // Tentar buscar lista de alunos individuais aplicados
      // O backend pode retornar isso em diferentes formatos
      try {
        // Tentar endpoint específico para alunos individuais (se existir)
        const response = await api.get(`/test/${olimpiadaId}/applied-students`);
        if (response.data && Array.isArray(response.data.students)) {
          const students = response.data.students.map((s: any) => String(s.id || s.student_id || s));
          console.log('📥 [olimpiadasApi] getIndividualAppliedStudents - endpoint /applied-students retornou:', {
            count: students.length,
            ids: students
          });
          return students;
        }
        if (response.data && Array.isArray(response.data)) {
          const students = response.data.map((s: any) => String(s.id || s.student_id || s));
          console.log('📥 [olimpiadasApi] getIndividualAppliedStudents - endpoint /applied-students retornou (array direto):', {
            count: students.length,
            ids: students
          });
          return students;
        }
      } catch (error: any) {
        // Endpoint não existe, continuar com método alternativo
        if (error.response?.status === 404) {
          console.log('ℹ️ [olimpiadasApi] Endpoint /test/{id}/applied-students não disponível (404), usando método alternativo');
        } else {
          console.warn('⚠️ [olimpiadasApi] Erro ao buscar /applied-students:', error);
        }
      }

      // Método alternativo: buscar via relatório detalhado e identificar alunos individuais
      // pelos registros que têm student_test_olimpics_id
      try {
        const response = await api.get(`/evaluation-results/relatorio-detalhado/${olimpiadaId}`);
        const alunos = response.data?.alunos || [];
        
        // Filtrar apenas alunos que têm student_test_olimpics_id (aplicação individual)
        const alunosIndividuais = alunos.filter((aluno: any) => {
          return aluno.application_info?.student_test_olimpics_id || 
                 aluno.student_test_olimpics_id ||
                 (aluno.application_info && !aluno.application_info.class_test_id && aluno.application_info.student_test_olimpics_id);
        });
        
        if (alunosIndividuais.length > 0) {
          const studentIds = alunosIndividuais.map((aluno: any) => String(aluno.id || aluno.student_id || ''));
          console.log('📥 [olimpiadasApi] getIndividualAppliedStudents - identificados via relatório detalhado:', {
            count: studentIds.length,
            ids: studentIds
          });
          return studentIds;
        }
      } catch (error) {
        console.warn('⚠️ [olimpiadasApi] Erro ao buscar via relatório detalhado:', error);
      }
      
      // Se chegou aqui, não conseguimos identificar alunos individuais diretamente
      console.log('ℹ️ [olimpiadasApi] Nenhum aluno individual identificado');
      return [];
    } catch (error) {
      console.error('Erro ao buscar alunos individuais aplicados:', error);
      // Retornar array vazio em caso de erro - o sistema continuará funcionando
      return [];
    }
  }

  /**
   * Buscar resultados da olimpíada
   * Filtra apenas alunos individuais aplicados via apply-olympics
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
      // Buscar lista de alunos individuais aplicados primeiro
      const individualStudentIds = await this.getIndividualAppliedStudents(olimpiadaId);
      const hasIndividualStudents = individualStudentIds.length > 0;

      // Usar endpoint de evaluation-results que é mais estável e não tem problemas de CORS
      const response = await api.get(`/evaluation-results/relatorio-detalhado/${olimpiadaId}`);

      // O endpoint retorna { alunos: [...] } onde cada aluno tem os dados completos
      let alunos = response.data?.alunos || [];

      // ✅ FILTRAR: Se há alunos individuais aplicados, filtrar apenas esses alunos
      // Caso contrário, manter comportamento atual (compatibilidade)
      if (hasIndividualStudents) {
        console.log(`🔍 Filtrando resultados para ${individualStudentIds.length} alunos individuais aplicados`);
        alunos = alunos.filter((aluno: any) => {
          const alunoId = String(aluno.id || '');
          return individualStudentIds.includes(alunoId);
        });
        console.log(`✅ ${alunos.length} alunos individuais encontrados nos resultados`);
      } else {
        // Tentar identificar alunos individuais pelo application_info no relatório
        // Se o aluno tem student_test_olimpics_id no application_info, é individual
        const alunosIndividuais = alunos.filter((aluno: any) => {
          // Verificar se há indicação de aplicação individual
          // O backend pode retornar isso de diferentes formas
          return aluno.application_info?.student_test_olimpics_id || 
                 aluno.student_test_olimpics_id ||
                 (aluno.application_info && !aluno.application_info.class_test_id);
        });

        if (alunosIndividuais.length > 0) {
          console.log(`🔍 Identificados ${alunosIndividuais.length} alunos individuais pelo application_info`);
          alunos = alunosIndividuais;
        } else {
          console.log('ℹ️ Nenhum aluno individual identificado, usando todos os alunos (compatibilidade)');
        }
      }

      // Transformar dados do backend para formato de olimpíada
      const results: OlimpiadaResult[] = alunos
        .filter((aluno: any) => aluno.status === 'concluida') // Apenas alunos que concluíram
        .map((aluno: any) => ({
          id: aluno.id || '',
          olimpiada_id: olimpiadaId,
          student_id: aluno.id || '',
          student_name: aluno.nome || '',
          score: aluno.nota || 0,
          proficiency: aluno.proficiencia || 0,
          classification: aluno.classificacao || aluno.nivel || '',
          correct_answers: aluno.acertos || 0,
          total_questions: aluno.total_questoes || 0,
          completed_at: aluno.completed_at || new Date().toISOString(),
        }));

      // Criar ranking ordenado por score
      const ranking: OlimpiadaRanking[] = results
        .map((result) => {
          const alunoOriginal = alunos.find((a: any) => a.id === result.student_id);
          return {
            position: 0, // Será atualizado após ordenação
            student_id: result.student_id,
            student_name: result.student_name,
            student_avatar: alunoOriginal?.avatar || undefined,
            school: alunoOriginal?.escola || undefined,
            class: alunoOriginal?.turma || undefined,
            score: result.score,
            proficiency: result.proficiency,
            classification: result.classification,
            correct_answers: result.correct_answers,
            total_questions: result.total_questions,
          };
        })
        .sort((a, b) => b.score - a.score)
        .map((item, index) => ({ ...item, position: index + 1 }));

      return {
        results,
        ranking,
        totalStudents: alunos.length, // Total de alunos individuais aplicados
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
      
      // Filtrar apenas avaliações do tipo OLIMPIADA
      const olimpiadas = allTests
        .filter((test: unknown) => {
          const testObj = test as { type?: string };
          return testObj.type === 'OLIMPIADA';
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
