/**
 * Get Repository README Tool
 */

import { tool } from "ai";
import { z } from "zod";
import { fetchRepoReadme } from "@/lib/github/api";
import type { GitHubRepo } from "@/lib/github/api";

export interface GetReadmeInput {
  fullName: string;
}

export interface GetReadmeOutput {
  readme?: string;
  html_url?: string;
  error?: string;
  __duration: number;
}

/**
 * Get repository README tool implementation
 */
export async function getRepositoryReadmeTool(
  repos: GitHubRepo[],
  fullName: string
): Promise<GetReadmeOutput> {
  const startTime = Date.now();

  // Find the repo in local cache first
  const repo = repos.find(
    (r) =>
      r.full_name.toLowerCase() === fullName.toLowerCase()
      || r.name.toLowerCase() === fullName.toLowerCase()
  );

  if (!repo) {
    return {
      error: `Repository '${fullName}' not found or README unavailable`,
      __duration: Date.now() - startTime
    };
  }

  try {
    // Extract owner and repo name from full_name
    const [owner, repoName] = repo.full_name.split("/");
    const readmeContent = await fetchRepoReadme(owner, repoName);

    return {
      readme: readmeContent.content || "",
      html_url: readmeContent.html_url,
      __duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`Failed to fetch README for ${fullName}:`, error);
    return {
      error: `Failed to fetch README for '${fullName}'`,
      __duration: Date.now() - startTime
    };
  }
}

/**
 * Create Get Repository README Tool - Complete tool definition
 */
export function createGetRepositoryReadmeTool(repos: GitHubRepo[]) {
  return tool({
    description: "获取某个项目的 README 文档内容，以便更好地了解项目",
    inputSchema: z.object({
      fullName: z.string(),
    }),
    execute: async (params: GetReadmeInput) => {
      return getRepositoryReadmeTool(repos, params.fullName);
    },
  });
}
