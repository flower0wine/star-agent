import { CompassIcon, SparklesIcon } from "lucide-react";
import type { RoomConfig } from "@/lib/room/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RoomDirectorPanelProps {
  roomConfig: RoomConfig;
  onUpdate: (config: RoomConfig) => Promise<void>;
}

export function RoomDirectorPanel({ roomConfig, onUpdate }: RoomDirectorPanelProps) {
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
          <Label htmlFor="playwright-output" className="text-sm">编剧输出（世界观与情节）</Label>
          <Textarea
            id="playwright-output"
            rows={12}
            value={roomConfig.world.playwrightOutput}
            placeholder="点击开始后，编剧会先生成世界观并创建角色设定。"
            readOnly
            className="mt-2 bg-background/70"
          />
        </div>
      </CardContent>
    </Card>
  );
}
