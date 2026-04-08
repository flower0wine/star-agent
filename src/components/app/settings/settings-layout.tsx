"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";

import { SettingsSectionNav } from "./settings-section-nav";
import {
  SETTINGS_SECTIONS,
  renderSettingsSection,
} from "./settings-registry";
import type { SettingsSection } from "./settings-types";

interface SettingsLayoutProps {
  activeSection: SettingsSection;
  activeItem?: string;
  onSectionChange: (section: SettingsSection) => void;
  onBack: () => void;
  searchParams: {
    get: (key: string) => string | null;
  };
}

export function SettingsLayout({
  activeSection,
  activeItem,
  onSectionChange,
  onBack,
  searchParams,
}: SettingsLayoutProps) {
  const sectionNode = useMemo(
    () =>
      renderSettingsSection(activeSection, {
        activeItem,
        searchParams,
      }),
    [activeItem, activeSection, searchParams]
  );

  return (
    <div className="flex h-full min-h-0">
      <SettingsSectionNav
        sections={SETTINGS_SECTIONS}
        activeSection={activeSection}
        onChange={onSectionChange}
        onBack={onBack}
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeSection}:${activeItem || "default"}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="h-full min-h-0"
          >
            {sectionNode}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
