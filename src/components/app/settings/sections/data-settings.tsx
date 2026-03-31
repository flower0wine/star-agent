import { useCallback, useState } from "react";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { clearAllData, deleteOldConversations } from "@/lib/storage";
import { useChatHistoryStore } from "@/stores/chat-history-store";
import { useSettingsStore } from "@/stores/settings-store";
import { Button } from "@/components/ui/button";

import { SettingsSectionShell } from "../settings-section-shell";

export function DataSettingsSection() {
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
    <SettingsSectionShell title="数据管理" description="管理浏览器本地存储的数据。">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border bg-card p-4">
          <div className="space-y-1">
            <div className="text-sm font-medium">清理过期对话</div>
            <p className="text-xs text-muted-foreground">按保留策略删除过期会话。</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCleanOld()}
            disabled={isCleaning || historyRetentionDays === -1}
          >
            {isCleaning ? "清理中..." : "立即清理"}
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-destructive/40 bg-card p-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-destructive">清除所有数据</div>
            <p className="text-xs text-muted-foreground">删除全部会话与消息，无法撤销。</p>
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
                {isClearing ? "清除中..." : "确认清除"}
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
    </SettingsSectionShell>
  );
}
