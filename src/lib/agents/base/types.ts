import type { Tool } from "ai";
import type { GitHubRepo } from "@/lib/github/api";
import type { PatentRuntimeConfig } from "@/agents/patent/static-config";

export type AgentId = "star" | "master" | "patent";
export type ToolCategory = "search" | "display" | "info" | "agent";

export interface AgentToolConfig {
  enabled?: boolean;
  defaultInput?: Record<string, unknown>;
  boundSubAgentIds?: string[];
}

export interface ToolFactoryContext {
  agentId: AgentId;
  requestId: string;
  repos: GitHubRepo[];
  username?: string;
  customParams?: Record<string, unknown>;
  staticParams?: Record<string, unknown>;
  patentRuntimeConfig?: PatentRuntimeConfig;
  toolConfig?: AgentToolConfig;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  searchKeywords?: string[];
  defaultEnabledAgentIds: AgentId[];
  isCore?: boolean;
  subAgentCompatible?: boolean;
  factory: (context: ToolFactoryContext) => Tool;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  defaultPromptTemplate: string;
  promptVariables: string[];
  recommendedToolIds: string[];
}
