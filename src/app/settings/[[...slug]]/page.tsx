"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  buildSettingsPath,
  getDefaultSettingsItem,
  isValidSettingsItem,
  isValidSettingsSection,
  resolveSettingsSection,
  resolveSettingsItem,
} from "@/components/app/settings/settings-registry";
import { SettingsLayout } from "@/components/app/settings/settings-layout";

export default function SettingsPage() {
  const params = useParams<{ slug?: string[] }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = params.slug || [];
  const sectionParam = slug[0];
  const itemParam = slug[1];

  const activeSection = useMemo(
    () => resolveSettingsSection(sectionParam),
    [sectionParam]
  );
  const activeItem = useMemo(
    () => resolveSettingsItem(activeSection, itemParam),
    [activeSection, itemParam]
  );

  const shouldRedirectSection = Boolean(sectionParam && !isValidSettingsSection(sectionParam));
  const shouldRedirectItem = Boolean(itemParam && !isValidSettingsItem(activeSection, itemParam));

  useEffect(() => {
    if (!shouldRedirectSection && !shouldRedirectItem) {
      return;
    }
    const fallbackItem = activeItem || getDefaultSettingsItem(activeSection);
    router.replace(buildSettingsPath(activeSection, fallbackItem));
  }, [
    activeItem,
    activeSection,
    router,
    shouldRedirectItem,
    shouldRedirectSection,
  ]);

  if (shouldRedirectSection || shouldRedirectItem) {
    return null;
  }

  return (
    <main className="h-full min-h-0 overflow-hidden">
      <SettingsLayout
        activeSection={activeSection}
        activeItem={activeItem}
        onBack={() => router.push("/chat")}
        onSectionChange={(section) => {
          const defaultItem = getDefaultSettingsItem(section);
          router.push(buildSettingsPath(section, defaultItem));
        }}
        searchParams={searchParams}
      />
    </main>
  );
}
