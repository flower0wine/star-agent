/**
 * Get All Repositories Tool
 *
 * Tool for fetching all repositories when repos count <= 200
 */

import { tool } from "ai";
import { z } from "zod";
import type { GitHubRepo } from "@/lib/github/api";

export interface GetAllReposInput {
  /** Empty input - just trigger fetching all repos */
}

export interface GetAllReposOutput {
  repos: string;
  totalCount: number;
  message: string;
  __duration?: number;
}

/**
 * Create Get All Repositories Tool
 *
 * Used when repos count <= 200, fetches all repos for direct processing
 */
export function createGetAllReposTool(repos: GitHubRepo[]) {
  return tool({
    description: "获取所有仓库列表，在仓库数量小于 200 时可以调用，大于 200 时使用会提示禁止调用",
    inputSchema: z.object({}),
    execute: async (): Promise<GetAllReposOutput> => {
      const startTime = Date.now();
      if (repos.length > 200) {
        throw new Error("repos 数量超过 200，禁止调用");
      }
      const result = {
        repos: repos
          .map((repo) => {
            const parts = [
              repo.full_name,
              repo.description || "无描述",
              `⭐${repo.stargazers_count}`,
              repo.language || "",
              repo.topics.join(", "),
            ];
            return parts.join(" | ");
          })
          .join("\n"),
        totalCount: repos.length,
        message: `已获取全部 ${repos.length} 个仓库`,
        __duration: Date.now() - startTime,
      };
      // eslint-disable-next-line no-console
      console.log(`[getAllReposTool] Executed in ${result.__duration}ms, repos: ${result.totalCount}`);
      return result;
    },
  });
}
