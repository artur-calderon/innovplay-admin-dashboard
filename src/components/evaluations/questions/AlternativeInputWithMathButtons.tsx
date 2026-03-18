import React, { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface AlternativeInputWithMathButtonsProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (el: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") ref(el);
      else (ref as React.MutableRefObject<T | null>).current = el;
    });
  };
}

export const AlternativeInputWithMathButtons = React.forwardRef<
  HTMLInputElement,
  AlternativeInputWithMathButtonsProps
>(function AlternativeInputWithMathButtons(
  { value, onChange, className, ...rest },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = useCallback(
    (char: string) => {
      const input = inputRef.current;
      if (!input) return;
      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const newVal = value.slice(0, start) + char + value.slice(end);
      onChange(newVal);
      setTimeout(() => {
        input.focus();
        const pos = start + char.length;
        input.setSelectionRange(pos, pos);
      }, 0);
    },
    [value, onChange]
  );

  return (
    <div className="flex items-center gap-2 w-full">
      <Input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        ref={mergeRefs(ref, inputRef)}
        className={className ? `${className} flex-1 min-w-0` : "flex-1 min-w-0"}
      />
      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 font-semibold"
              onClick={() => insertAtCursor("²")}
              aria-label="Inserir sobrescrito (²)"
            >
              x²
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Inserir sobrescrito (²)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => insertAtCursor("√")}
              aria-label="Inserir raiz quadrada (√)"
            >
              <span className="text-base font-medium" style={{ fontFamily: "serif" }}>
                √
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Inserir raiz quadrada (√)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});
