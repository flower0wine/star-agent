import { PLAYWRIGHT_REVIEW_INTERVAL } from "@/lib/room/constants";
import type { RoomTurnState } from "@/lib/room/types";
import { Card, CardContent } from "@/components/ui/card";

interface RoomStatusBarProps {
  turnState: RoomTurnState | null;
}

export function RoomStatusBar({ turnState }: RoomStatusBarProps) {
  if (!turnState) {
    return null;
  }

  const remaining = Math.max(0, PLAYWRIGHT_REVIEW_INTERVAL - turnState.totalCharacterTurnsInCycle);

  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="grid gap-3 bg-gradient-to-r from-primary/10 via-muted/50 to-secondary/15 px-4 py-3 text-sm md:grid-cols-4">
        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <div className="text-muted-foreground">叙事周期</div>
          <div className="font-medium">第 {turnState.cycleNo} 周期</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <div className="text-muted-foreground">角色推进</div>
          <div className="font-medium">{turnState.totalCharacterTurnsInCycle} / {PLAYWRIGHT_REVIEW_INTERVAL}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <div className="text-muted-foreground">当前主导者</div>
          <div className="font-medium">{turnState.nextPhase === "playwright" ? "编剧" : "角色"}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
          <div className="text-muted-foreground">下次编剧复盘</div>
          <div className="font-medium">剩余 {remaining} 轮</div>
        </div>
      </CardContent>
    </Card>
  );
}
