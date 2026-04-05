import { useMemo, useRef, useState } from "react";
import { BracesIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface TemplateVariableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  rows?: number;
  placeholder?: string;
}

function toPlaceholder(variable: string): string {
  return `{{${variable}}}`;
}

export function TemplateVariableTextarea({
  value,
  onChange,
  variables,
  rows = 4,
  placeholder,
}: TemplateVariableTextareaProps) {
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sortedVars = useMemo(() => [...new Set(variables)].sort(), [variables]);

  const insertVariable = (variable: string) => {
    const token = toPlaceholder(variable);
    const target = textareaRef.current;
    if (!target) {
      onChange(`${value}${token}`);
      return;
    }

    const start = target.selectionStart ?? value.length;
    const end = target.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      const cursor = start + token.length;
      target.focus();
      target.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <PlusIcon className="size-3.5" />
              插入变量
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <PopoverHeader className="px-3 pt-3 pb-1">
              <PopoverTitle className="flex items-center gap-2 text-sm">
                <BracesIcon className="size-4" />
                变量选择器
              </PopoverTitle>
            </PopoverHeader>
            <Command>
              <CommandInput placeholder="搜索变量..." />
              <CommandList>
                <CommandEmpty>未找到变量</CommandEmpty>
                <CommandGroup>
                  {sortedVars.map(variable => (
                    <CommandItem
                      key={variable}
                      value={variable}
                      onSelect={() => {
                        insertVariable(variable);
                        setOpen(false);
                      }}
                    >
                      <span className="font-mono text-xs">{toPlaceholder(variable)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
