import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { modelOptions } from "@/lib/services/openrouter";
import { starAgentInstructions } from "@/lib/agent/instructions";
import { repoTools } from "@/mastra/tools/repo-tools";
import path from "path";

// Create storage for memory (LibSQL local file)
const dbPath = path.join(process.cwd(), ".mastra", "star-finder.db");
const storage = new LibSQLStore({
  id: "star-finder-storage",
  url: `file:${dbPath}`,
});

export const starAgent = new Agent({
  id: "star-agent",
  name: "Star Finder Agent",

  // Model configuration via OpenRouter - use full model ID string
  model: `openrouter/${modelOptions.default}`,

  // System instructions
  instructions: starAgentInstructions,

  // Available tools
  tools: {
    searchRepos: repoTools.searchRepos,
    getRepoDetails: repoTools.getRepoDetails,
    getReadme: repoTools.getReadme,
    getStarredReposSummary: repoTools.getStarredReposSummary,
  },

  // Memory for conversation history - Mastra v1 requires Memory instance with storage
  memory: new Memory({
    storage,
    options: {
      lastMessages: 20,
    },
  }),
});

// Export model options for settings
export { modelOptions };
export type { ModelId } from "@/lib/services/openrouter";
