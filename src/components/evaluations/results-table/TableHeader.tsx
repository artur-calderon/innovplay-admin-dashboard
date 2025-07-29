import React from 'react';
import { QuestionData, QuestionWithSkills, VisibleFields } from '../../../types/results-table';
import { useSkillCodeGenerator, useSkillDescription, useTurmaPercentages } from '../../../hooks/useResultsTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';

interface TableHeaderProps {
  totalQuestions: number;
  startQuestionNumber: number;
  questoes?: QuestionData[];
  questionsWithSkills?: QuestionWithSkills[];
  skillsMapping?: Record<string, string>;
  skillsBySubject?: Record<string, Array<{
    id: string | null;
    code: string;
    description: string;
    source: 'database' | 'question';
  }>>;
  detailedReport?: any;
  visibleFields: VisibleFields;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  totalQuestions,
  startQuestionNumber,
  questoes,
  questionsWithSkills,
  skillsMapping,
  skillsBySubject,
  detailedReport,
  visibleFields
}) => {
  const { generateHabilidadeCode } = useSkillCodeGenerator();
  const { getSkillDescription } = useSkillDescription(skillsBySubject);
  const turmaPercentages = useTurmaPercentages(questoes, totalQuestions);

  const getDisciplineIndicator = (questao: any) => {
    if (!questao?.subject?.name) return '';
    
    const disciplina = questao.subject.name.toLowerCase();
    if (disciplina.includes('português') || disciplina.includes('portugues') || disciplina.includes('língua')) {
      return ' 🇧🇷';
    } else if (disciplina.includes('matemática') || disciplina.includes('matematica')) {
      return ' 🔢';
    } else if (disciplina.includes('ciência') || disciplina.includes('ciencia')) {
      return ' 🔬';
    } else if (disciplina.includes('história') || disciplina.includes('historia')) {
      return ' 📚';
    } else if (disciplina.includes('geografia')) {
      return ' 🌍';
    }
    return '';
  };

  return (
    <thead>
      {/* Cabeçalho principal */}
      <tr className="bg-gray-100">
        <th className="p-2 min-w-[150px] text-left border-r border-gray-300">Aluno</th>
        {visibleFields?.questoes && Array.from({ length: totalQuestions }, (_, i) => {
          let questionNumber = i + 1;
          
          if (questoes && questoes.length > 0) {
            const questao = questoes[i];
            if (questao) {
              questionNumber = questao.numero;
            }
          } else if (questionsWithSkills && questionsWithSkills.length > 0) {
            const questao = questionsWithSkills[i];
            if (questao) {
              questionNumber = questao.number;
            }
          }
          
          return (
            <th key={`header-q${i}`} className="p-2 min-w-[80px] border-r border-gray-300">
              Q{questionNumber}
            </th>
          );
        })}
        {visibleFields?.total && <th className="p-2 bg-gray-50">Total</th>}
        {visibleFields?.nota && <th className="p-2 bg-gray-50">Nota</th>}
        {visibleFields?.proficiencia && <th className="p-2 bg-gray-50">Proficiência</th>}
        {visibleFields?.nivel && <th className="p-2 bg-gray-50">Nível</th>}
      </tr>
      
      {/* Linha de habilidades */}
      {visibleFields?.habilidade && (
        <tr className="bg-gray-50">
          <td className="p-1 text-left border-r border-gray-300 text-xs font-mono text-gray-600">
            Habilidade
          </td>
          {visibleFields?.questoes && Array.from({ length: totalQuestions }, (_, i) => {
            let questionNumber = startQuestionNumber + i;
            let questao = null;
            
            if (questionsWithSkills && questionsWithSkills.length > 0) {
              questao = questionsWithSkills[i];
              if (questao) {
                questionNumber = questao.number;
              }
            } else if (questoes && questoes.length > 0) {
              questao = questoes.find(q => q.numero === questionNumber);
              if (questao) {
                questionNumber = questao.numero;
              }
            }
            
            const habilidadeCode = generateHabilidadeCode({
              questionNumber,
              questao,
              skillsMapping,
              detailedReport,
              questionsWithSkills
            });
            
            const disciplinaIndicator = getDisciplineIndicator(questao);
            const skillDescription = getSkillDescription(habilidadeCode);
            
            return (
              <td key={`habilidade-q${i}`} className="p-1 border-r border-gray-300 text-xs font-mono text-gray-600">
                {skillDescription ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help hover:text-blue-600 transition-colors group">
                          {habilidadeCode}{disciplinaIndicator}
                          <span className="ml-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">ℹ️</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs bg-gray-900 text-white border-gray-700">
                        <div className="space-y-2">
                          <div className="font-bold text-sm text-blue-200">{habilidadeCode}</div>
                          <div className="text-sm leading-relaxed">{skillDescription}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span>{habilidadeCode}{disciplinaIndicator}</span>
                )}
              </td>
            );
          })}
          {visibleFields?.total && <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>}
          {visibleFields?.nota && <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>}
          {visibleFields?.proficiencia && <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>}
          {visibleFields?.nivel && <td className="p-1 bg-gray-100 text-xs font-mono text-gray-600"></td>}
        </tr>
      )}
      
      {/* Linha de porcentagem da turma */}
      {visibleFields?.percentualTurma && (
        <tr className="bg-blue-50">
          <td className="p-1 text-left border-r border-gray-300 text-xs font-semibold text-blue-700">
            % Turma
          </td>
          {visibleFields?.questoes && turmaPercentages.map((percentage, i) => (
            <td key={`turma-q${i}`} className="p-1 border-r border-gray-300">
              <div className={`text-xs font-bold ${
                percentage > 0 ? (
                  percentage >= 60 ? "text-green-600" : "text-red-500"
                ) : "text-gray-400"
              }`}>
                {percentage > 0 ? `${percentage.toFixed(0)}%` : 'N/A'}
              </div>
            </td>
          ))}
          {visibleFields?.total && <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>}
          {visibleFields?.nota && <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>}
          {visibleFields?.proficiencia && <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>}
          {visibleFields?.nivel && <td className="p-1 bg-gray-100 text-xs font-semibold text-blue-700"></td>}
        </tr>
      )}
    </thead>
  );
}; 