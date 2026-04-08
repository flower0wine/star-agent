import { useEffect, useRef } from "react";

import { useSettingsStore, HISTORY_RETENTION_OPTIONS } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { SettingsSectionShell } from "../settings-section-shell";

export type ConversationSettingsFocusItem = "auto-save" | "history-retention";

interface ConversationSettingsSectionProps {
  focusItem?: ConversationSettingsFocusItem;
}

export function ConversationSettingsSection({ focusItem }: ConversationSettingsSectionProps) {
  const {
    historyRetentionDays,
    setHistoryRetentionDays,
    autoSaveEnabled,
    setAutoSaveEnabled,
  } = useSettingsStore();

  const autoSaveRef = useRef<HTMLDivElement>(null);
  const retentionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = focusItem === "history-retention" ? retentionRef.current : autoSaveRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusItem]);

  return (
    <SettingsSectionShell title="对话" description="管理历史记录和自动保存策略。">
      <div className="space-y-5">
        <div
          ref={autoSaveRef}
          className={cn(
            "flex items-center justify-between rounded-xl border bg-card p-4",
            focusItem === "auto-save" && "border-primary/50 bg-accent/30"
          )}
        >
          <div className="space-y-1">
            <Label htmlFor="auto-save">自动保存对话</Label>
            <p className="text-xs text-muted-foreground">自动将当前会话写入本地历史记录。</p>
          </div>
          <Switch
            id="auto-save"
            checked={autoSaveEnabled}
            onCheckedChange={setAutoSaveEnabled}
          />
        </div>

        <div
          ref={retentionRef}
          className={cn(
            "rounded-xl border bg-card p-4",
            focusItem === "history-retention" && "border-primary/50 bg-accent/30"
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="retention">历史保留时间</Label>
            <Select
              value={String(historyRetentionDays)}
              onValueChange={(value) => setHistoryRetentionDays(Number(value))}
            >
              <SelectTrigger id="retention">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HISTORY_RETENTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">超过保留时间的会话可以在数据管理中清理。</p>
          </div>
        </div>
      </div>
    </SettingsSectionShell>
  );
}
