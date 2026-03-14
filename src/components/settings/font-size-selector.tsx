// =============================================================================
// Font Size Selector Component
// Allows users to select font size preference
// =============================================================================

"use client";

import { Type } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FontSize } from "@/types/settings";

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

interface FontSizeSelectorProps {
  className?: string;
}

export function FontSizeSelector({ className }: FontSizeSelectorProps) {
  const { fontSize, setFontSize } = useSettings();

  return (
    <Select value={fontSize} onValueChange={async (value) => await setFontSize(value as FontSize)}>
      <SelectTrigger
        className={className}
        aria-label="Select font size"
      >
        <div className="flex items-center gap-2">
          <Type className="size-4" />
          <SelectValue placeholder="Select size" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {fontSizeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
