import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentResult {
    id: string;
    nome: string;
    turma: string;
    nota: number;
    proficiencia: number;
    classificacao: 'Abaixo do Básico' | 'Básico' | 'Adequado' | 'Avançado';
    acertos: number;
    erros: number;
    questoes_respondidas: number;
    status: 'concluida' | 'pendente';
}

interface EvaluationInfo {
    id: string;
    titulo: string;
    disciplina: string;
    disciplinas?: string[];
    serie: string;
    escola: string;
    municipio: string;
    data_aplicacao: string;
}

interface DetailedReport {
    avaliacao: {
        id: string;
        titulo: string;
        disciplina: string;
        total_questoes: number;
    };
    questoes: Array<{
        id: string;
        numero: number;
        texto: string;
        habilidade: string;
        codigo_habilidade: string;
        tipo: 'multipleChoice' | 'open' | 'trueFalse';
        dificuldade: 'Fácil' | 'Médio' | 'Difícil';
        porcentagem_acertos: number;
        porcentagem_erros: number;
    }>;
}

interface PDFReportGeneratorProps {
    evaluationInfo: EvaluationInfo;
    students: StudentResult[];
    detailedReport?: DetailedReport;
    studentDetailedAnswers?: Record<string, any>;
    skillsMapping?: Record<string, string>;
}

