import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface FormOption {
  id: string;
  name: string;
}

interface FormMultiSelectProps {
  options: FormOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  className?: string;
}

export function FormMultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder,
  className,
}: FormMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const selectedOptions = React.useMemo(() => {
    return options.filter((option) => selected.includes(option.id));
  }, [options, selected]);

  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleSelect = React.useCallback(
    (optionId: string) => {
      const newSelected = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      onChange(newSelected);
    },
    [selected, onChange]
  );

  const handleRemove = React.useCallback(
    (optionId: string) => {
      onChange(selected.filter((id) => id !== optionId));
    },
    [selected, onChange]
  );

  const handleSelectAll = React.useCallback(() => {
    if (selected.length === filteredOptions.length) {
      onChange([]);
    } else {
      onChange(filteredOptions.map((opt) => opt.id));
    }
  }, [selected.length, filteredOptions, onChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecionar Opções</DialogTitle>
            {/* Descrição simples para acessibilidade do DialogContent */}
            <p className="text-sm text-muted-foreground">
              Use a busca para filtrar e selecione uma ou mais opções da lista.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Command className="rounded-lg border">
                <CommandInput
                  placeholder="Buscar..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={handleSelectAll}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected.length === filteredOptions.length &&
                            filteredOptions.length > 0
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {selected.length === filteredOptions.length &&
                      filteredOptions.length > 0
                        ? "Desmarcar Todas"
                        : "Selecionar Todas"}
                    </CommandItem>
                    {filteredOptions.map((option) => {
                      const isSelected = selected.includes(option.id);
                      return (
                        <CommandItem
                          key={option.id}
                          onSelect={() => handleSelect(option.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.name}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            {selected.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {selected.length} de {options.length} selecionado(s)
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full justify-between min-h-[44px] h-auto py-2",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2 flex-1 text-left min-w-0">
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-w-full min-w-0">
              {selectedOptions.slice(0, 3).map((option) => (
                <Badge
                  key={option.id}
                  variant="secondary"
                  className="text-xs max-w-[120px] truncate"
                  title={option.name}
                >
                  {option.name.length > 15
                    ? option.name.substring(0, 15) + "..."
                    : option.name}
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
              {selected.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{selected.length - 3} mais
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground truncate">
              {placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {selected.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selected.length}
            </Badge>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </div>
      </Button>
    </>
  );
}

