import { CompassIcon, ScrollTextIcon, SparklesIcon } from "lucide-react";
import type { RoomConfig, RoomPromptRevision } from "@/lib/room/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RoomDirectorPanelProps {
  roomConfig: RoomConfig;
  promptRevisions: RoomPromptRevision[];
  onUpdate: (config: RoomConfig) => Promise<void>;
}

export function RoomDirectorPanel({ roomConfig, promptRevisions, onUpdate }: RoomDirectorPanelProps) {
  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/15 via-secondary/20 to-transparent pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SparklesIcon className="size-4" />
          编剧中枢
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="user-directive" className="flex items-center gap-2">
            <CompassIcon className="size-4" />
            用户创作指令（单输入）
          </Label>
          <Textarea
            id="user-directive"
            rows={4}
            value={roomConfig.userDirective}
            placeholder="例如：赛博朋克悬疑；主题是‘自由意志与责任’；拒绝宿命论结局。"
            onChange={(event) => {
              void onUpdate({
                ...roomConfig,
                userDirective: event.target.value,
                updatedAt: Date.now(),
              });
            }}
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <Label htmlFor="story-bible" className="text-sm">世界观档案（编剧生成）</Label>
          <Textarea
            id="story-bible"
            rows={8}
            value={roomConfig.world.storyBible}
            readOnly
            className="mt-2 bg-background/70"
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <Label htmlFor="plot-outline" className="text-sm">情节蓝图（编剧生成）</Label>
          <Textarea
            id="plot-outline"
            rows={8}
            value={roomConfig.world.plotOutline}
            readOnly
            className="mt-2 bg-background/70"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ScrollTextIcon className="size-4" />
            最近修订记录
          </Label>
          <ScrollArea className="h-32 rounded-lg border border-border/70 p-2">
            <div className="space-y-2 text-xs">
              {promptRevisions.length === 0 && (
                <p className="text-muted-foreground">暂无修订记录</p>
              )}
              {promptRevisions.slice(0, 5).map(revision => (
                <div key={revision.id} className="rounded-md border border-border/70 bg-background/70 p-2">
                  <p className="font-medium">周期 {revision.cycleNo}</p>
                  <p className="mt-1 text-muted-foreground">{revision.rationale}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
