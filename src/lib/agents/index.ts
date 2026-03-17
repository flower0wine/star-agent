/**
 * Agent Registry - Registration Entry Point
 *
 * This file registers all available agents.
 * Each agent is responsible for its own tools and prompts.
 */

import { agentRegistry } from "./registry";
import { starAgent } from "@/agents/star";

/**
 * Register all agents
 * This function should be called at application startup
 */
export function registerAgents(): void {
  // Note: Star Agent registration is handled dynamically in the API route
  // because it needs the repos context at request time.
  // The agentRegistry.get("star") will use createStarAgent when called.

  // For now, we just register the metadata so the selector can list available agents
  agentRegistry.register({
    id: starAgent.id,
    name: starAgent.name,
    description: starAgent.description,
    icon: starAgent.icon,
    // These will be overwritten when createStarAgent is called with repos
    getTools: () => ({}),
    getSystemPrompt: () => "",
  });
}

// Export registry
export { agentRegistry };
