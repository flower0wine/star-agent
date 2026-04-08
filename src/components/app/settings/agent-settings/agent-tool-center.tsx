import {
  getAgentTools,
  getCoreTools,
  getDefaultEnabledTools,
} from "@/lib/agents/tool-registry";
import type { AgentToolConfig } from "@/lib/agents/base/types";
import type { SubAgentProfile } from "@/lib/agents/sub-agent/types";
import { ToolConfigCenter } from "./tool-config-center";

interface AgentToolCenterProps {
  agentId: string;
  subAgentProfiles?: SubAgentProfile[];
  toolConfigs: Record<string, AgentToolConfig>;
  onToolConfigChange: (toolId: string, config: AgentToolConfig) => void;
  onToolConfigsChange: (next: Record<string, AgentToolConfig>) => void;
}

export function AgentToolCenter({
  agentId,
  subAgentProfiles = [],
  toolConfigs,
  onToolConfigChange,
  onToolConfigsChange,
}: AgentToolCenterProps) {
  return (
    <ToolConfigCenter
      panelId={agentId}
      title="工具中心"
      description="统一管理全量工具库在当前 Agent 下的启用状态。核心仅做标记，可自由关闭。"
      availableTools={getAgentTools(agentId)}
      defaultEnabledToolIds={getDefaultEnabledTools(agentId)}
      coreToolIds={getCoreTools(agentId)}
      subAgentProfiles={subAgentProfiles}
      toolConfigs={toolConfigs}
      onToolConfigChange={onToolConfigChange}
      onToolConfigsChange={onToolConfigsChange}
    />
  );
}
