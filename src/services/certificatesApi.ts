import { api } from '@/lib/api';
import type { 
  Certificate, 
  CertificateTemplate, 
  ApprovedStudent, 
  EvaluationWithCertificates,
  CertificateApprovalRequest 
} from '@/types/certificates';

export class CertificatesApiService {
  /**
   * Busca quantidade de certificados emitidos (respeita escopo do usuário logado).
   * GET /certificates/quantidade
   * Requer contexto de cidade (X-City-ID) quando aplicável.
   */
  static async getQuantidade(): Promise<number> {
    try {
      const response = await api.get<{ quantidade: number }>('/certificates/quantidade');
      return response.data?.quantidade ?? 0;
    } catch (error) {
      console.error('Erro ao buscar quantidade de certificados:', error);
      return 0;
    }
  }

  /**
   * Buscar avaliações da escola do diretor com contagem de alunos aprovados
   * Se isAdmin for true, busca todas as avaliações do sistema usando /test/
   * Caso contrário, usa /evaluation-results/avaliacoes com filtros
   */
  static async getEvaluationsBySchool(
    schoolId?: string, 
    municipalityId?: string, 
    isAdmin: boolean = false
  ): Promise<EvaluationWithCertificates[]> {
    try {
      let evaluations: any[] = [];
      
      if (isAdmin) {
        // Para admin, buscar todas as avaliações usando /test/
        console.log('Buscando avaliações para admin via /test/');
        const response = await api.get('/test/', {
          params: {
            page: 1,
            per_page: 1000  // Buscar muitas avaliações
          }
        });
        
        const testsData = response.data?.data || response.data || [];
        evaluations = Array.isArray(testsData) ? testsData : testsData.tests || [];
        console.log(`Admin: ${evaluations.length} avaliações encontradas`);
      } else {
        // Para diretor/coordenador, usar endpoint com filtros
        // Primeiro, precisamos buscar um estado e município válidos
        // Como o endpoint requer esses parâmetros, vamos buscar através do endpoint de avaliações aplicadas
        
        if (!schoolId || !municipalityId) {
          console.log('Diretor: faltando schoolId ou municipalityId');
          return [];
        }
        
        console.log(`Buscando avaliações para diretor: escola=${schoolId}, municipio=${municipalityId}`);
        
        // Buscar o município para obter o estado
        try {
          const municipalityResponse = await api.get(`/city/${municipalityId}`);
          const municipalityData = municipalityResponse.data;
          
          const params: Record<string, string> = {
            estado: municipalityData.state || '',
            municipio: municipalityId,
            avaliacao: 'all',
            escola: schoolId,
            page: '1',
            per_page: '1000'
          };
          
          console.log('Parâmetros da requisição:', params);
          const response = await api.get('/evaluation-results/avaliacoes', { params });
          
          // Extrair avaliações da resposta
          const data = response.data;
          // O endpoint retorna em resultados_detalhados.avaliacoes
          if (data?.resultados_detalhados?.avaliacoes && Array.isArray(data.resultados_detalhados.avaliacoes)) {
            // Incluir todas as avaliações (incluindo olimpíadas) para certificados
            evaluations = data.resultados_detalhados.avaliacoes;
            
            // Extrair avaliações únicas do objeto evaluation dentro de cada resultado
            // Como os resultados são agregados, precisamos extrair o ID da avaliação do objeto evaluation
            const uniqueEvaluationsMap = new Map<string, any>();
            
            evaluations.forEach((result: any) => {
              // Tentar extrair a avaliação de diferentes formas
              const evaluation = result.test || result.evaluation;
              if (evaluation) {
                const evalId = evaluation.id || result.id;
                if (evalId && !uniqueEvaluationsMap.has(evalId)) {
                  uniqueEvaluationsMap.set(evalId, {
                    ...result,
                    id: evalId,
                    evaluation: evaluation
                  });
                }
              } else if (result.id && (result.id.startsWith('escola_') || result.id.startsWith('serie_') || result.id.startsWith('turma_'))) {
                // Se o ID é agregado, tentar buscar a avaliação original
                // Por enquanto, vamos usar o título para identificar
                const title = result.titulo || result.title;
                if (title && !uniqueEvaluationsMap.has(title)) {
                  uniqueEvaluationsMap.set(title, result);
                }
              } else {
                uniqueEvaluationsMap.set(result.id || result.test_id, result);
              }
            });
            
            evaluations = Array.from(uniqueEvaluationsMap.values());
            console.log(`Diretor: ${evaluations.length} avaliações únicas encontradas`);
          } else if (data?.data && Array.isArray(data.data)) {
            evaluations = data.data;
          } else if (Array.isArray(data)) {
            evaluations = data;
          }
        } catch (error: any) {
          console.error('Erro ao buscar avaliações aplicadas:', error);
          console.error('URL da requisição:', error.config?.url);
          console.error('Status:', error.response?.status);
          return [];
        }
      }
      
      // Transformar dados da API para o formato esperado
      return evaluations.map((evaluation: any) => {
        // Extrair ID da avaliação corretamente
        const evaluationObj = evaluation.test || evaluation.evaluation || evaluation;
        const evaluationId = evaluation.id || evaluation.test_id || evaluationObj?.id;
        
        // Extrair total de alunos participantes de múltiplas fontes possíveis
        const totalStudents = 
          evaluation.total_students || 
          evaluation.total_alunos || 
          evaluation.alunos_participantes ||
          evaluation.studentCount ||
          evaluation.studentsCount ||
          evaluation.participants_count ||
          evaluation.totalParticipants ||
          evaluationObj?.total_students ||
          evaluationObj?.total_alunos ||
          evaluationObj?.alunos_participantes ||
          evaluationObj?.studentCount ||
          evaluationObj?.studentsCount ||
          0;
        
        // Extrair created_by da avaliação
        const createdBy = evaluation.created_by || evaluation.createdBy || evaluationObj?.created_by || evaluationObj?.createdBy;
        
        // Extrair tipo da avaliação (AVALIACAO ou OLIMPIADA)
        const evaluationType = evaluation.type || evaluation.tipo || evaluationObj?.type || evaluationObj?.tipo || 'AVALIACAO';
        
        // Extrair data de aplicação de múltiplas fontes possíveis
        const appliedAt = 
          evaluation.applied_at || 
          evaluation.data_aplicacao ||
          evaluation.createdAt ||                          // Campo padrão do /test/
          evaluation.startDateTime ||                      // Campo de olimpíadas
          evaluation.application_info?.application ||      // Campo de aplicação de olimpíadas
          evaluationObj?.createdAt ||                      // Campo do objeto de avaliação
          evaluationObj?.created_at ||
          evaluationObj?.startDateTime ||
          evaluationObj?.application_info?.application ||
          evaluation.created_at ||
          null;
        
        return {
          id: evaluationId,
          title: evaluation.title || evaluation.titulo || evaluationObj?.title || 'Avaliação sem título',
          subject: evaluation.subject?.name || evaluation.subject_rel?.name || evaluation.disciplina || evaluationObj?.subject_rel?.name || 'Disciplina não informada',
          applied_at: appliedAt,
          approved_students_count: 0, // Será calculado quando necessário via endpoint específico
          total_students_count: totalStudents,
          certificate_status: evaluation.certificate_status || 'none',
          created_by: createdBy ? {
            id: createdBy.id || createdBy._id || '',
            name: createdBy.name || createdBy.nome || ''
          } : undefined,
          type: evaluationType
        };
      });
    } catch (error: any) {
      console.error('Erro ao buscar avaliações:', error);
      console.error('URL da requisição:', error.config?.url);
      console.error('Status:', error.response?.status);
      return [];
    }
  }

