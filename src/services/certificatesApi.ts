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
            // Filtrar olimpíadas
            evaluations = data.resultados_detalhados.avaliacoes.filter((evaluation: any) => {
              const type = evaluation.type || evaluation.tipo;
              const title = evaluation.titulo || evaluation.title || '';
              const isOlimpiada = type === 'OLIMPIADA' || 
                                 title.includes('[OLIMPÍADA]') || 
                                 title.toUpperCase().includes('OLIMPÍADA');
              return !isOlimpiada;
            });
            
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
        
        // Contar alunos aprovados (nota >= 6) se disponível
        // Nota: isso pode precisar ser calculado no backend ou buscado separadamente
        let approvedCount = 0;
        if (evaluation.approved_students_count !== undefined) {
          approvedCount = evaluation.approved_students_count;
        } else if (evaluation.alunos_participantes !== undefined && evaluation.media_nota !== undefined) {
          // Estimativa: se média de nota é alta, pode ter muitos aprovados
          // Mas isso é apenas uma estimativa - o ideal seria buscar do backend
          approvedCount = 0; // Será calculado quando necessário
        }
        
        return {
          id: evaluationId,
          title: evaluation.title || evaluation.titulo || evaluationObj?.title || 'Avaliação sem título',
          subject: evaluation.subject?.name || evaluation.subject_rel?.name || evaluation.disciplina || evaluationObj?.subject_rel?.name || 'Disciplina não informada',
          applied_at: evaluation.applied_at || evaluation.data_aplicacao || evaluationObj?.created_at || evaluation.created_at,
          approved_students_count: approvedCount,
          total_students_count: evaluation.total_students || evaluation.total_alunos || evaluation.alunos_participantes || 0,
          certificate_status: evaluation.certificate_status || 'none'
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
   */
  static async getApprovedStudents(evaluationId: string): Promise<ApprovedStudent[]> {
    try {
      // Usar o endpoint correto que retorna alunos de uma avaliação
      const response = await api.get(`/evaluation-results/alunos`, {
        params: {
          avaliacao_id: evaluationId
        }
      });
      
      const result = response.data;
      // O endpoint retorna em "data" (não "alunos")
      const students = result?.data || result?.alunos || [];
      
      console.log('Alunos retornados do endpoint:', students.length);
      if (students.length > 0) {
        console.log('Primeiro aluno (exemplo):', JSON.stringify(students[0], null, 2));
      }
      
      // Filtrar apenas alunos com nota >= 6 E que completaram a avaliação
      // Converter nota para número antes de comparar
      const approvedStudents = students
        .filter((student: any) => {
          // Verificar se o aluno completou a avaliação
          const status = student.status || student.status_geral;
          if (status !== 'concluida' && status !== 'concluída') {
            console.log(`Aluno ${student.nome || student.name}: não completou a avaliação (status: ${status})`);
            return false;
          }
          
          // Obter nota em diferentes formatos possíveis
          const grade = Number(student.grade || student.nota || student.score || 0);
          const isApproved = grade >= 6;
          
          console.log(`Aluno ${student.nome || student.name}: nota=${grade}, aprovado=${isApproved}`);
          return isApproved;
        })
        .map((student: any) => ({
          id: student.id || student.student_id,
          name: student.name || student.nome || 'Aluno sem nome',
          grade: Number(student.grade || student.nota || student.score || 0),
          class_name: student.class_name || student.turma || student.class?.name || 'N/A',
          certificate_id: student.certificate_id,
          certificate_status: student.certificate_status || 'pending'
        }));
      
      console.log('Alunos aprovados (nota >= 6):', approvedStudents.length);
      
      return approvedStudents;
    } catch (error: any) {
      console.error('Erro ao buscar alunos aprovados:', error);
      console.error('Detalhes do erro:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Buscar template de certificado de uma avaliação
   * Nota: Por enquanto retorna null se não existir - o template será criado localmente
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
   * Nota: Por enquanto apenas armazena localmente - backend pode ser implementado depois
   */
  static async saveCertificateTemplate(template: CertificateTemplate): Promise<CertificateTemplate> {
    try {
      // Tentar salvar no backend se o endpoint existir
      const response = await api.post('/certificates/template', template);
      return response.data;
    } catch (error: any) {
      // Se o endpoint não existir, apenas retornar o template (será armazenado localmente)
      if (error?.response?.status === 404) {
        console.log('Endpoint de certificados não implementado - template será armazenado localmente');
        return template;
      }
      console.error('Erro ao salvar template de certificado:', error);
      // Mesmo assim, retornar o template para não quebrar o fluxo
      return template;
    }
  }

  /**
   * Aprovar e enviar certificados para alunos
   * Nota: Por enquanto apenas simula aprovação - backend pode ser implementado depois
   */
  static async approveCertificates(request: CertificateApprovalRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/certificates/approve', request);
      return response.data;
    } catch (error: any) {
      // Se o endpoint não existir, simular sucesso para não quebrar o fluxo
      if (error?.response?.status === 404) {
        console.log('Endpoint de aprovação não implementado - simulando sucesso');
        return {
          success: true,
          message: `Certificados preparados para ${request.student_ids.length} alunos (aguardando implementação do backend)`
        };
      }
      console.error('Erro ao aprovar certificados:', error);
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

