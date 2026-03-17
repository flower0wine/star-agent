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
}

/**
 * Create Get All Repositories Tool
 *
 * Used when repos count <= 200, fetches all repos for direct processing
 */
export function createGetAllReposTool(repos: GitHubRepo[]) {
  return tool({
    description: "获取所有仓库列表，仅在仓库数量少于等于 200 时使用",
    inputSchema: z.object({}),
    execute: async (): Promise<GetAllReposOutput> => {
      return {
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
      };
    },
  });
}
