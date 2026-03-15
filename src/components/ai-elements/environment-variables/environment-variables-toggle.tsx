"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useContext } from "react";

import { EnvironmentVariablesContext } from "./context";

type EnvironmentVariablesToggleProps = ComponentProps<typeof Switch>;

export function EnvironmentVariablesToggle({
  className,
  ...props
}: EnvironmentVariablesToggleProps) {
  const { showValues, setShowValues } = useContext(EnvironmentVariablesContext);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-muted-foreground text-xs">
        {showValues ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
      </span>
      <Switch
        aria-label="Toggle value visibility"
        checked={showValues}
        onCheckedChange={setShowValues}
        {...props}
      />
    </div>
  );
}
