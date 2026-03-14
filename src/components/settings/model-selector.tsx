// =============================================================================
// Model Selector Component
// Allows users to select AI model from available options
// =============================================================================

"use client";

import { useSettings } from "@/hooks/use-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_MODELS } from "@/types/settings";

interface ModelSelectorProps {
  className?: string;
}

export function ModelSelector({ className }: ModelSelectorProps) {
  const { model, setModel } = useSettings();

  return (
    <Select value={model} onValueChange={setModel}>
      <SelectTrigger
        className={className}
        aria-label="Select AI model"
      >
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
