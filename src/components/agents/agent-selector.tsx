/**
 * Agent Selector Component
 *
 * UI component for selecting between available agents.
 */

"use client";

import { StarIcon, WorkflowIcon, CheckIcon, FileSearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Agent 配置类型
 */
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
}

/**
 * Available agents configuration
 * This should be in sync with the backend registry
 */
export const AVAILABLE_AGENTS: AgentConfig[] = [
  {
    id: "star",
    name: "Star Agent",
    description: "搜索你的 Star 仓库",
    icon: <StarIcon className="size-5" />,
  },
  {
    id: "master",
    name: "Master Agent",
    description: "智能分配子 Agent",
    icon: <WorkflowIcon className="size-5" />,
  },
  {
    id: "patent",
    name: "Patent Agent",
    description: "专利检索与趋势判断",
    icon: <FileSearchIcon className="size-5" />,
  },
];

export type AgentId = "star" | "master" | "patent";

interface AgentSelectorProps {
  /** Currently selected agent ID */
  selectedAgentId: string;
  /** Callback when agent is selected */
  onSelect: (agentId: string) => void;
  /** Additional className */
  className?: string;
  /** Compact mode for header display */
  compact?: boolean;
}

/**
 * Agent Selector
 *
 * Displays available agents as selectable pills/cards.
 */
export function AgentSelector({
  selectedAgentId,
  onSelect,
  className,
  compact = false,
}: AgentSelectorProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {AVAILABLE_AGENTS.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className={cn(
                "relative flex items-center gap-2 px-3 py-1.5 rounded-lg",
                "text-sm font-medium transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isSelected
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className={cn("transition-colors", isSelected ? "text-background" : "text-muted-foreground")}>
                {agent.icon}
              </span>
              <span>{agent.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      {AVAILABLE_AGENTS.map((agent) => {
        const isSelected = selectedAgentId === agent.id;
        return (
          <motion.button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative flex items-center gap-3 p-4 rounded-xl",
              "border transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "text-left min-w-[200px]",
              isSelected
                ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border/60 bg-background/50 hover:border-primary/30 hover:bg-primary/5"
            )}
          >
            {/* 选中指示器 */}
            {isSelected && (
              <motion.div
                layoutId="agent-selector-indicator"
                className="absolute inset-0 rounded-xl border-2 border-primary/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}

            {/* 图标 */}
            <div
              className={cn(
                "shrink-0 size-10 rounded-lg flex items-center justify-center transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              )}
            >
              {agent.icon}
            </div>

            {/* 文字内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-semibold text-sm transition-colors",
                    isSelected ? "text-foreground" : "text-foreground/80"
                  )}
                >
                  {agent.name}
                </span>
                {isSelected && (
                  <CheckIcon className="size-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {agent.description}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
