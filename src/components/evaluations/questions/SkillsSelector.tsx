import React, { useState, useMemo } from 'react';
import { Check, Search, Filter, Grid, List, X, Target, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import './SkillsSelector.css';

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
}

const SkillsSelector: React.FC<SkillsSelectorProps> = ({
  skills,
  selected,
  onChange,
  placeholder = "Selecionar habilidades BNCC",
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Agrupar habilidades por categoria (prefixo do código)
  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    skills.forEach(skill => {
      const prefix = skill.code.split('.')[0] || 'Outros';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(skill);
    });
    return groups;
  }, [skills]);

  // Filtrar habilidades por busca
  const filteredSkills = useMemo(() => {
    if (!searchTerm) return skills;
    return skills.filter(skill => 
      skill.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [skills, searchTerm]);

  // Habilidades filtradas agrupadas
  const filteredGroupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    filteredSkills.forEach(skill => {
      const prefix = skill.code.split('.')[0] || 'Outros';
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(skill);
    });
    return groups;
  }, [filteredSkills]);

  const handleToggleSkill = (skillId: string) => {
    const newSelected = selected.includes(skillId)
      ? selected.filter(id => id !== skillId)
      : [...selected, skillId];
    onChange(newSelected);
  };

  const selectedSkills = skills.filter(skill => selected.includes(skill.id));

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
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex-1">
            {selected.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedSkills.slice(0, 3).map(skill => (
                  <Badge key={skill.id} variant="secondary" className="text-xs">
                    {skill.code}
                  </Badge>
                ))}
                {selected.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selected.length - 3} mais
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selected.length}
            </Badge>
          )}
          <Search className="h-4 w-4" />
        </div>
      </Button>

      {/* Skills Selection Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="skills-selector-dialog max-w-6xl h-[85vh] p-0 bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-white border-b border-gray-200 relative z-10">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Selecionar Habilidades da BNCC
            </DialogTitle>
          </DialogHeader>

          <div className="flex h-[calc(100%-80px)] bg-white relative">
            {/* Sidebar de Categorias */}
            <div className="skills-sidebar w-56 border-r bg-gray-50 flex flex-col">
              <div className="p-4 border-b">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Categorias</h4>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      selectedCategory === null 
                        ? "bg-blue-100 text-blue-700 font-medium" 
                        : "hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span>Todas</span>
                      <Badge variant="outline" className="text-xs">
                        {skills.length}
                      </Badge>
                    </div>
                  </button>
                </div>
              </div>
              
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                        selectedCategory === category 
                          ? "bg-blue-100 text-blue-700 font-medium" 
                          : "hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category}</span>
                        <Badge variant="outline" className="text-xs">
                          {categorySkills.length}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Search and Controls */}
              <div className="p-4 border-b bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-700">
                      {selectedCategory || 'Todas as Habilidades'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por código (ex: EF02MA01) ou descrição..."
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
                      className="flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Limpar ({selected.length})
                    </Button>
                  )}
                </div>
              </div>

              {/* Skills List */}
              <ScrollArea className="skills-scroll-area flex-1 p-4 bg-white">
                <div className="space-y-6">
                  {Object.entries(filteredGroupedSkills)
                    .filter(([category]) => !selectedCategory || category === selectedCategory)
                    .map(([category, categorySkills]) => (
                    <div key={category}>
                      <div className="skills-category-header flex items-center gap-2 mb-3 sticky top-0 bg-white z-20 py-3 border-b border-gray-100 -mx-4 px-4">
                        <h4 className="font-semibold text-gray-700">{category}</h4>
                        <Badge variant="outline" className="text-xs bg-gray-100">
                          {categorySkills.filter(skill => selected.includes(skill.id)).length} / {categorySkills.length}
                        </Badge>
                      </div>

                      <div className={cn(
                        "gap-3",
                        viewMode === 'grid' 
                          ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" 
                          : "space-y-2"
                      )}>
                                                 {categorySkills.map(skill => {
                           const isSelected = selected.includes(skill.id);
                           return (
                             <div
                               key={skill.id}
                               onClick={() => handleToggleSkill(skill.id)}
                               className={cn(
                                 "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
                                 isSelected 
                                   ? "skill-item-selected border-blue-500 bg-blue-50 shadow-sm" 
                                   : "border-gray-200 hover:border-gray-300",
                                 viewMode === 'grid' ? "text-center" : "flex items-start gap-3"
                               )}
                             >
                              <div className={cn(
                                "flex items-center",
                                viewMode === 'grid' ? "justify-center mb-2" : "mt-1"
                              )}>
                                <div className={cn(
                                  "w-4 h-4 border-2 rounded flex items-center justify-center shrink-0",
                                  isSelected 
                                    ? "border-blue-500 bg-blue-500" 
                                    : "border-gray-300"
                                )}>
                                  {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                </div>
                              </div>

                              <div className={cn("flex-1 min-w-0", viewMode === 'grid' && "text-center")}>
                                <div className="font-mono text-sm font-semibold text-blue-600 mb-1">
                                  {skill.code}
                                </div>
                                <div className="text-sm text-gray-700 leading-tight">
                                  {skill.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="skills-footer p-4 border-t bg-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">{selected.length}</span> de {skills.length} habilidades selecionadas
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setOpen(false)} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                      Confirmar Seleção
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