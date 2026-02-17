import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategorySortOption =
  | "name-asc"
  | "name-desc"
  | "count-asc"
  | "count-desc";

export interface CategoryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Array<{ name: string; count: number }>;
  selected: string[];
  onConfirm: (selected: string[]) => void;
  title?: string;
}

const SORT_OPTIONS: { value: CategorySortOption; label: string }[] = [
  { value: "name-asc", label: "Nome (A-Z)" },
  { value: "name-desc", label: "Nome (Z-A)" },
  { value: "count-desc", label: "Quantidade (maior)" },
  { value: "count-asc", label: "Quantidade (menor)" },
];

const CategoryPickerModal = ({
  open,
  onOpenChange,
  categories,
  selected,
  onConfirm,
  title = "Buscar categorias",
}: CategoryPickerModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<CategorySortOption>("name-asc");
  const [pendingSelected, setPendingSelected] = useState<Set<string>>(new Set(selected));

  React.useEffect(() => {
    if (open) {
      setPendingSelected(new Set(selected));
    }
  }, [open, selected]);

  const filteredAndSortedCategories = useMemo(() => {
    let list = categories;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(term));
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "count-asc":
          return a.count - b.count;
        case "count-desc":
          return b.count - a.count;
        default:
          return 0;
      }
    });
  }, [categories, searchTerm, sortBy]);

  const handleToggle = (name: string) => {
    setPendingSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setPendingSelected(
      new Set(filteredAndSortedCategories.map((c) => c.name))
    );
  };

  const handleDeselectAll = () => {
    setPendingSelected(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(pendingSelected));
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPendingSelected(new Set(selected));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-3 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Ordenar:</span>
            <div className="flex flex-wrap gap-1">
              {SORT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={sortBy === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Selecionar visíveis
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">
          <div className="space-y-1 pr-2">
            {filteredAndSortedCategories.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhuma categoria encontrada.
              </p>
            ) : (
              filteredAndSortedCategories.map((cat) => (
                <label
                  key={cat.name}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                  )}
                >
                  <Checkbox
                    checked={pendingSelected.has(cat.name)}
                    onCheckedChange={() => handleToggle(cat.name)}
                  />
                  <span className="flex-1 font-medium truncate">{cat.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {cat.count} itens
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t shrink-0">
          <span className="text-sm text-muted-foreground mr-auto">
            {pendingSelected.size} categoria{pendingSelected.size !== 1 ? "s" : ""} selecionada{pendingSelected.size !== 1 ? "s" : ""}
          </span>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryPickerModal;
