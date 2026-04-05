import type { ReactNode } from "react";
import { BotIcon, ChevronDownIcon, WorkflowIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface AgentSidebarItem {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
}

export type AgentPanelType = "agents" | "subagents";

interface AgentSettingsSidebarProps {
  items: AgentSidebarItem[];
  activeAgentId: string;
  activePanel: AgentPanelType;
  onSelect: (panel: AgentPanelType, agentId: string) => void;
}

export function AgentSettingsSidebar({
  items,
  activeAgentId,
  activePanel,
  onSelect,
}: AgentSettingsSidebarProps) {
  const agentsOpen = activePanel === "agents";
  const subAgentsOpen = activePanel === "subagents";

  return (
    <aside className="h-full min-h-0 overflow-y-auto rounded-2xl border bg-muted/20 p-2">
      <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <BotIcon className="size-3.5" />
        <span>Agent Console</span>
      </div>

      <div className="space-y-2">
        <Collapsible open={agentsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-left text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <BotIcon className="size-4" />
                Agents
              </span>
              <ChevronDownIcon className={cn("size-4 transition-transform", agentsOpen ? "rotate-180" : "")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-1">
            {items.map((item) => {
              const isActive = activePanel === "agents" && activeAgentId === item.id;
              return (
                <button
                  key={`agents-${item.id}`}
                  type="button"
                  onClick={() => onSelect("agents", item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-md border bg-background/70">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={subAgentsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-left text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <WorkflowIcon className="size-4" />
                SubAgents
              </span>
              <ChevronDownIcon className={cn("size-4 transition-transform", subAgentsOpen ? "rotate-180" : "")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-1">
            {items.map((item) => {
              const isActive = activePanel === "subagents" && activeAgentId === item.id;
              return (
                <button
                  key={`subagents-${item.id}`}
                  type="button"
                  onClick={() => onSelect("subagents", item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-md border bg-background/70">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  );
}
