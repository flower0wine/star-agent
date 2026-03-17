/**
 * Agent Registry
 *
 * Simple registry for managing multiple AI Agents.
 * Each Agent defines its own tools and prompts following Vercel AI SDK format.
 */

import type { Tool } from "ai";

/**
 * Agent configuration interface
 * Defines the minimum required structure for an Agent
 */
export interface AgentConfig {
  /** Unique identifier for the agent */
  id: string;

  /** Display name */
  name: string;

  /** Description for UI */
  description: string;

  /** Optional icon emoji */
  icon?: string;

  /**
   * Get tools for this agent
   * @param context - Runtime context passed from API request
   * @returns Tools in Vercel AI SDK format
   */
  getTools: (context: Record<string, unknown>) => Record<string, Tool>;

  /**
   * Get system prompt for this agent
   * @param context - Runtime context passed from API request
   * @returns System prompt string
   */
  getSystemPrompt: (context: Record<string, unknown>) => string;
}

/**
 * Agent Registry
 * Manages registration and lookup of agents
 */
class AgentRegistryImpl {
  private agents = new Map<string, AgentConfig>();

  /**
   * Register an agent
   */
  register(agent: AgentConfig): void {
    if (this.agents.has(agent.id)) {
      console.warn(`Agent "${agent.id}" is already registered, overwriting.`);
    }
    this.agents.set(agent.id, agent);
  }

  /**
   * Get agent by ID
   */
  get(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all registered agents
   */
  list(): AgentConfig[] {
    return [...this.agents.values()];
  }

  /**
   * Check if agent exists
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }
}

/**
 * Singleton registry instance
 */
export const agentRegistry = new AgentRegistryImpl();
