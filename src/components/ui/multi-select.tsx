import * as React from "react";
import { Check, ChevronsUpDown, X, Search, Filter, List, Grid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Option {
  id: string;
  name: string;
  code?: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  label?: string;
  className?: string;
  mode?: 'popover' | 'dialog'; // Novo modo para listas grandes
  maxDisplayItems?: number;
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder,
  label,
  className,
  mode = 'dialog', // Padrão como dialog para melhor UX
  maxDisplayItems = 3,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');

  const selectedOptions = React.useMemo(() => {
    return options.filter((option) => selected.includes(option.id));
  }, [options, selected]);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) => 
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.code && option.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  const handleSelect = React.useCallback((optionId: string) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter((id) => id !== optionId)
      : [...selected, optionId];
    onChange(newSelected);
  }, [selected, onChange]);

  const handleRemove = React.useCallback((optionId: string) => {
    onChange(selected.filter((id) => id !== optionId));
  }, [selected, onChange]);

  const groupOptionsByPrefix = React.useMemo(() => {
    const groups: Record<string, Option[]> = {};
    filteredOptions.forEach(option => {
      if (option.code) {
        const prefix = option.code.split('.')[0] || 'Outros';
        if (!groups[prefix]) groups[prefix] = [];
        groups[prefix].push(option);
      } else {
        if (!groups['Outros']) groups['Outros'] = [];
        groups['Outros'].push(option);
      }
    });
    return groups;
  }, [filteredOptions]);

  // Renderizar trigger compacto
  const renderTrigger = () => (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="w-full justify-between min-h-[44px] h-auto py-2"
      onClick={() => setOpen(true)}
    >
      <div className="flex items-center gap-2 flex-1 text-left">
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-full">
            {selectedOptions.slice(0, maxDisplayItems).map((option) => (
              <Badge
                key={option.id}
                variant="secondary"
                className="text-xs max-w-[120px] truncate"
                title={option.name}
              >
                {option.code || option.name.substring(0, 8)}
                <div
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRemove(option.id);
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </div>
              </Badge>
            ))}
            {selected.length > maxDisplayItems && (
              <Badge variant="outline" className="text-xs">
                +{selected.length - maxDisplayItems} mais
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>
      <div className="flex items-center gap-1 ml-2">
        {selected.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selected.length}
          </Badge>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    </Button>
  );

  // Renderizar conteúdo do dialog (sidebar)
  const renderDialogContent = () => (
    <div className="flex h-[600px]">
      {/* Sidebar de categorias */}
      <div className="w-48 border-r bg-gray-50">
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm text-gray-700">Categorias</h4>
        </div>
        <ScrollArea className="h-[calc(100%-60px)]">
          <div className="p-2 space-y-1">
            {Object.keys(groupOptionsByPrefix).map((prefix) => (
              <div
                key={prefix}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => {
                  document.getElementById(`group-${prefix}`)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  });
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{prefix}</span>
                  <Badge variant="outline" className="text-xs">
                    {groupOptionsByPrefix[prefix].length}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col">
        {/* Header com busca e controles */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Selecionar Habilidades</h3>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors flex items-center justify-center",
                  viewMode === 'list' 
                    ? "bg-primary text-primary-foreground" 
                    : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </div>
              <div
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors flex items-center justify-center",
                  viewMode === 'grid' 
                    ? "bg-primary text-primary-foreground" 
                    : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar habilidades por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {selected.length > 0 && (
              <div
                className="px-3 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm cursor-pointer transition-colors"
                onClick={() => onChange([])}
              >
                Limpar ({selected.length})
              </div>
            )}
          </div>
        </div>

        {/* Lista de habilidades */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {Object.entries(groupOptionsByPrefix).map(([prefix, groupOptions]) => (
              <div key={prefix} id={`group-${prefix}`}>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-semibold text-gray-700">{prefix}</h4>
                  <Badge variant="outline" className="text-xs">
                    {groupOptions.filter(opt => selected.includes(opt.id)).length} / {groupOptions.length}
                  </Badge>
                </div>
                
                <div className={cn(
                  "gap-2",
                  viewMode === 'grid' 
                    ? "grid grid-cols-2 lg:grid-cols-3" 
                    : "space-y-2"
                )}>
                  {groupOptions.map((option) => {
                    const isSelected = selected.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={cn(
                          "border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md",
                          isSelected 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 hover:border-gray-300",
                          viewMode === 'grid' ? "text-center" : "flex items-start gap-3"
                        )}
                        onClick={() => handleSelect(option.id)}
                      >
                        <div className={cn(
                          "flex items-center",
                          viewMode === 'grid' ? "justify-center mb-2" : "mt-0.5"
                        )}>
                          <div className={cn(
                            "w-4 h-4 border-2 rounded flex items-center justify-center",
                            isSelected 
                              ? "border-blue-500 bg-blue-500" 
                              : "border-gray-300"
                          )}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                        </div>
                        
                        <div className={cn("flex-1", viewMode === 'grid' && "text-center")}>
                          {option.code && (
                            <div className="font-mono text-sm font-semibold text-blue-600">
                              {option.code}
                            </div>
                          )}
                          <div className="text-sm text-gray-700 leading-tight">
                            {option.name.replace(option.code + ' - ', '')}
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

        {/* Footer com ações */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selected.length} de {options.length} habilidades selecionadas
            </div>
            <div className="flex gap-2">
              <div 
                className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm cursor-pointer transition-colors"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </div>
              <div 
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm cursor-pointer transition-colors"
                onClick={() => setOpen(false)}
              >
                Confirmar Seleção
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar popover (modo antigo para compatibilidade)
  const renderPopoverContent = () => (
    <PopoverContent className="w-80 p-0">
      <Command>
        <CommandInput placeholder="Buscar..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.id}
                onSelect={() => handleSelect(option.id)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.includes(option.id) ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1">
                  {option.code && (
                    <div className="font-mono text-xs text-blue-600">
                      {option.code}
                    </div>
                  )}
                  <div className="text-sm">
                    {option.name.replace(option.code + ' - ', '')}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      
      {mode === 'dialog' ? (
        <>
          {renderTrigger()}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-5xl h-[700px] p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Selecionar Habilidades BNCC
                </DialogTitle>
              </DialogHeader>
              {renderDialogContent()}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {renderTrigger()}
          </PopoverTrigger>
          {renderPopoverContent()}
        </Popover>
      )}
    </div>
  );
} 