export const PDFReportGenerator: React.FC<PDFReportGeneratorProps> = ({
    evaluationInfo,
    students,
    detailedReport,
    studentDetailedAnswers,
    skillsMapping
}) => {
    const { toast } = useToast();

    const generateClassificationColor = (classification: string): string => {
        switch (classification) {
            case 'Avançado': return '#16a34a'; // green-600
            case 'Adequado': return '#4ade80'; // green-400
            case 'Básico': return '#eab308'; // yellow-500
            case 'Abaixo do Básico': return '#ef4444'; // red-500
            default: return '#6b7280'; // gray-500
        }
    };

    const generateHabilidadeCode = (questionNumber: number, questao?: any): string => {
        if (questao && skillsMapping && questao.codigo_habilidade && skillsMapping[questao.codigo_habilidade]) {
            return skillsMapping[questao.codigo_habilidade];
        }
        
        // Fallback baseado na disciplina
        const disciplina = evaluationInfo.disciplina?.toLowerCase() || '';
        const isMathematics = disciplina.includes('matemática') || disciplina.includes('matematica');
        
        const grade = evaluationInfo.serie ? parseInt(evaluationInfo.serie.replace(/\D/g, '')) || 5 : 5;
        const skillNumber = ((questionNumber - 1) % 10) + 1;
        
        if (isMathematics) {
            return `${grade}N1.${skillNumber}`;
        } else {
            return `LP${grade}L1.${skillNumber}`;
        }
    };

    const generateStudentAnswers = (studentId: string, totalQuestions: number): (boolean | null)[] => {
        const student = students.find(s => s.id === studentId);
        if (!student) return Array(totalQuestions).fill(null);

        const correctAnswers = student.acertos;
        const wrongAnswers = student.erros;
        const totalAnswered = correctAnswers + wrongAnswers;
        
        return Array.from({ length: totalQuestions }, (_, questionIndex) => {
            if (questionIndex < totalAnswered) {
                return questionIndex < correctAnswers;
            }
            return null;
        });
    };

    const calculateQuestionPercentages = (): number[] => {
        if (!detailedReport) return [];
        
        return Array.from({ length: detailedReport.questoes.length }, (_, questionIndex) => {
            let correctCount = 0;
            let totalAnswered = 0;

            students.forEach(student => {
                if (student.status === 'concluida') {
                    const answers = generateStudentAnswers(student.id, detailedReport.questoes.length);
                    if (answers[questionIndex] !== null) {
                        totalAnswered++;
                        if (answers[questionIndex] === true) {
                            correctCount++;
                        }
                    }
                }
            });

            return totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
        });
    };

    const generatePDFReport = async () => {
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Configurações de fonte
            doc.setFont('helvetica');
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;

            let yPosition = margin;

            // Função para verificar quebra de página
            const checkPageBreak = (neededHeight: number) => {
                if (yPosition + neededHeight > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                    return true;
                }
                return false;
            };

            // Cabeçalho
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text(`PREFEITURA DE ${evaluationInfo.municipio?.toUpperCase() || 'MUNICÍPIO'}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 8;

            doc.setFontSize(12);
            doc.text(`Escola: ${evaluationInfo.escola || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
            doc.text(`Série: ${evaluationInfo.serie || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 6;
            doc.text(`Turma: ${students[0]?.turma || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 10;

            // Separar por disciplina se houver múltiplas
            const disciplinas = evaluationInfo.disciplinas || [evaluationInfo.disciplina];
            
            for (const disciplina of disciplinas) {
                checkPageBreak(50);

                // Título da disciplina
                doc.setFontSize(14);
                doc.setFillColor(220, 220, 220);
                doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
                doc.text(`RELATÓRIO DE DESEMPENHO GERAL - ${disciplina?.toUpperCase()} - Turma: ${students[0]?.turma || 'N/A'}`, 
                         pageWidth / 2, yPosition + 5, { align: 'center' });
                yPosition += 15;

                // Tabela de resumo por disciplina
                const studentsData = students
                    .filter(s => s.status === 'concluida')
                    .map((student, index) => [
                        `${index + 1}. ${student.nome}`,
                        student.acertos.toString(),
                        student.proficiencia.toFixed(2),
                        student.classificacao
                    ]);

                autoTable(doc, {
                    startY: yPosition,
                    head: [['Aluno', 'Total Acertos', 'Proficiência', 'Nível']],
                    body: studentsData,
                    theme: 'grid',
                    styles: {
                        fontSize: 9,
                        cellPadding: 2
                    },
                    headStyles: {
                        fillColor: [169, 169, 169],
                        textColor: [0, 0, 0],
                        fontStyle: 'bold'
                    },
                    columnStyles: {
                        0: { cellWidth: 'auto' },
                        1: { cellWidth: 25, halign: 'center' },
                        2: { cellWidth: 25, halign: 'center' },
                        3: { cellWidth: 30, halign: 'center' }
                    },
                    didParseCell: function(data) {
                        if (data.column.index === 3 && data.section === 'body') {
                            const classification = data.cell.text[0];
                            data.cell.styles.fillColor = generateClassificationColor(classification);
                            data.cell.styles.textColor = [255, 255, 255];
                        }
                    }
                });

                yPosition = (doc as any).lastAutoTable.finalY + 15;
            }

            // Nova página para tabela detalhada
            doc.addPage();
            yPosition = margin;

            // Cabeçalho da página detalhada
            doc.setFontSize(16);
            doc.text(`${evaluationInfo.titulo} - Turma: ${students[0]?.turma || 'N/A'}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 15;

            if (detailedReport && detailedReport.questoes.length > 0) {
                // Tabela questão por questão
                const questionPercentages = calculateQuestionPercentages();
                
                // Cabeçalho das questões
                const questionHeaders = ['Aluno'];
                const skillHeaders = ['Habilidade'];
                const percentageHeaders = ['% Turma'];
                
                detailedReport.questoes.forEach((questao, index) => {
                    questionHeaders.push(`Q${questao.numero}`);
                    skillHeaders.push(generateHabilidadeCode(questao.numero, questao));
                    percentageHeaders.push(`${questionPercentages[index]}%`);
                });
                
                questionHeaders.push('Total', 'Proficiência', 'Nível');
                skillHeaders.push('', '', '');
                percentageHeaders.push('', '', '');

                // Montar dados dos estudantes
                const detailedStudentsData = students
                    .filter(s => s.status === 'concluida')
                    .map(student => {
                        const answers = generateStudentAnswers(student.id, detailedReport.questoes.length);
                        const row = [student.nome];
                        
                        answers.forEach(answer => {
                            row.push(answer === true ? 'V' : answer === false ? 'X' : '-');
                        });
                        
                        row.push(
                            student.acertos.toString(),
                            student.proficiencia.toFixed(1),
                            student.classificacao
                        );
                        
                        return row;
                    });

                // Tabela principal com quebra automática
                autoTable(doc, {
                    startY: yPosition,
                    head: [questionHeaders, skillHeaders, percentageHeaders],
                    body: detailedStudentsData,
                    theme: 'grid',
                    styles: {
                        fontSize: 7,
                        cellPadding: 1
                    },
                    headStyles: {
                        fillColor: [169, 169, 169],
                        textColor: [0, 0, 0],
                        fontStyle: 'bold'
                    },
                    columnStyles: {
                        0: { cellWidth: 40 }
                    },
                    didParseCell: function(data) {
                        // Colorir respostas
                        if (data.section === 'body' && data.column.index > 0 && data.column.index < questionHeaders.length - 3) {
                            const value = data.cell.text[0];
                            if (value === 'V') {
                                data.cell.styles.fillColor = [34, 197, 94]; // green
                                data.cell.styles.textColor = [255, 255, 255];
                            } else if (value === 'X') {
                                data.cell.styles.fillColor = [239, 68, 68]; // red
                                data.cell.styles.textColor = [255, 255, 255];
                            }
                        }
                        
                        // Colorir classificações
                        if (data.column.index === questionHeaders.length - 1 && data.section === 'body') {
                            const classification = data.cell.text[0];
                            data.cell.styles.fillColor = generateClassificationColor(classification);
                            data.cell.styles.textColor = [255, 255, 255];
                        }
                        
                        // Colorir linha de porcentagens
                        if (data.row.index === 1 && data.section === 'head' && data.column.index > 0 && data.column.index < questionHeaders.length - 3) {
                            const percentage = parseInt(data.cell.text[0]);
                            if (percentage >= 60) {
                                data.cell.styles.fillColor = [34, 197, 94]; // green
                                data.cell.styles.textColor = [255, 255, 255];
                            } else {
                                data.cell.styles.fillColor = [239, 68, 68]; // red
                                data.cell.styles.textColor = [255, 255, 255];
                            }
                        }
                    }
                });
            }

            // Rodapé
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text('Afirme Play Soluções Educativas', margin, pageHeight - 10);
                doc.text(`Página ${i}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text(new Date().toLocaleString('pt-BR'), pageWidth - margin, pageHeight - 10, { align: 'right' });
            }

            // Salvar PDF
            const fileName = `relatorio-${evaluationInfo.titulo?.replace(/[^a-zA-Z0-9]/g, '-') || 'avaliacao'}-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

            toast({
                title: "PDF gerado com sucesso!",
                description: `Relatório salvo como ${fileName}`,
            });

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({
                title: "Erro ao gerar PDF",
                description: "Não foi possível gerar o relatório em PDF",
                variant: "destructive",
            });
        }
    };

    return (
        <Button onClick={generatePDFReport} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Gerar Relatório PDF
        </Button>
    );
}; 