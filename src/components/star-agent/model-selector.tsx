"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SettingsIcon, SparklesIcon, ZapIcon, BrainIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ModelConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const models: ModelConfig[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Fast & affordable",
    icon: <ZapIcon className="size-4" />,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Best overall",
    icon: <SparklesIcon className="size-4" />,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "High capability",
    icon: <BrainIcon className="size-4" />,
  },
];

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (model: string) => void;
}

export function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentModel);

  const handleSave = () => {
    onModelChange(selected);
    setOpen(false);
  };

  const currentModelConfig = models.find((m) => m.id === currentModel);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <SettingsIcon className="size-4" />
          <span className="hidden sm:inline">Model</span>
          {currentModelConfig && (
            <span className="text-xs text-muted-foreground">
              {currentModelConfig.name}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Model Settings</DialogTitle>
          <DialogDescription>
            Choose the AI model that best fits your needs. Different models have
            different capabilities and speeds.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup
            value={selected}
            onValueChange={setSelected}
            className="space-y-3"
          >
            {models.map((model) => (
              <motion.label
                key={model.id}
                htmlFor={model.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors",
                  selected === model.id
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={model.id} id={model.id} />
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {model.icon}
                      <span>{model.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {model.description}
                    </p>
                  </div>
                </div>
              </motion.label>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
