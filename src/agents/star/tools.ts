/**
 * Star Agent Tools
 *
 * Tool aggregation - imports complete tool definitions from individual files
 */

import type { GitHubRepo } from "@/lib/github/api";
import { createSearchRepositoriesTool } from "./tools/search-repository";
import { createGetRepositoryReadmeTool } from "./tools/get-readme";
import { createDisplayRepositoriesTool } from "./tools/display-repositories";

/**
 * Create Star Tools - Pure aggregation layer
 * Each tool's definition (description, inputSchema, execute) is in its respective file
 */
export function createStarTools(repos: GitHubRepo[]) {
  return {
    searchRepositories: createSearchRepositoriesTool(repos),
    getRepositoryReadme: createGetRepositoryReadmeTool(repos),
    displayRepositories: createDisplayRepositoriesTool(),
  };
}

/**
 * Tool type export for type checking
 */
export type StarTools = ReturnType<typeof createStarTools>;
