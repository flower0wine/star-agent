/**
 * GitHub Utilities
 *
 * Shared utility functions for GitHub repo operations
 */

import type { GitHubRepo } from "./api";

/**
 * Format repos for initial context (used in system prompt)
 * Format: full_name | description | stars | language | topics
 */
export function formatReposForInitialContext(repos: GitHubRepo[]): string {
  return repos
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
    .join("\n");
}
