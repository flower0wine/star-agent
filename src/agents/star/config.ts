/**
 * Star Agent Configuration
 *
 * Metadata for the GitHub Star Agent
 */

export const starAgent = {
  id: "star",
  name: "Star Agent",
  description: "Find repositories from your GitHub stars",
  icon: "⭐",
} as const;

export type StarAgentId = typeof starAgent.id;
