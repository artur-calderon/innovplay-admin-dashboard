import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Smile } from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  color?: string;
}

// Ícones organizados por categoria
const iconCategories = {
  'Competição': ['🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '⭐', '🌟', '💫', '✨'],
  'Educação': ['📚', '📖', '📝', '✏️', '🎓', '🎒', '📐', '📏', '🔬', '🧪'],
  'Matemática': ['🧮', '➕', '➖', '✖️', '➗', '📊', '📈', '🔢', '💯', '🎯'],
  'Ciências': ['🌍', '🌎', '🌏', '🔭', '🧬', '⚗️', '🧲', '💡', '🔋', '⚡'],
  'Esportes': ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎯', '🏃', '🚴'],
  'Natureza': ['🌸', '🌺', '🌻', '🌹', '🌴', '🌲', '🍀', '🌈', '☀️', '🌙'],
  'Animais': ['🦁', '🐯', '🐻', '🦊', '🦉', '🦅', '🐬', '🦋', '🐝', '🐢'],
  'Foguetes': ['🚀', '🛸', '🌠', '💥', '🔥', '⚡', '💪', '🎪', '🎨', '🎭'],
};

export const IconPicker = ({ value, onChange, color = '#3B82F6' }: IconPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (icon: string) => {
    onChange(icon);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full h-14 justify-start gap-3"
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-md text-xl"
          style={{ backgroundColor: color }}
        >
          {value}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">Ícone selecionado</span>
          <span className="text-xs text-muted-foreground">Clique para alterar</span>
        </div>
        <Smile className="w-4 h-4 ml-auto text-muted-foreground" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smile className="w-5 h-5" />
              Escolher Ícone
            </DialogTitle>
            <DialogDescription>
              Selecione um ícone para representar a competição
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {Object.entries(iconCategories).map(([category, icons]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{category}</p>
                <div className="flex gap-2 flex-wrap">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => handleSelect(icon)}
                      className={cn(
                        "w-11 h-11 rounded-lg border-2 text-xl transition-all duration-200",
                        "hover:scale-110 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2",
                        "flex items-center justify-center",
                        value === icon 
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950 scale-110" 
                          : "border-transparent bg-muted/50"
                      )}
                      title={icon}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-2xl"
              style={{ backgroundColor: color }}
            >
              {value}
            </div>
            <div>
              <p className="text-sm font-medium">Preview do Card</p>
              <p className="text-xs text-muted-foreground">Como ficará na competição</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IconPicker;


