"use client";

import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  BotIcon,
  InfoIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SunIcon,
  TrashIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { clearAllData, deleteOldConversations } from "@/lib/storage";
import {
  AVAILABLE_MODELS,
  HISTORY_RETENTION_OPTIONS,
  useSettingsStore,
} from "@/stores/settings-store";
import { useChatHistoryStore } from "@/stores/chat-history-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { AgentSettings } from "./agent-settings";

type SettingsSection = "appearance" | "model" | "conversation" | "agents" | "data" | "about";

interface SettingsSectionItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

const SETTINGS_SECTIONS: SettingsSectionItem[] = [
  { id: "appearance", label: "外观", icon: <PaletteIcon className="size-4" /> },
  { id: "model", label: "AI 模型", icon: <SparklesIcon className="size-4" /> },
  { id: "conversation", label: "对话", icon: <SlidersHorizontalIcon className="size-4" /> },
  { id: "agents", label: "Agent 配置", icon: <BotIcon className="size-4" /> },
  { id: "data", label: "数据管理", icon: <ShieldIcon className="size-4" /> },
  { id: "about", label: "关于", icon: <InfoIcon className="size-4" /> },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl! min-w-2xl! w-[80vw]! h-[80vh]! p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理应用程序设置</DialogDescription>
        </DialogHeader>

        <div className="flex h-full min-h-0">
          {/* Left sidebar */}
          <div className="w-48 border-r bg-muted/30 p-2 flex flex-col gap-1 overflow-y-auto">
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
              设置
            </div>
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeSection === section.id && "bg-accent text-accent-foreground"
                )}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {activeSection === "appearance" && <AppearanceSettings />}
            {activeSection === "model" && <ModelSettings />}
            {activeSection === "conversation" && <ConversationSettings />}
            {activeSection === "agents" && <AgentSettings />}
            {activeSection === "data" && <DataSettings />}
            {activeSection === "about" && <AboutSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">外观</h3>
        <p className="text-sm text-muted-foreground">
          自定义应用程序的外观
        </p>
      </div>
      <Separator />

      <div className="space-y-4">
        <Label>主题</Label>
        <div className="grid grid-cols-3 gap-3">
          <ThemeButton
            active={theme === "light"}
            onClick={() => setTheme("light")}
            icon={<SunIcon className="size-5" />}
            label="浅色"
          />
          <ThemeButton
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
            icon={<MoonIcon className="size-5" />}
            label="深色"
          />
          <ThemeButton
            active={theme === "system"}
            onClick={() => setTheme("system")}
            icon={<MonitorIcon className="size-5" />}
            label="跟随系统"
          />
        </div>
      </div>
    </div>
  );
}

function ThemeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-transparent bg-muted/50 hover:bg-muted"
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function ModelSettings() {
  const { defaultModel, setDefaultModel } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">AI 模型</h3>
        <p className="text-sm text-muted-foreground">
          配置 AI 模型相关设置
        </p>
      </div>
      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="model">默认模型</Label>
          <Select value={defaultModel} onValueChange={setDefaultModel}>
            <SelectTrigger id="model">
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({model.provider})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            新对话将使用此模型
          </p>
        </div>
      </div>
    </div>
  );
}

function ConversationSettings() {
  const {
    historyRetentionDays,
    setHistoryRetentionDays,
    autoSaveEnabled,
    setAutoSaveEnabled,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">对话</h3>
        <p className="text-sm text-muted-foreground">
          管理对话历史和保存设置
        </p>
      </div>
      <Separator />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-save">自动保存对话</Label>
            <p className="text-xs text-muted-foreground">
              自动保存对话到历史记录
            </p>
          </div>
          <Switch
            id="auto-save"
            checked={autoSaveEnabled}
            onCheckedChange={setAutoSaveEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="retention">历史保留时间</Label>
          <Select
            value={String(historyRetentionDays)}
            onValueChange={(v) => setHistoryRetentionDays(Number(v))}
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
          <p className="text-xs text-muted-foreground">
            超过此时间的对话将被自动清理
          </p>
        </div>
      </div>
    </div>
  );
}

function DataSettings() {
  const { loadConversations } = useChatHistoryStore();
  const { historyRetentionDays } = useSettingsStore();
  const [isClearing, setIsClearing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = useCallback(async () => {
    setIsClearing(true);
    try {
      await clearAllData();
      await loadConversations();
      toast.success("已清除所有对话历史");
    } catch {
      toast.error("清除失败");
    } finally {
      setIsClearing(false);
      setConfirmClear(false);
    }
  }, [loadConversations]);

  const handleCleanOld = useCallback(async () => {
    if (historyRetentionDays === -1) {
      return;
    }
    setIsCleaning(true);
    try {
      const count = await deleteOldConversations(historyRetentionDays);
      await loadConversations();
      if (count > 0) {
        toast.success(`已清理 ${count} 个过期对话`);
      } else {
        toast.info("没有需要清理的过期对话");
      }
    } catch {
      toast.error("清理失败");
    } finally {
      setIsCleaning(false);
    }
  }, [historyRetentionDays, loadConversations]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">数据管理</h3>
        <p className="text-sm text-muted-foreground">
          管理本地存储的数据
        </p>
      </div>
      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <div className="font-medium">清理过期对话</div>
            <p className="text-xs text-muted-foreground">
              根据历史保留时间设置清理过期的对话
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCleanOld()}
            disabled={isCleaning || historyRetentionDays === -1}
          >
            {isCleaning ? "清理中..." : "清理"}
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
          <div className="space-y-0.5">
            <div className="font-medium text-destructive">清除所有数据</div>
            <p className="text-xs text-muted-foreground">
              删除所有对话历史，此操作不可撤销
            </p>
          </div>
          {confirmClear ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmClear(false)}
                disabled={isClearing}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleClearAll()}
                disabled={isClearing}
              >
                {isClearing ? "清除中..." : "确认"}
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmClear(true)}
            >
              <TrashIcon className="mr-2 size-4" />
              清除
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">关于</h3>
        <p className="text-sm text-muted-foreground">
          应用程序信息
        </p>
      </div>
      <Separator />

      <div className="space-y-4">
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <SparklesIcon className="size-6" />
            </div>
            <div>
              <div className="font-semibold">Star Agent</div>
              <div className="text-sm text-muted-foreground">v0.1.0</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            智能 GitHub Star 仓库助手，帮助你从收藏的仓库中快速找到所需的项目。
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">技术栈</span>
            <span>Next.js + React + Tailwind CSS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">AI 框架</span>
            <span>Vercel AI SDK</span>
          </div>
        </div>
      </div>
    </div>
  );
}
