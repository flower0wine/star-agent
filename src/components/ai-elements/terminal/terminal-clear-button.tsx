import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2Icon } from "lucide-react";
import { useContext } from "react";
import { TerminalContext } from "./context";
import type { ComponentProps } from "react";

export type TerminalClearButtonProps = ComponentProps<typeof Button>;

export function TerminalClearButton({
  children,
  className,
  ...props
}: TerminalClearButtonProps) {
  const { onClear } = useContext(TerminalContext);

  if (!onClear) {
    return null;
  }

  return (
    <Button
      className={cn(
        "size-7 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
        className
      )}
      onClick={onClear}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Trash2Icon size={14} />}
    </Button>
  );
}
