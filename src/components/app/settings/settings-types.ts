import type { ReactNode } from "react";

export type SettingsSection = "appearance" | "model" | "conversation" | "agents" | "data" | "about";

export interface SettingsSectionItem {
  id: SettingsSection;
  label: string;
  icon: ReactNode;
  description: string;
}
