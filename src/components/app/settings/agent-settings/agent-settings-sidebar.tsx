import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BotIcon, ChevronDownIcon, DotIcon, PlusIcon, WorkflowIcon } from "lucide-react";
import type { SubAgentProfile } from "@/lib/agents/sub-agent/types";

import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  subAgentProfiles: SubAgentProfile[];
  activeSubAgentProfileId?: string;
  onSelectAgent: (agentId: string) => void;
  onSelectSubAgentProfile: (profileId: string) => void;
  onCreateSubAgentProfile: () => void;
}

export function AgentSettingsSidebar({
  items,
  activeAgentId,
  activePanel,
  subAgentProfiles,
  activeSubAgentProfileId,
  onSelectAgent,
  onSelectSubAgentProfile,
  onCreateSubAgentProfile,
}: AgentSettingsSidebarProps) {
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [subAgentsOpen, setSubAgentsOpen] = useState(true);

  useEffect(() => {
    if (activePanel === "agents") {
      setAgentsOpen(true);
      return;
    }
    setSubAgentsOpen(true);
  }, [activePanel]);

  return (
    <aside className="h-full min-h-0 overflow-y-auto rounded-2xl border bg-muted/20 p-2">
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2 py-2 text-xs text-muted-foreground">
        <BotIcon className="size-3.5" />
        <span className="font-medium">Agent Console</span>
      </div>

      <div className="space-y-2">
        <Collapsible open={agentsOpen} onOpenChange={setAgentsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-left text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <BotIcon className="size-4" />
                Agents
              </span>
              <span className="ml-auto mr-1 flex min-w-0 items-center justify-end">
                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px] tabular-nums">
                  {items.length}
                </Badge>
              </span>
              <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform", agentsOpen ? "rotate-180" : "")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-1">
            {items.map((item) => {
              const isActive = activePanel === "agents" && activeAgentId === item.id;
              return (
                <button
                  key={`agents-${item.id}`}
                  type="button"
                  onClick={() => onSelectAgent(item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-transparent text-foreground/80 hover:border-border/70 hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-md border bg-background/70">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  </span>
                  {isActive && <DotIcon className="size-5 text-primary" />}
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={subAgentsOpen} onOpenChange={setSubAgentsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-left text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <WorkflowIcon className="size-4" />
                SubAgents
              </span>
              <span className="ml-auto mr-1 flex min-w-0 items-center justify-end">
                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px] tabular-nums">
                  {subAgentProfiles.length}
                </Badge>
              </span>
              <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform", subAgentsOpen ? "rotate-180" : "")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-1">
            {subAgentProfiles.map((profile) => {
              const isActive = activePanel === "subagents" && activeSubAgentProfileId === profile.id;
              return (
                <button
                  key={`subagent-profile-${profile.id}`}
                  type="button"
                  onClick={() => onSelectSubAgentProfile(profile.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-transparent text-foreground/80 hover:border-border/70 hover:bg-accent/70 hover:text-foreground"
                  )}
                >
                  <span className="flex size-6 items-center justify-center rounded-md border bg-background/70">
                    <WorkflowIcon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{profile.name || profile.id}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{profile.id}</span>
                  </span>
                  {isActive && <DotIcon className="size-5 text-primary" />}
                </button>
              );
            })}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 h-auto w-full rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-border/70 hover:bg-accent/70 hover:text-foreground"
              onClick={onCreateSubAgentProfile}
            >
              <PlusIcon className="size-3.5" />
              新建 Profile
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  );
}
