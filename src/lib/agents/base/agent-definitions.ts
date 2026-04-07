import { getDefaultSystemPromptTemplate } from "@/lib/agents/default-system-prompt-template";
import { listToolDefinitions } from "./tool-definitions";
import type { AgentDefinition, AgentId } from "./types";

function getDefaultToolIds(agentId: AgentId): string[] {
  return listToolDefinitions()
    .filter(tool => tool.defaultEnabledAgentIds.includes(agentId))
    .map(tool => tool.id);
}

const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "star",
    name: "Star Agent",
    description: "仓库检索与分析",
    defaultPromptTemplate: getDefaultSystemPromptTemplate("star"),
    promptVariables: ["current_date", "username", "repos_count", "repos_context"],
    recommendedToolIds: getDefaultToolIds("star"),
  },
  {
    id: "master",
    name: "Master Agent",
    description: "任务编排与子 Agent",
    defaultPromptTemplate: getDefaultSystemPromptTemplate("master"),
    promptVariables: ["current_date", "username", "repos_count"],
    recommendedToolIds: getDefaultToolIds("master"),
  },
  {
    id: "patent",
    name: "Patent Agent",
    description: "专利检索与趋势分析",
    defaultPromptTemplate: getDefaultSystemPromptTemplate("patent"),
    promptVariables: [
      "current_date",
      "provider",
      "default_lookback_months",
      "max_results_per_request",
      "default_sort_by",
    ],
    recommendedToolIds: getDefaultToolIds("patent"),
  },
];

const DEFINITION_MAP = new Map(AGENT_DEFINITIONS.map(def => [def.id, def]));

export function listAgentDefinitions(): AgentDefinition[] {
  return AGENT_DEFINITIONS;
}

export function getAgentDefinition(agentId: string): AgentDefinition | undefined {
  return DEFINITION_MAP.get(agentId as AgentId);
}

