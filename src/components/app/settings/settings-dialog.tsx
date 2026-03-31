"use client";

import { useMemo, useState } from "react";
import {
  BotIcon,
  InfoIcon,
  PaletteIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { AgentSettings } from "./agent-settings";
import { SettingsSectionNav } from "./settings-section-nav";
import type { SettingsSection, SettingsSectionItem } from "./settings-types";
import { AboutSettingsSection } from "./sections/about-settings";
import { AppearanceSettingsSection } from "./sections/appearance-settings";
import { ConversationSettingsSection } from "./sections/conversation-settings";
import { DataSettingsSection } from "./sections/data-settings";
import { ModelSettingsSection } from "./sections/model-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  { id: "appearance", label: "外观", icon: <PaletteIcon className="size-4" />, description: "主题和显示" },
  { id: "model", label: "AI 模型", icon: <SparklesIcon className="size-4" />, description: "供应商与模型" },
  { id: "conversation", label: "对话", icon: <SlidersHorizontalIcon className="size-4" />, description: "历史与自动保存" },
  { id: "agents", label: "Agent", icon: <BotIcon className="size-4" />, description: "行为与工具" },
  { id: "data", label: "数据", icon: <ShieldIcon className="size-4" />, description: "本地数据管理" },
  { id: "about", label: "关于", icon: <InfoIcon className="size-4" />, description: "版本与技术栈" },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function renderSection(activeSection: SettingsSection) {
  switch (activeSection) {
    case "appearance":
      return <AppearanceSettingsSection />;
    case "model":
      return <ModelSettingsSection />;
    case "conversation":
      return <ConversationSettingsSection />;
    case "agents":
      return <AgentSettings />;
    case "data":
      return <DataSettingsSection />;
    case "about":
      return <AboutSettingsSection />;
    default:
      return null;
  }
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  const sectionNode = useMemo(
    () => renderSection(activeSection),
    [activeSection]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[82vh]! w-[90vw]! max-w-6xl! overflow-hidden border p-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理应用程序设置</DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex h-full min-h-0"
        >
          <SettingsSectionNav
            sections={SETTINGS_SECTIONS}
            activeSection={activeSection}
            onChange={setActiveSection}
          />

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeSection} className="h-full min-h-0">
                {sectionNode}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

