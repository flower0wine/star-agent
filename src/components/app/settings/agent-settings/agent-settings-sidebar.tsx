import type { ReactNode } from "react";
import { BotIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AgentSidebarItem {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
}

interface AgentSettingsSidebarProps {
  items: AgentSidebarItem[];
  activeAgentId: string;
  onSelect: (agentId: string) => void;
}

export function AgentSettingsSidebar({
  items,
  activeAgentId,
  onSelect,
}: AgentSettingsSidebarProps) {
  return (
    <aside className="h-full min-h-0 overflow-y-auto rounded-2xl border bg-muted/20 p-2">
      <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <BotIcon className="size-3.5" />
        <span>Agents</span>
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeAgentId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/80 hover:bg-accent/70 hover:text-foreground"
              )}
            >
              <span className="flex size-7 items-center justify-center rounded-lg border bg-background/70">
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
