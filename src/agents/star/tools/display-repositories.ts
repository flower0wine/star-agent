/**
 * Display Repositories Tool
 *
 * Tool for displaying repositories as UI cards with progressive loading
 * Optimized: Agent only passes full_name strings, tool looks up details from repos
 * Minimal data: Only returns fields needed by GitHubRepo component
 */

import { tool } from "ai";
import { z } from "zod";
import type { GitHubRepo } from "@/lib/github/api";

/**
 * Minimal repo data needed by the UI component
 * Excludes unused fields to reduce token usage
 */
export interface DisplayRepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  license: {
    spdx_id: string;
  } | null;
  watchers_count: number;
  visibility: string;
}

/**
 * Convert full GitHubRepo to minimal DisplayRepoData
 */
function toDisplayRepoData(repo: GitHubRepo): DisplayRepoData {
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    language: repo.language,
    topics: repo.topics,
    updated_at: repo.updated_at,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
      html_url: repo.owner.html_url,
    },
    license: repo.license,
    watchers_count: repo.watchers_count,
    visibility: repo.visibility,
  };
}

/**
 * Display repositories input schema - simplified to only require full_name strings
 */
export const displayRepositoriesSchema = z.object({
  fullNames: z.array(z.string()).min(1),
});

export type DisplayRepositoriesInput = z.infer<typeof displayRepositoriesSchema>;

/**
 * Create Display Repositories Tool
 * @param repos - GitHubRepo array to look up details from
 */
export function createDisplayRepositoriesTool(repos: GitHubRepo[]) {
  return tool({
    description: "当你想让用户看到你选择的Github仓库时，使用这个工具来展示，这个工具会将你选择的仓库以 UI 的形式呈现给用户，不可直接使用文本的形式呈现",
    inputSchema: z.object({
      fullNames: z.array(z.string()).min(1).describe("仓库名的数组，例如：['owner/repo']"),
    }),
    // Use async generator for progressive loading
    async* execute(params: DisplayRepositoriesInput): AsyncGenerator<{
      state: "loading" | "partial" | "complete";
      repos: DisplayRepoData[];
      loaded: number;
      total: number;
      message: string;
      __duration?: number;
    }> {
      // Look up full repo details from the repos array
      const reposMap = new Map(repos.map((r) => [r.full_name, r]));
      const foundRepos = params.fullNames
        .map((fullName) => reposMap.get(fullName))
        .filter((r): r is GitHubRepo => r !== undefined);

      if (foundRepos.length === 0) {
        throw new Error("未找到指定的仓库，请检查仓库名称是否正确");
      }

      // Convert to minimal display data
      const displayRepos = foundRepos.map(toDisplayRepoData);

      const total = foundRepos.length;
      const batchSize = 3;
      const startTime = Date.now();

      // Step 1: Initial loading state
      const loadingState = {
        state: "loading" as const,
        repos: [],
        loaded: 0,
        total,
        message: `正在加载 ${total} 个仓库...`,
      };
      yield loadingState;

      // Step 2: Yield repos in batches for progressive loading
      for (let i = 0; i < total; i += batchSize) {
        const batch = displayRepos.slice(i, i + batchSize);
        const loaded = Math.min(i + batchSize, total);

        const partialState = {
          state: "partial" as const,
          repos: batch,
          loaded,
          total,
          message: `已加载 ${loaded}/${total} 个仓库`,
        };
        yield partialState;

        // Small delay for visual effect
        if (i + batchSize < total) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // Step 3: Final complete state
      const duration = Date.now() - startTime;

      console.log(`[displayRepositoriesTool] Executed in ${duration}ms, repos: ${displayRepos.length}`);
      const completeState = {
        state: "complete" as const,
        repos: displayRepos,
        loaded: total,
        total,
        message: `已显示全部 ${total} 个仓库`,
        __duration: duration,
      };
      yield completeState;
    },
  });
}