  /**
   * Buscar alunos aprovados (nota >= 6) de uma avaliação
   * Usa o endpoint /certificates/approved-students/{evaluation_id}
   */
  static async getApprovedStudents(evaluationId: string): Promise<ApprovedStudent[]> {
    try {
      const response = await api.get(`/certificates/approved-students/${evaluationId}`);
      
      // O endpoint retorna um array direto de alunos aprovados
      const students = Array.isArray(response.data) ? response.data : [];
      
      console.log('Alunos aprovados retornados do endpoint:', students.length);
      
      // Mapear para o formato esperado
      return students.map((student: any) => ({
        id: student.id || student.student_id,
        name: student.name || student.nome || 'Aluno sem nome',
        grade: Number(student.grade || student.nota || student.score || 0),
        class_name: student.class_name || student.turma || student.class?.name || 'N/A',
        certificate_id: student.certificate_id,
        certificate_status: student.certificate_status || 'pending'
      }));
    } catch (error: any) {
      console.error('Erro ao buscar alunos aprovados:', error);
      if (error?.response?.status === 404) {
        console.log('Avaliação não encontrada ou sem alunos aprovados');
        return [];
      }
      console.error('Detalhes do erro:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Buscar template de certificado de uma avaliação
   * Retorna null se não existir (comportamento esperado)
   */
  static async getCertificateTemplate(evaluationId: string): Promise<CertificateTemplate | null> {
    try {
      const response = await api.get(`/certificates/template/${evaluationId}`);
      return response.data;
    } catch (error: any) {
      // Se não existir template no backend, retornar null (será criado localmente)
      if (error?.response?.status === 404) {
        console.log('Template não encontrado no backend - será criado localmente');
        return null;
      }
      console.error('Erro ao buscar template de certificado:', error);
      return null;
    }
  }

  /**
   * Salvar ou atualizar template de certificado
   * Se o template tiver id, atualiza; caso contrário, cria novo
   */
  static async saveCertificateTemplate(template: CertificateTemplate): Promise<CertificateTemplate> {
    try {
      const response = await api.post('/certificates/template', template);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao salvar template de certificado:', error);
      // Se for erro de validação, lançar o erro
      if (error?.response?.status === 400) {
        throw new Error(error.response?.data?.erro || 'Erro ao salvar template');
      }
      // Para outros erros, retornar o template original para não quebrar o fluxo
      return template;
    }
  }

  /**
   * Aprovar e enviar certificados para alunos
   * Pode aprovar todos os aprovados (apenas evaluation_id) ou alunos específicos (evaluation_id + student_ids)
   */
  static async approveCertificates(
    evaluationId: string, 
    studentIds?: string[]
  ): Promise<{ 
    success: boolean; 
    message: string;
    certificates_issued?: number;
    certificates_updated?: number;
    total_processed?: number;
    errors?: string[];
  }> {
    try {
      const requestBody: { evaluation_id: string; student_ids?: string[] } = {
        evaluation_id: evaluationId
      };
      
      // Se studentIds for fornecido, incluir no body
      if (studentIds && studentIds.length > 0) {
        requestBody.student_ids = studentIds;
      }
      
      const response = await api.post('/certificates/approve', requestBody);
      return response.data;
    } catch (error: any) {
      console.error('Erro ao aprovar certificados:', error);
      
      // Se for erro de validação, lançar erro com mensagem
      if (error?.response?.status === 400) {
        throw new Error(error.response?.data?.erro || 'Erro ao aprovar certificados');
      }
      
      throw error;
    }
  }

  /**
   * Criar notificação para aluno sobre certificado aprovado
   * Nota: Normalmente feito automaticamente pelo backend, mas pode ser usado para notificações adicionais
   */
  static async notifyStudent(studentId: string, certificateId: string, evaluationTitle: string): Promise<void> {
    try {
      await api.post('/notifications', {
        user_id: studentId,
        type: 'success',
        title: 'Você recebeu um novo certificado!',
        message: `Parabéns! Você recebeu um certificado por sua excelente performance na avaliação "${evaluationTitle}".`,
        action_url: '/aluno/certificados',
        action_text: 'Ver Certificado',
        priority: 'high',
        category: 'student'
      });
    } catch (error) {
      // Se o endpoint de notificações não existir, apenas logar
      console.warn('Erro ao criar notificação (pode não estar implementado):', error);
    }
  }

  /**
   * Buscar certificados do aluno
   */
  static async getStudentCertificates(studentId: string): Promise<Certificate[]> {
    try {
      const response = await api.get(`/certificates/student/${studentId}`);
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Erro ao buscar certificados do aluno:', error);
      return [];
    }
  }

  /**
   * Buscar certificados do aluno logado
   */
  static async getMyCertificates(): Promise<Certificate[]> {
    try {
      const response = await api.get('/certificates/me');
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Erro ao buscar meus certificados:', error);
      return [];
    }
  }

  /**
   * Buscar certificado específico
   */
  static async getCertificate(certificateId: string): Promise<Certificate | null> {
    try {
      const response = await api.get(`/certificates/${certificateId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar certificado:', error);
      return null;
    }
  }
}

