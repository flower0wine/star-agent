/**
 * Agent Selector Component
 *
 * UI component for selecting between available agents.
 */

"use client";

import { StarIcon, GlobeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Available agents configuration
 * This should be in sync with the backend registry
 */
export const AVAILABLE_AGENTS = [
  {
    id: "star",
    name: "Star Agent",
    description: "Find repositories from your GitHub stars",
    icon: <StarIcon className="size-5" />,
  },
  // Future agents can be added here:
  // {
  //   id: "web",
  //   name: "Web Agent",
  //   description: "Search the web for information",
  //   icon: <GlobeIcon className="size-5" />,
  // },
] as const;

export type AgentId = typeof AVAILABLE_AGENTS[number]["id"];

interface AgentSelectorProps {
  /** Currently selected agent ID */
  selectedAgentId: string;
  /** Callback when agent is selected */
  onSelect: (agentId: string) => void;
  /** Additional className */
  className?: string;
}

/**
 * Agent Selector
 *
 * Displays available agents as selectable cards.
 */
export function AgentSelector({
  selectedAgentId,
  onSelect,
  className,
}: AgentSelectorProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      {AVAILABLE_AGENTS.map((agent) => (
        <Card
          key={agent.id}
          className={cn(
            "cursor-pointer transition-all hover:border-primary",
            selectedAgentId === agent.id
            && "border-primary ring-1 ring-primary"
          )}
          onClick={() => onSelect(agent.id)}
        >
          <CardContent className="flex items-center gap-2 p-3">
            <span className="text-primary">{agent.icon}</span>
            <div>
              <div className="font-medium text-sm">{agent.name}</div>
              <div className="text-xs text-muted-foreground">
                {agent.description}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
