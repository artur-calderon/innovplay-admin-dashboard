import React, { useState, useMemo, useEffect } from 'react';
import { Check, Search, Filter, Grid, List, X, Target, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import './SkillsSelector.css';
import { useSkillsStore } from '@/stores/useSkillsStore';
import { api } from '@/lib/api';
import CategoryPickerModal from './CategoryPickerModal';

interface Skill {
  id: string;
  code: string;
  description: string;
  name: string;
}

interface SkillsSelectorProps {
  skills: Skill[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  gradeId?: string; // Opcional: quando presente, filtra por série
  gradeName?: string; // Opcional: nome da série (ex: "2º Ano", "1º Período")
  subjectId?: string; // Opcional: ID da disciplina (para buscar habilidades por disciplina + série)
  subjectName?: string; // Opcional: nome da disciplina (ex: "Língua Portuguesa", "Matemática")
  allGrades?: Array<{ id: string; name: string }>; // Opcional: lista de todas as séries disponíveis
}

/**
 * Função utilitária para calcular quais gradeIds devem ser incluídos baseado nas regras acumulativas
 */
function getGradeIdsForCumulativeSkills(
  currentGradeId: string,
  currentGradeName: string,
  subjectName: string,
  allGrades: Array<{ id: string; name: string }>
): string[] {
  if (!currentGradeName || !allGrades || allGrades.length === 0) {
    return [currentGradeId];
  }

  const normalizedGradeName = currentGradeName.trim();
  const normalizedSubjectName = subjectName?.toLowerCase().trim() || '';

  // Verificar se é EJA (verificar no nome da série ou em qualquer parte do nome)
  const normalizedLower = normalizedGradeName.toLowerCase();
  const isEJA = normalizedLower.includes('período') || 
                normalizedLower.includes('periodo') ||
                normalizedLower.includes('eja') ||
                // Também verificar se está nas séries disponíveis (pode ter EJA no nome do curso)
                allGrades.some(g => {
                  const gradeLower = g.name.toLowerCase();
                  return gradeLower.includes('eja') && g.id === currentGradeId;
                });

  // Verificar se é Língua Portuguesa ou Matemática
  const isLinguaPortuguesa = normalizedSubjectName.includes('língua portuguesa') || 
                             normalizedSubjectName.includes('lingua portuguesa') ||
                             normalizedSubjectName.includes('português') ||
                             normalizedSubjectName.includes('portugues');
  const isMatematica = normalizedSubjectName.includes('matemática') || 
                       normalizedSubjectName.includes('matematica') ||
                       normalizedSubjectName.includes('math');

  // EJA: Mapear período para ano equivalente (1º Período = 1º Ano, 2º Período = 2º Ano, etc.)
  // Para EJA, sempre buscar habilidades do ano equivalente correspondente
  if (isEJA) {
    const periodoMatch = normalizedLower.match(/(\d+)[º°o]?\s*per[ií]odo/i);
    if (periodoMatch) {
      const periodoNum = parseInt(periodoMatch[1], 10);
      
      // Tentar múltiplas variações do nome do ano
      const possibleYearNames = [
        `${periodoNum}º Ano`,
        `${periodoNum}° Ano`,
        `${periodoNum}o Ano`,
        `${periodoNum} Ano`,
        `Ano ${periodoNum}`
      ];
      
      // Buscar o ano equivalente nas séries disponíveis
      // IMPORTANTE: Apenas séries dos Anos Iniciais (1º ao 5º ano)
      // Excluir: Ensino Médio, Anos Finais (6º ao 9º), e EJA
      
      // Log para debug: mostrar todas as séries disponíveis
      const todasSeriesNomes = allGrades.map(g => g.name);
      console.log('EJA - Buscando ano equivalente:', {
        periodo: currentGradeName,
        periodoNum,
        totalSeries: allGrades.length,
        todasSeriesNomes: todasSeriesNomes,
        todasSeries: allGrades.map(g => ({ id: g.id, name: g.name }))
      });
      
      // Buscar série que corresponde EXATAMENTE ao número do período (1º Período = 1º Ano)
      // Priorizar séries dos Anos Iniciais (1º ao 5º ano)
      let targetGrade = allGrades.find(g => {
        const gradeName = g.name.trim();
        const gradeNameLower = gradeName.toLowerCase();
        
        // Excluir Ensino Médio
        if (gradeNameLower.includes('em') || gradeNameLower.includes('médio') || gradeNameLower.includes('medio')) {
          return false;
        }
        
        // Excluir Anos Finais (6º ao 9º ano) - verificar números 6, 7, 8, 9
        const hasAnosFinais = /[6789][º°o]?\s*ano/i.test(gradeName);
        if (hasAnosFinais) {
          return false;
        }
        
        // Excluir EJA
        if (gradeNameLower.includes('eja') || gradeNameLower.includes('período') || gradeNameLower.includes('periodo')) {
          return false;
        }
        
        // Garantir que seja apenas Anos Iniciais (1º ao 5º ano)
        if (periodoNum < 1 || periodoNum > 5) {
          return false;
        }
        
        // Verificar se corresponde EXATAMENTE ao número do período
        // 1º Período EJA = 1º Ano dos Anos Iniciais
        const periodoStr = periodoNum.toString();
        
        // Extrair o primeiro número do nome da série
        const firstNumberMatch = gradeName.match(/^(\d+)/);
        if (!firstNumberMatch) {
          return false;
        }
        
        const firstNumber = parseInt(firstNumberMatch[1], 10);
        
        // Deve corresponder exatamente ao número do período
        if (firstNumber !== periodoNum) {
          return false;
        }
        
        // Deve conter "ano" (não "período")
        const hasAno = gradeNameLower.includes('ano');
        const hasPeriodo = gradeNameLower.includes('período') || gradeNameLower.includes('periodo');
        
        if (!hasAno || hasPeriodo) {
          return false;
        }
        
        // Verificar se é dos Anos Iniciais (1º ao 5º ano)
        if (firstNumber < 1 || firstNumber > 5) {
          return false;
        }
        
        // Se chegou aqui, é uma série válida dos Anos Iniciais que corresponde ao período
        return true;
      });
      
      // Se não encontrou com busca exata, tentar busca mais flexível
      if (!targetGrade) {
        console.log('EJA - Busca exata falhou, tentando busca flexível...');
        targetGrade = allGrades.find(g => {
          const gradeName = g.name.trim();
          const gradeNameLower = gradeName.toLowerCase();
          
          // Excluir Ensino Médio, Anos Finais e EJA
          if (gradeNameLower.includes('em') || gradeNameLower.includes('médio') || gradeNameLower.includes('medio') ||
              gradeNameLower.includes('eja') || gradeNameLower.includes('período') || gradeNameLower.includes('periodo')) {
            return false;
          }
          
          // Verificar se contém o número do período e "ano"
          const hasAno = gradeNameLower.includes('ano');
          const hasPeriodo = gradeNameLower.includes('período') || gradeNameLower.includes('periodo');
          
          if (!hasAno || hasPeriodo) {
            return false;
          }
          
          // Extrair todos os números do nome
          const allNumbers = gradeName.match(/\d+/g);
          if (allNumbers) {
            // Verificar se algum número corresponde exatamente ao período
            for (const numStr of allNumbers) {
              const num = parseInt(numStr, 10);
              // Deve corresponder exatamente ao período e ser dos Anos Iniciais (1-5)
              if (num === periodoNum && num >= 1 && num <= 5) {
                // Priorizar números que aparecem no início do nome
                const isFirstNumber = gradeName.match(/^(\d+)/)?.[1] === numStr;
                if (isFirstNumber) {
                  return true;
                }
              }
            }
          }
          
          return false;
        });
      }
      
      // Para EJA: implementar lógica acumulativa conforme especificado
      // Anos Iniciais (1º-5º Período): acumulação apenas para Língua Portuguesa e Matemática
      // Anos Finais (6º-9º Período): acumulação para todas as disciplinas
      
      const gradeIdsToInclude: string[] = [];
      
      if (periodoNum >= 1 && periodoNum <= 5) {
        // Anos Iniciais
        if (isLinguaPortuguesa || isMatematica) {
          // Acumulativo: buscar séries de 1 até periodoNum
          for (let year = 1; year <= periodoNum; year++) {
            const yearName = `${year}º Ano`;
            const grade = allGrades.find(g => {
              const gName = g.name.trim();
              const gNameLower = gName.toLowerCase();
              
              // Excluir Ensino Médio, Anos Finais e EJA
              if (gNameLower.includes('em') || gNameLower.includes('médio') || gNameLower.includes('medio') ||
                  gNameLower.includes('eja') || gNameLower.includes('período') || gNameLower.includes('periodo')) {
                return false;
              }
              
              // Verificar se corresponde ao ano
              const firstNumberMatch = gName.match(/^(\d+)/);
              if (firstNumberMatch) {
                const firstNumber = parseInt(firstNumberMatch[1], 10);
                if (firstNumber === year && gNameLower.includes('ano')) {
                  return true;
                }
              }
              
              // Verificar correspondência por nome
              return gName === yearName || 
                     gNameLower === `${year}º ano` ||
                     gNameLower === `${year}° ano` ||
                     gNameLower === `${year}o ano` ||
                     gNameLower === `${year} ano`;
            });
            
            if (grade) {
              gradeIdsToInclude.push(grade.id);
            }
          }
          
          console.log('EJA Anos Iniciais - Acumulativo (Língua Portuguesa/Matemática):', {
            periodo: currentGradeName,
            periodoNum,
            disciplina: normalizedSubjectName,
            gradeIdsIncluidos: gradeIdsToInclude.length,
            series: gradeIdsToInclude.map(id => {
              const g = allGrades.find(gr => gr.id === id);
              return g ? g.name : id;
            })
          });
        } else {
          // Não acumulativo: apenas o ano equivalente
          // Se targetGrade não foi encontrado, tentar buscar novamente
          let gradeToUse = targetGrade;
          if (!gradeToUse) {
            const yearName = `${periodoNum}º Ano`;
            gradeToUse = allGrades.find(g => {
              const gName = g.name.trim();
              const gNameLower = gName.toLowerCase();
              
              // Excluir Ensino Médio, Anos Finais e EJA
              if (gNameLower.includes('em') || gNameLower.includes('médio') || gNameLower.includes('medio') ||
                  gNameLower.includes('eja') || gNameLower.includes('período') || gNameLower.includes('periodo')) {
                return false;
              }
              
              // Verificar se corresponde ao ano
              const firstNumberMatch = gName.match(/^(\d+)/);
              if (firstNumberMatch) {
                const firstNumber = parseInt(firstNumberMatch[1], 10);
                if (firstNumber === periodoNum && firstNumber >= 1 && firstNumber <= 5 && gNameLower.includes('ano')) {
                  return true;
                }
              }
              
              // Verificar correspondência por nome
              return gName === yearName || 
                     gNameLower === `${periodoNum}º ano` ||
                     gNameLower === `${periodoNum}° ano` ||
                     gNameLower === `${periodoNum}o ano` ||
                     gNameLower === `${periodoNum} ano`;
            });
          }
          
          if (gradeToUse) {
            gradeIdsToInclude.push(gradeToUse.id);
            console.log('EJA Anos Iniciais - Não acumulativo (outras disciplinas):', {
              periodo: currentGradeName,
              periodoNum,
              disciplina: normalizedSubjectName,
              targetGradeId: gradeToUse.id,
              targetGradeName: gradeToUse.name
            });
          }
        }
      } else if (periodoNum >= 6 && periodoNum <= 9) {
        // Anos Finais - sempre acumulativo para todas as disciplinas
        for (let year = 6; year <= periodoNum; year++) {
          const yearName = `${year}º Ano`;
          const grade = allGrades.find(g => {
            const gName = g.name.trim();
            const gNameLower = gName.toLowerCase();
            
            // Excluir Ensino Médio e EJA
            if (gNameLower.includes('em') || gNameLower.includes('médio') || gNameLower.includes('medio') ||
                gNameLower.includes('eja') || gNameLower.includes('período') || gNameLower.includes('periodo')) {
              return false;
            }
            
            // Verificar se corresponde ao ano dos Anos Finais
            const firstNumberMatch = gName.match(/^(\d+)/);
            if (firstNumberMatch) {
              const firstNumber = parseInt(firstNumberMatch[1], 10);
              if (firstNumber === year && firstNumber >= 6 && firstNumber <= 9 && gNameLower.includes('ano')) {
                return true;
              }
            }
            
            // Verificar correspondência por nome
            return gName === yearName || 
                   gNameLower === `${year}º ano` ||
                   gNameLower === `${year}° ano` ||
                   gNameLower === `${year}o ano` ||
                   gNameLower === `${year} ano`;
          });
          
          if (grade) {
            gradeIdsToInclude.push(grade.id);
          }
        }
        
        console.log('EJA Anos Finais - Acumulativo (todas as disciplinas):', {
          periodo: currentGradeName,
          periodoNum,
          disciplina: normalizedSubjectName,
          gradeIdsIncluidos: gradeIdsToInclude.length,
          series: gradeIdsToInclude.map(id => {
            const g = allGrades.find(gr => gr.id === id);
            return g ? g.name : id;
          })
        });
      }
      
      // Retornar os IDs encontrados ou vazio se não encontrou nenhum
      if (gradeIdsToInclude.length > 0) {
        return gradeIdsToInclude;
      } else {
        const todasSeriesNomes = allGrades.map(g => g.name);
        console.error('EJA - Ano equivalente NÃO encontrado:', {
          periodo: currentGradeName,
          periodoNum,
          totalSeries: allGrades.length,
          todasSeriesNomes: todasSeriesNomes,
          todasSeries: allGrades.map(g => ({ id: g.id, name: g.name }))
        });
        return [];
      }
    }
    // Se não encontrou correspondência de período, NÃO usar o gradeId atual (que é EJA)
    // Retornar vazio para forçar busca alternativa
    return [];
  }

  // Extrair número do ano (ex: "2º Ano" -> 2)
  const yearMatch = normalizedGradeName.match(/(\d+)[º°]?\s*ano/i);
  if (!yearMatch) {
    return [currentGradeId];
  }

  const currentYearNum = parseInt(yearMatch[1], 10);

  // Verificar se é Anos Iniciais (1º ao 5º ano)
  const isAnosIniciais = currentYearNum >= 1 && currentYearNum <= 5;

  // Verificar se é Anos Finais (6º ao 9º ano)
  const isAnosFinais = currentYearNum >= 6 && currentYearNum <= 9;

  let gradeIdsToInclude: string[] = [];

  // Anos Iniciais: apenas para Língua Portuguesa e Matemática
  if (isAnosIniciais && (isLinguaPortuguesa || isMatematica)) {
    // Incluir anos de 1 até o ano atual
    for (let year = 1; year <= currentYearNum; year++) {
      const yearName = `${year}º Ano`;
      const grade = allGrades.find(g => 
        g.name.trim() === yearName || 
        g.name.trim().toLowerCase().includes(`${year}º ano`) ||
        g.name.trim().toLowerCase().includes(`${year}° ano`)
      );
      if (grade) {
        gradeIdsToInclude.push(grade.id);
      }
    }
  }
  // Anos Finais: todas as disciplinas
  else if (isAnosFinais) {
    // Incluir anos de 6 até o ano atual
    for (let year = 6; year <= currentYearNum; year++) {
      const yearName = `${year}º Ano`;
      const grade = allGrades.find(g => 
        g.name.trim() === yearName || 
        g.name.trim().toLowerCase().includes(`${year}º ano`) ||
        g.name.trim().toLowerCase().includes(`${year}° ano`)
      );
      if (grade) {
        gradeIdsToInclude.push(grade.id);
      }
    }
  }
  // Outros casos: retornar apenas a série atual
  else {
    return [currentGradeId];
  }

  // Se não encontrou nenhuma série correspondente, usar apenas a atual
  if (gradeIdsToInclude.length === 0) {
    return [currentGradeId];
  }

  return gradeIdsToInclude;
}

const SkillsSelector: React.FC<SkillsSelectorProps> = ({
  skills,
  selected,
  onChange,
  placeholder = "Selecionar habilidades BNCC",
  disabled = false,
  gradeId,
  gradeName,
  subjectId,
  subjectName,
  allGrades
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [skillSortBy, setSkillSortBy] = useState<'code-asc' | 'code-desc' | 'desc-asc' | 'desc-desc'>('code-asc');
  const fetchSkillsByGrade = useSkillsStore(s => s.fetchSkillsByGrade);
  const fetchSkillsByGrades = useSkillsStore(s => s.fetchSkillsByGrades);
  const fetchSkills = useSkillsStore(s => s.fetchSkills);
  const [loadedAllGrades, setLoadedAllGrades] = useState<Array<{ id: string; name: string }>>(allGrades || []);

  // Carregar todas as séries do sistema (importante para EJA encontrar séries dos Anos Iniciais)
  useEffect(() => {
    const loadAllGrades = async () => {
      try {
        const response = await api.get('/grades/');
        if (Array.isArray(response.data)) {
          setLoadedAllGrades(response.data);
          console.log('Todas as séries carregadas do sistema:', response.data.map(g => g.name));
        }
      } catch (error) {
        console.error('Erro ao carregar séries:', error);
        // Fallback: usar allGrades se fornecido
        if (allGrades) {
          setLoadedAllGrades(allGrades);
        }
      }
    };
    
    // Sempre carregar todas as séries do sistema para garantir que EJA encontre séries dos Anos Iniciais
    loadAllGrades();
  }, [allGrades]);

  // Lista efetiva de habilidades a exibir (aplica filtro por série quando disponível)
  const [effectiveSkills, setEffectiveSkills] = useState<Skill[]>(skills);

  useEffect(() => {
    let isMounted = true;
    const computeEffectiveSkills = async () => {
      if (!gradeId) {
        if (isMounted) setEffectiveSkills(skills);
        return;
      }

      try {
        // Verificar se é EJA mesmo sem gradeName/subjectName
        let isEJA = false;
        if (gradeName) {
          const normalizedLower = gradeName.toLowerCase().trim();
          isEJA = normalizedLower.includes('período') || 
                  normalizedLower.includes('periodo') ||
                  normalizedLower.includes('eja');
        }
        
        // Se ainda não detectou EJA, verificar nas séries carregadas
        if (!isEJA && gradeId && loadedAllGrades.length > 0) {
          const grade = loadedAllGrades.find(g => g.id === gradeId);
          if (grade) {
            const gradeNameLower = grade.name.toLowerCase();
            isEJA = gradeNameLower.includes('período') || 
                    gradeNameLower.includes('periodo') ||
                    gradeNameLower.includes('eja');
          }
        }

        // Se temos gradeName e subjectName, usar lógica acumulativa
        if (gradeName && subjectName && loadedAllGrades.length > 0) {
          let gradeIdsToInclude = getGradeIdsForCumulativeSkills(
            gradeId,
            gradeName,
            subjectName,
            loadedAllGrades
          );
          
          // Debug: verificar se EJA está retornando apenas uma série
          if (isEJA) {
            const targetGrade = loadedAllGrades.find(g => g.id === gradeIdsToInclude[0]);
            console.log('EJA - gradeIdsToInclude:', {
              periodo: gradeName,
              gradeIdsCount: gradeIdsToInclude.length,
              targetGradeId: gradeIdsToInclude[0],
              targetGradeName: targetGrade?.name,
              isEmpty: gradeIdsToInclude.length === 0
            });
          }

          // Se gradeIdsToInclude está vazio para EJA, tentar buscar diretamente pelo número do período
          if (isEJA && gradeIdsToInclude.length === 0 && loadedAllGrades.length > 0) {
            const periodoMatch = gradeName?.toLowerCase().match(/(\d+)[º°o]?\s*per[ií]odo/i);
            if (periodoMatch) {
              const periodoNum = parseInt(periodoMatch[1], 10);
              // Buscar série que corresponde ao número do período (1º Período = 1º Ano)
              const foundGrade = loadedAllGrades.find(g => {
                const gName = g.name.trim().toLowerCase();
                // Excluir EJA, Ensino Médio e Anos Finais
                if (gName.includes('eja') || gName.includes('período') || gName.includes('periodo') ||
                    gName.includes('em') || gName.includes('médio') || gName.includes('medio') ||
                    /[6789][º°o]?\s*ano/i.test(g.name)) {
                  return false;
                }
                // Verificar se corresponde ao número do período
                const numberMatch = g.name.match(/(\d+)/);
                if (numberMatch) {
                  const numberInName = parseInt(numberMatch[1], 10);
                  return numberInName === periodoNum && numberInName >= 1 && numberInName <= 5 && gName.includes('ano');
                }
                return false;
              });
              
              if (foundGrade) {
                gradeIdsToInclude = [foundGrade.id];
                console.log('EJA - Ano equivalente encontrado na busca alternativa:', {
                  periodo: gradeName,
                  periodoNum,
                  targetGradeId: foundGrade.id,
                  targetGradeName: foundGrade.name
                });
              }
            }
          }

          // Se precisar buscar múltiplas séries, usar fetchSkillsByGrades
          if (gradeIdsToInclude.length > 1) {
            // Para EJA com subjectId, buscar habilidades de cada série usando fetchSkills
            if (isEJA && subjectId) {
              try {
                const allSkillsPromises = gradeIdsToInclude.map(gradeId => fetchSkills(subjectId, gradeId));
                const allSkillsArrays = await Promise.all(allSkillsPromises);
                // Combinar todas as habilidades e remover duplicatas
                const allSkillsMap = new Map<string, Skill>();
                allSkillsArrays.forEach(skillsArray => {
                  skillsArray.forEach(skill => {
                    if (!allSkillsMap.has(skill.id)) {
                      allSkillsMap.set(skill.id, skill);
                    }
                  });
                });
                let cumulativeSkills = Array.from(allSkillsMap.values());
                
                // Se retornou muitas habilidades (possível fallback), filtrar usando fetchSkillsByGrades
                if (cumulativeSkills.length > 100) {
                  try {
                    const gradeOnlySkills = await fetchSkillsByGrades(gradeIdsToInclude);
                    if (gradeOnlySkills.length > 0) {
                      // Fazer interseção: habilidades que estão tanto na disciplina quanto nas séries
                      const gradeCodes = new Set(gradeOnlySkills.map(s => s.code));
                      const filteredSkills = cumulativeSkills.filter(s => gradeCodes.has(s.code));
                      
                      // Fallback: se não encontrou por código, tenta por id
                      if (filteredSkills.length === 0) {
                        const gradeIds = new Set(gradeOnlySkills.map(s => s.id));
                        cumulativeSkills = cumulativeSkills.filter(s => gradeIds.has(s.id));
                      } else {
                        cumulativeSkills = filteredSkills;
                      }
                    }
                  } catch (gradeError) {
                    console.warn('EJA detectado - erro ao filtrar habilidades por séries:', gradeError);
                  }
                }
                
                console.log('EJA detectado - usando fetchSkills para múltiplas séries:', {
                  periodo: gradeName,
                  subjectId,
                  gradeIdsToInclude,
                  skillsCount: cumulativeSkills.length,
                  skills: cumulativeSkills.slice(0, 3)
                });
                if (isMounted) setEffectiveSkills(cumulativeSkills);
              } catch (error) {
                console.error('Erro ao buscar habilidades para EJA (múltiplas séries):', error);
                // Fallback: usar lista inicial
                if (isMounted) setEffectiveSkills(skills);
              }
            } else {
              const cumulativeSkills = await fetchSkillsByGrades(gradeIdsToInclude);
              // Para EJA sem subjectId, filtrar habilidades do ano equivalente pela disciplina (usar códigos da lista inicial)
              if (isEJA) {
                // Filtrar habilidades do ano equivalente que estão na lista inicial (já filtrada por disciplina)
                const skillsCodes = new Set(skills.map(s => s.code));
                const filteredBySubject = cumulativeSkills.filter(s => skillsCodes.has(s.code));
                // Fallback: se não encontrou por código, tenta por id
                const filteredSkills = filteredBySubject.length > 0 
                  ? filteredBySubject 
                  : cumulativeSkills.filter(s => skills.some(origSkill => origSkill.id === s.id));
                
                console.log('EJA detectado - usando habilidades do ano equivalente (múltiplas, sem subjectId):', {
                  periodo: gradeName,
                  gradeIdsToInclude,
                  skillsIniciais: skills.length,
                  skillsAnoEquivalente: cumulativeSkills.length,
                  skillsFiltradas: filteredSkills.length,
                  skills: filteredSkills.slice(0, 3)
                });
                if (isMounted) setEffectiveSkills(filteredSkills);
              } else {
                const allowedCodes = new Set(cumulativeSkills.map(s => s.code));
                let intersected = skills.filter(s => allowedCodes.has(s.code));
                // Fallback: se não encontrou por código, tenta por id
                if (intersected.length === 0) {
                  const allowedIds = new Set(cumulativeSkills.map(s => s.id));
                  intersected = skills.filter(s => allowedIds.has(s.id));
                }
                if (isMounted) setEffectiveSkills(intersected);
              }
            }
          } else if (gradeIdsToInclude.length === 1) {
            // Usar o gradeId retornado pela função (pode ser diferente do original para EJA)
            const targetGradeId = gradeIdsToInclude[0];
            
            // Para EJA, buscar habilidades do ano equivalente e filtrar pela disciplina
            if (isEJA && subjectId) {
              try {
                // IMPORTANTE: Para EJA, sempre buscar habilidades por série primeiro
                // usando /skills/grade/<grade_id> que retorna habilidades daquela série específica
                const gradeOnlySkills = await fetchSkillsByGrade(targetGradeId);
                
                if (gradeOnlySkills.length > 0) {
                  // Filtrar habilidades do ano equivalente pela disciplina
                  // Usar a lista inicial de skills (já filtrada por disciplina) para fazer a interseção
                  const skillsCodes = new Set(skills.map(s => s.code));
                  const filteredBySubject = gradeOnlySkills.filter(s => skillsCodes.has(s.code));
                  
                  // Fallback: se não encontrou por código, tenta por id
                  let filteredSkills = filteredBySubject;
                  if (filteredSkills.length === 0) {
                    const skillsIds = new Set(skills.map(s => s.id));
                    filteredSkills = gradeOnlySkills.filter(s => skillsIds.has(s.id));
                  }
                  
                  console.log('EJA detectado - usando habilidades do ano equivalente filtradas por disciplina:', {
                    periodo: gradeName,
                    subjectId,
                    targetGradeId,
                    skillsAnoEquivalente: gradeOnlySkills.length,
                    skillsDisciplina: skills.length,
                    skillsFiltradas: filteredSkills.length,
                    skills: filteredSkills.slice(0, 3)
                  });
                  
                  if (isMounted) setEffectiveSkills(filteredSkills);
                } else {
                  // Se não encontrou habilidades por série, usar a lista inicial (já filtrada por disciplina)
                  console.warn('EJA detectado - fetchSkillsByGrade retornou vazio, usando lista inicial:', {
                    periodo: gradeName,
                    subjectId,
                    targetGradeId,
                    skillsCount: skills.length
                  });
                  if (isMounted) setEffectiveSkills(skills);
                }
              } catch (error) {
                console.error('Erro ao buscar habilidades para EJA:', error);
                // Fallback: usar lista inicial filtrada
                if (isMounted) setEffectiveSkills(skills);
              }
            } else {
              const gradeSkills = await fetchSkillsByGrade(targetGradeId);
              // Para EJA sem subjectId, filtrar habilidades do ano equivalente pela disciplina
              if (isEJA) {
                // Filtrar habilidades do ano equivalente que estão na lista inicial (já filtrada por disciplina)
                const skillsCodes = new Set(skills.map(s => s.code));
                const filteredBySubject = gradeSkills.filter(s => skillsCodes.has(s.code));
                // Fallback: se não encontrou por código, tenta por id
                const filteredSkills = filteredBySubject.length > 0 
                  ? filteredBySubject 
                  : gradeSkills.filter(s => skills.some(origSkill => origSkill.id === s.id));
                
                console.log('EJA detectado - usando habilidades do ano equivalente (single, sem subjectId):', {
                  periodo: gradeName,
                  targetGradeId,
                  skillsIniciais: skills.length,
                  skillsAnoEquivalente: gradeSkills.length,
                  skillsFiltradas: filteredSkills.length,
                  skills: filteredSkills.slice(0, 3)
                });
                if (isMounted) setEffectiveSkills(filteredSkills);
              } else {
                const allowedCodes = new Set(gradeSkills.map(s => s.code));
                let intersected = skills.filter(s => allowedCodes.has(s.code));
                // Fallback: se não encontrou por código, tenta por id
                if (intersected.length === 0) {
                  const allowedIds = new Set(gradeSkills.map(s => s.id));
                  intersected = skills.filter(s => allowedIds.has(s.id));
                }
                if (isMounted) setEffectiveSkills(intersected);
              }
            }
          } else if (gradeIdsToInclude.length === 0) {
            // Se não encontrou ano equivalente para EJA, não usar o gradeId do EJA
            // Tentar buscar diretamente pelo número do período
            if (isEJA) {
              const periodoMatch = gradeName?.toLowerCase().match(/(\d+)[º°o]?\s*per[ií]odo/i);
              if (periodoMatch && subjectId) {
                const periodoNum = parseInt(periodoMatch[1], 10);
                // Buscar série que corresponde ao número do período (1º Período = 1º Ano)
                const foundGrade = loadedAllGrades.find(g => {
                  const gName = g.name.trim().toLowerCase();
                  // Excluir EJA, Ensino Médio e Anos Finais
                  if (gName.includes('eja') || gName.includes('período') || gName.includes('periodo') ||
                      gName.includes('em') || gName.includes('médio') || gName.includes('medio') ||
                      /[6789][º°o]?\s*ano/i.test(g.name)) {
                    return false;
                  }
                  // Verificar se corresponde ao número do período
                  const numberMatch = g.name.match(/(\d+)/);
                  if (numberMatch) {
                    const numberInName = parseInt(numberMatch[1], 10);
                    return numberInName === periodoNum && numberInName >= 1 && numberInName <= 5 && gName.includes('ano');
                  }
                  return false;
                });
                
                if (foundGrade) {
                  try {
                    const gradeOnlySkills = await fetchSkillsByGrade(foundGrade.id);
                    if (gradeOnlySkills.length > 0) {
                      const skillsCodes = new Set(skills.map(s => s.code));
                      const filteredBySubject = gradeOnlySkills.filter(s => skillsCodes.has(s.code));
                      let filteredSkills = filteredBySubject;
                      if (filteredSkills.length === 0) {
                        const skillsIds = new Set(skills.map(s => s.id));
                        filteredSkills = gradeOnlySkills.filter(s => skillsIds.has(s.id));
                      }
                      console.log('EJA detectado - usando busca alternativa direta:', {
                        periodo: gradeName,
                        subjectId,
                        targetGradeId: foundGrade.id,
                        targetGradeName: foundGrade.name,
                        skillsFiltradas: filteredSkills.length
                      });
                      if (isMounted) setEffectiveSkills(filteredSkills);
                    } else {
                      console.warn('EJA detectado - busca alternativa retornou vazio, usando lista inicial:', {
                        periodo: gradeName,
                        targetGradeId: foundGrade.id
                      });
                      if (isMounted) setEffectiveSkills(skills);
                    }
                  } catch (error) {
                    console.error('Erro na busca alternativa para EJA:', error);
                    if (isMounted) setEffectiveSkills(skills);
                  }
                } else {
                  console.warn('EJA detectado - não encontrou ano equivalente, usando lista inicial:', {
                    periodo: gradeName,
                    periodoNum
                  });
                  if (isMounted) setEffectiveSkills(skills);
                }
              } else {
                console.warn('EJA detectado - não foi possível extrair número do período ou subjectId ausente, usando lista inicial');
                if (isMounted) setEffectiveSkills(skills);
              }
            } else {
              // Para não-EJA, usar comportamento padrão
              const gradeSkills = await fetchSkillsByGrade(gradeId);
              const allowedCodes = new Set(gradeSkills.map(s => s.code));
              let intersected = skills.filter(s => allowedCodes.has(s.code));
              if (intersected.length === 0) {
                const allowedIds = new Set(gradeSkills.map(s => s.id));
                intersected = skills.filter(s => allowedIds.has(s.id));
              }
              if (isMounted) setEffectiveSkills(intersected);
            }
          }
        } else if (isEJA && loadedAllGrades.length > 0) {
          // Para EJA sem gradeName/subjectName, tentar mapear período para ano
          const gradeIdsToInclude = getGradeIdsForCumulativeSkills(
            gradeId,
            gradeName || '',
            '',
            loadedAllGrades
          );
          
          if (gradeIdsToInclude.length > 1) {
            // Para EJA com subjectId, buscar habilidades de cada série usando fetchSkills
            if (isEJA && subjectId) {
              try {
                const allSkillsPromises = gradeIdsToInclude.map(gradeId => fetchSkills(subjectId, gradeId));
                const allSkillsArrays = await Promise.all(allSkillsPromises);
                // Combinar todas as habilidades e remover duplicatas
                const allSkillsMap = new Map<string, Skill>();
                allSkillsArrays.forEach(skillsArray => {
                  skillsArray.forEach(skill => {
                    if (!allSkillsMap.has(skill.id)) {
                      allSkillsMap.set(skill.id, skill);
                    }
                  });
                });
                const cumulativeSkills = Array.from(allSkillsMap.values());
                
                console.log('EJA detectado - usando fetchSkills para múltiplas séries (sem subjectName):', {
                  periodo: gradeName || 'N/A',
                  subjectId,
                  gradeIdsToInclude,
                  skillsCount: cumulativeSkills.length,
                  skills: cumulativeSkills.slice(0, 3)
                });
                if (isMounted) setEffectiveSkills(cumulativeSkills);
              } catch (error) {
                console.error('Erro ao buscar habilidades para EJA (múltiplas séries, sem subjectName):', error);
                // Fallback: usar lista inicial
                if (isMounted) setEffectiveSkills(skills);
              }
            } else {
              const cumulativeSkills = await fetchSkillsByGrades(gradeIdsToInclude);
              // Para EJA sem subjectId, filtrar pela lista inicial de skills (já filtrada por disciplina)
              const skillsCodes = new Set(skills.map(s => s.code));
              const filteredBySubject = cumulativeSkills.filter(s => skillsCodes.has(s.code));
              const filteredSkills = filteredBySubject.length > 0 
                ? filteredBySubject 
                : cumulativeSkills.filter(s => skills.some(origSkill => origSkill.id === s.id));
              console.log('EJA detectado - usando habilidades do ano equivalente (sem subjectId/subjectName, múltiplas):', {
                periodo: gradeName || 'N/A',
                gradeIdsToInclude,
                skillsIniciais: skills.length,
                skillsAnoEquivalente: cumulativeSkills.length,
                skillsFiltradas: filteredSkills.length
              });
              if (isMounted) setEffectiveSkills(filteredSkills);
            }
          } else {
            const targetGradeId = gradeIdsToInclude[0] || gradeId;
            
            // Para EJA, buscar habilidades do ano equivalente e filtrar pela disciplina
            if (isEJA && subjectId) {
              try {
                // IMPORTANTE: Para EJA, sempre buscar habilidades por série primeiro
                // usando /skills/grade/<grade_id> que retorna habilidades daquela série específica
                const gradeOnlySkills = await fetchSkillsByGrade(targetGradeId);
                
                if (gradeOnlySkills.length > 0) {
                  // Filtrar habilidades do ano equivalente pela disciplina
                  // Usar a lista inicial de skills (já filtrada por disciplina) para fazer a interseção
                  const skillsCodes = new Set(skills.map(s => s.code));
                  const filteredBySubject = gradeOnlySkills.filter(s => skillsCodes.has(s.code));
                  
                  // Fallback: se não encontrou por código, tenta por id
                  let filteredSkills = filteredBySubject;
                  if (filteredSkills.length === 0) {
                    const skillsIds = new Set(skills.map(s => s.id));
                    filteredSkills = gradeOnlySkills.filter(s => skillsIds.has(s.id));
                  }
                  
                  console.log('EJA detectado - usando habilidades do ano equivalente filtradas por disciplina (sem subjectName):', {
                    periodo: gradeName || 'N/A',
                    subjectId,
                    targetGradeId,
                    skillsAnoEquivalente: gradeOnlySkills.length,
                    skillsDisciplina: skills.length,
                    skillsFiltradas: filteredSkills.length,
                    skills: filteredSkills.slice(0, 3)
                  });
                  
                  if (isMounted) setEffectiveSkills(filteredSkills);
                } else {
                  // Se não encontrou habilidades por série, usar a lista inicial (já filtrada por disciplina)
                  console.warn('EJA detectado - fetchSkillsByGrade retornou vazio, usando lista inicial (sem subjectName):', {
                    periodo: gradeName || 'N/A',
                    subjectId,
                    targetGradeId,
                    skillsCount: skills.length
                  });
                  if (isMounted) setEffectiveSkills(skills);
                }
              } catch (error) {
                console.error('Erro ao buscar habilidades para EJA:', error);
                // Fallback: usar lista inicial filtrada
                if (isMounted) setEffectiveSkills(skills);
              }
            } else {
              const gradeSkills = await fetchSkillsByGrade(targetGradeId);
              // Para EJA sem subjectId, filtrar pela lista inicial de skills (já filtrada por disciplina)
              const skillsCodes = new Set(skills.map(s => s.code));
              const filteredBySubject = gradeSkills.filter(s => skillsCodes.has(s.code));
              const filteredSkills = filteredBySubject.length > 0 
                ? filteredBySubject 
                : gradeSkills.filter(s => skills.some(origSkill => origSkill.id === s.id));
              console.log('EJA detectado - usando habilidades do ano equivalente (sem subjectId/subjectName):', {
                periodo: gradeName || 'N/A',
                targetGradeId,
                skillsIniciais: skills.length,
                skillsAnoEquivalente: gradeSkills.length,
                skillsFiltradas: filteredSkills.length,
                skills: filteredSkills.slice(0, 3)
              });
              if (isMounted) setEffectiveSkills(filteredSkills);
            }
          }
        } else {
          // Comportamento padrão: buscar apenas uma série
          const gradeSkills = await fetchSkillsByGrade(gradeId);
          const allowedCodes = new Set(gradeSkills.map(s => s.code));
          let intersected = skills.filter(s => allowedCodes.has(s.code));
          // Fallback: se não encontrou por código, tenta por id
          if (intersected.length === 0) {
            const allowedIds = new Set(gradeSkills.map(s => s.id));
            intersected = skills.filter(s => allowedIds.has(s.id));
          }
          if (isMounted) setEffectiveSkills(intersected);
        }
      } catch {
        if (isMounted) setEffectiveSkills([]);
      }
    };
    computeEffectiveSkills();
    return () => { isMounted = false; };
  }, [skills, gradeId, gradeName, subjectId, subjectName, loadedAllGrades, fetchSkillsByGrade, fetchSkillsByGrades, fetchSkills]);

  // Agrupar habilidades por categoria (prefixo do código)
  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    effectiveSkills.forEach(skill => {
      // Garantir que a habilidade tenha code válido
      if (!skill.code) {
        console.warn('Habilidade sem código:', skill);
        return;
      }
      const prefix = skill.code.split('.')[0] || skill.code.split('-')[0] || 'Outros';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(skill);
    });
    return groups;
  }, [effectiveSkills]);

  // Filtrar habilidades por busca
  const filteredSkills = useMemo(() => {
    if (!searchTerm) return effectiveSkills;
    
    const searchLower = searchTerm.toLowerCase();
    
    return effectiveSkills.filter(skill => {
      return skill.code.toLowerCase().includes(searchLower) ||
             skill.description.toLowerCase().includes(searchLower);
    });
  }, [effectiveSkills, searchTerm]);

  // Habilidades filtradas agrupadas, com filtro de categorias e ordenação
  const filteredGroupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    filteredSkills.forEach(skill => {
      if (!skill.code) return;
      const prefix = skill.code.split('.')[0] || skill.code.split('-')[0] || 'Outros';
      if (selectedCategories.length > 0 && !selectedCategories.includes(prefix)) return;
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(skill);
    });
    const sortFn = (a: Skill, b: Skill) => {
      switch (skillSortBy) {
        case 'code-asc': return a.code.localeCompare(b.code);
        case 'code-desc': return b.code.localeCompare(a.code);
        case 'desc-asc': return a.description.localeCompare(b.description);
        case 'desc-desc': return b.description.localeCompare(a.description);
        default: return 0;
      }
    };
    const sorted: Record<string, Skill[]> = {};
    Object.entries(groups).forEach(([cat, items]) => {
      sorted[cat] = [...items].sort(sortFn);
    });
    return sorted;
  }, [filteredSkills, selectedCategories, skillSortBy]);

  const categoriesForPicker = useMemo(
    () => Object.entries(groupedSkills).map(([name, items]) => ({ name, count: items.length })),
    [groupedSkills]
  );

  const handleToggleSkill = (skillId: string) => {
    // Seleção única: se já está selecionado, desmarca; senão, seleciona apenas este
    const newSelected = selected.includes(skillId)
      ? [] // Desmarca se já estava selecionado
      : [skillId]; // Seleciona apenas este (remove outros)
    onChange(newSelected);
  };

  const selectedSkills = effectiveSkills.filter(skill => selected.includes(skill.id));

  return (
    <>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full justify-between min-h-[44px] h-auto py-2 text-left"
      >
        <div className="flex items-center gap-2 flex-1">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
             {selected.length > 0 ? (
               <div className="flex items-center gap-1">
                 {selectedSkills.map(skill => (
                   <Badge key={skill.id} variant="secondary" className="text-xs">
                     {skill.code}
                   </Badge>
                 ))}
               </div>
             ) : (
               <span className="text-muted-foreground">{placeholder}</span>
             )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-xs" aria-label={`${selected.length} habilidade(s) selecionada(s)`}>
              {selected.length}
            </Badge>
          )}
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      </Button>

      {/* Skills Selection Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="skills-selector-dialog w-[95vw] max-w-7xl h-[90vh] max-h-[900px] p-0 bg-background shadow-2xl border border-border overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-background border-b border-border relative z-10 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Selecionar Habilidades da BNCC</span>
              <span className="sm:hidden">Habilidades BNCC</span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row h-[calc(100%-60px)] sm:h-[calc(100%-80px)] bg-background relative overflow-hidden">
            {/* Sidebar de Categorias - Oculta em mobile, visível em desktop */}
            <div className="skills-sidebar hidden lg:flex lg:w-64 xl:w-72 border-r bg-muted/50 flex-col shrink-0 min-h-0 overflow-hidden">
              <div className="p-3 xl:p-4 border-b shrink-0">
                <h4 className="font-semibold text-sm text-foreground mb-3">Categorias</h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start mb-2"
                  onClick={() => setCategoryPickerOpen(true)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Buscar categorias...
                </Button>
                <button
                  onClick={() => setSelectedCategories([])}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    selectedCategories.length === 0 
                      ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>Todas</span>
                    <Badge variant="outline" className="text-xs">
                      {effectiveSkills.length}
                    </Badge>
                  </div>
                </button>
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto p-2 xl:p-3">
                <div className="space-y-1">
                  {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategories(prev => 
                        prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
                      )}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                        selectedCategories.includes(category) 
                          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-left truncate">{category}</span>
                        <Badge variant="outline" className="text-xs ml-2 shrink-0">
                          {categorySkills.length}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <CategoryPickerModal
              open={categoryPickerOpen}
              onOpenChange={setCategoryPickerOpen}
              categories={categoriesForPicker}
              selected={selectedCategories}
              onConfirm={setSelectedCategories}
              title="Buscar categorias"
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Search and Controls */}
              <div className="p-3 sm:p-4 border-b bg-background space-y-3 sm:space-y-4 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground truncate">
                      {selectedCategories.length === 0 
                        ? 'Todas as Habilidades' 
                        : selectedCategories.length === 1 
                        ? selectedCategories[0] 
                        : `${selectedCategories.length} categorias`}
                    </span>
                  </div>
                  
                  {/* Mobile: Buscar categorias */}
                  <div className="lg:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setCategoryPickerOpen(true)}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      Buscar categorias
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Select value={skillSortBy} onValueChange={(v: typeof skillSortBy) => setSkillSortBy(v)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="code-asc">Código (A-Z)</SelectItem>
                        <SelectItem value="code-desc">Código (Z-A)</SelectItem>
                        <SelectItem value="desc-asc">Descrição (A-Z)</SelectItem>
                        <SelectItem value="desc-desc">Descrição (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="hidden sm:flex"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="hidden sm:flex"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input
                       placeholder="Buscar por código ou descrição..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="pl-10"
                     />
                  </div>
                   {selected.length > 0 && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => onChange([])}
                       className="flex items-center gap-1 shrink-0"
                     >
                       <X className="h-3 w-3" />
                       <span className="hidden sm:inline">Limpar</span>
                     </Button>
                   )}
                </div>
              </div>

              {/* Skills List */}
              <div className="flex-1 overflow-hidden relative">
                <ScrollArea className="skills-scroll-area h-full">
                  <div className="p-3 sm:p-4 space-y-4 sm:space-y-6">
                    {Object.keys(filteredGroupedSkills).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <p className="text-lg font-medium text-foreground mb-2">
                          Nenhuma habilidade encontrada
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {effectiveSkills.length === 0 
                            ? "Não há habilidades disponíveis para esta série e disciplina."
                            : "Tente ajustar os filtros de busca."}
                        </p>
                      </div>
                    ) : (
                      Object.entries(filteredGroupedSkills)
                        .map(([category, categorySkills]) => (
                      <div key={category}>
                        <div className="skills-category-header flex items-center gap-2 mb-3 sticky top-0 bg-background z-20 py-2 sm:py-3 border-b border-border -mx-3 sm:-mx-4 px-3 sm:px-4 backdrop-blur-sm">
                          <h4 className="font-semibold text-sm sm:text-base text-foreground">{category}</h4>
                           <Badge variant="outline" className="text-xs bg-muted">
                             {categorySkills.filter(skill => selected.includes(skill.id)).length > 0 ? '1' : '0'} / {categorySkills.length}
                           </Badge>
                        </div>

                        <div className={cn(
                          "gap-2 sm:gap-3",
                          viewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" 
                            : "space-y-2"
                        )}>
                          {categorySkills.map(skill => {
                            const isSelected = selected.includes(skill.id);
                            return (
                              <div
                                key={skill.id}
                                onClick={() => handleToggleSkill(skill.id)}
                                className={cn(
                                  "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md active:scale-95",
                                  isSelected 
                                    ? "skill-item-selected border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/50 shadow-sm" 
                                    : "border-border hover:border-border/80",
                                  viewMode === 'grid' ? "text-center" : "flex items-start gap-3"
                                )}
                              >
                                <div className={cn(
                                  "flex items-center",
                                  viewMode === 'grid' ? "justify-center mb-2" : "mt-1 shrink-0"
                                )}>
                                  <div className={cn(
                                    "w-4 h-4 border-2 rounded flex items-center justify-center",
                                    isSelected 
                                      ? "border-blue-500 dark:border-blue-400 bg-blue-500 dark:bg-blue-600" 
                                      : "border-border"
                                  )}>
                                    {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                  </div>
                                </div>

                                 <div className={cn("flex-1 min-w-0", viewMode === 'grid' && "text-center")}>
                                   <div className="font-mono text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1 break-all">
                                     {skill.code}
                                   </div>
                                   <div className="text-xs sm:text-sm text-foreground leading-tight">
                                     {skill.description}
                                   </div>
                                 </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                    )}
                    
                    {/* Padding bottom para evitar que o footer sobreponha conteúdo */}
                    <div className="h-4" />
                  </div>
                </ScrollArea>
              </div>

              {/* Footer */}
              <div className="skills-footer p-3 sm:p-4 border-t bg-background shadow-lg shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                   <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                     {selected.length > 0 ? (
                       <span className="font-medium text-blue-600 dark:text-blue-400">1 habilidade selecionada</span>
                     ) : (
                       <span>Nenhuma habilidade selecionada</span>
                     )}
                   </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
                      Cancelar
                    </Button>
                    <Button onClick={() => setOpen(false)} className="bg-blue-600 hover:bg-blue-700 shadow-md flex-1 sm:flex-none">
                      Confirmar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SkillsSelector; 