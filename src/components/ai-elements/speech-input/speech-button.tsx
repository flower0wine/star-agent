"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { MicIcon, SquareIcon } from "lucide-react";
import type { ComponentProps } from "react";

interface SpeechButtonProps extends ComponentProps<typeof Button> {
  isListening: boolean;
  isProcessing: boolean;
}

export function SpeechButton({
  className,
  isListening,
  isProcessing,
  ...props
}: SpeechButtonProps) {
  return (
    <Button
      className={cn(
        "relative z-10 rounded-full transition-all duration-300",
        isListening
          ? "bg-destructive text-white hover:bg-destructive/80 hover:text-white"
          : "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
        className
      )}
      {...props}
    >
      {isProcessing && <Spinner />}
      {!isProcessing && isListening && <SquareIcon className="size-4" />}
      {!(isProcessing || isListening) && <MicIcon className="size-4" />}
    </Button>
  );
}
