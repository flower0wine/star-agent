"use client";

import {
  BotIcon,
  InfoIcon,
  PaletteIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react";

import type { AgentPanelType } from "./agent-settings/agent-settings-sidebar";
import type { SettingsSection, SettingsSectionItem } from "./settings-types";
import { AgentSettings } from "./agent-settings";
import { AboutSettingsSection } from "./sections/about-settings";
import { AppearanceSettingsSection } from "./sections/appearance-settings";
import type { ConversationSettingsFocusItem } from "./sections/conversation-settings";
import { ConversationSettingsSection } from "./sections/conversation-settings";
import { DataSettingsSection } from "./sections/data-settings";
import type { ModelSettingsFocusItem } from "./sections/model-settings";
import { ModelSettingsSection } from "./sections/model-settings";

export const DEFAULT_SETTINGS_SECTION: SettingsSection = "appearance";

export const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  { id: "appearance", label: "外观", icon: <PaletteIcon className="size-4" />, description: "主题和显示" },
  { id: "model", label: "AI 模型", icon: <SparklesIcon className="size-4" />, description: "供应商与模型" },
  { id: "conversation", label: "对话", icon: <SlidersHorizontalIcon className="size-4" />, description: "历史与自动保存" },
  { id: "agents", label: "Agent", icon: <BotIcon className="size-4" />, description: "行为与工具" },
  { id: "data", label: "数据", icon: <ShieldIcon className="size-4" />, description: "本地数据管理" },
  { id: "about", label: "关于", icon: <InfoIcon className="size-4" />, description: "版本与技术栈" },
];

const SETTINGS_ITEMS_BY_SECTION = {
  appearance: [],
  model: ["catalog", "api-key", "details"],
  conversation: ["auto-save", "history-retention"],
  agents: ["agent", "subagents"],
  data: [],
  about: [],
} as const;

const DEFAULT_ITEM_BY_SECTION: Partial<Record<SettingsSection, string>> = {
  model: "catalog",
  conversation: "auto-save",
  agents: "agent",
};

type SettingsSearchParamsReader = {
  get: (key: string) => string | null;
};

interface SettingsRenderContext {
  activeItem?: string;
  searchParams: SettingsSearchParamsReader;
}

function isValidAgentId(value: string | null): value is "star" | "master" | "patent" {
  return value === "star" || value === "master" || value === "patent";
}

function toConversationFocusItem(value?: string): ConversationSettingsFocusItem | undefined {
  if (value === "auto-save" || value === "history-retention") {
    return value;
  }
  return undefined;
}

function toModelFocusItem(value?: string): ModelSettingsFocusItem | undefined {
  if (value === "catalog" || value === "api-key" || value === "details") {
    return value;
  }
  return undefined;
}

function toAgentPanel(value?: string): AgentPanelType {
  return value === "subagents" ? "subagents" : "agents";
}

export function isValidSettingsSection(value: string): value is SettingsSection {
  return SETTINGS_SECTIONS.some(section => section.id === value);
}

export function resolveSettingsSection(value?: string): SettingsSection {
  if (!value) {
    return DEFAULT_SETTINGS_SECTION;
  }
  return isValidSettingsSection(value) ? value : DEFAULT_SETTINGS_SECTION;
}

export function isValidSettingsItem(section: SettingsSection, item: string) {
  return (SETTINGS_ITEMS_BY_SECTION[section] as readonly string[]).includes(item);
}

export function getDefaultSettingsItem(section: SettingsSection): string | undefined {
  return DEFAULT_ITEM_BY_SECTION[section];
}

export function resolveSettingsItem(section: SettingsSection, item?: string): string | undefined {
  if (!item) {
    return getDefaultSettingsItem(section);
  }
  if (isValidSettingsItem(section, item)) {
    return item;
  }
  return getDefaultSettingsItem(section);
}

export function buildSettingsPath(section: SettingsSection, item?: string): string {
  if (!item) {
    return `/settings/${section}`;
  }
  return `/settings/${section}/${item}`;
}

export function renderSettingsSection(
  activeSection: SettingsSection,
  context: SettingsRenderContext
) {
  const agentIdParam = context.searchParams.get("agentId");

  switch (activeSection) {
    case "appearance":
      return <AppearanceSettingsSection />;
    case "model":
      return (
        <ModelSettingsSection
          focusItem={toModelFocusItem(context.activeItem)}
          initialProviderId={context.searchParams.get("providerId") || undefined}
          initialModelId={context.searchParams.get("modelId") || undefined}
        />
      );
    case "conversation":
      return <ConversationSettingsSection focusItem={toConversationFocusItem(context.activeItem)} />;
    case "agents":
      return (
        <AgentSettings
          initialPanel={toAgentPanel(context.activeItem)}
          initialAgentId={isValidAgentId(agentIdParam) ? agentIdParam : undefined}
          initialSubAgentProfileId={context.searchParams.get("profileId") || undefined}
        />
      );
    case "data":
      return <DataSettingsSection />;
    case "about":
      return <AboutSettingsSection />;
    default:
      return null;
  }
}
