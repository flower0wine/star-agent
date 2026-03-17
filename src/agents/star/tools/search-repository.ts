/**
 * Search Repository Tool
 */

import { tool } from "ai";
import { z } from "zod";
import {
  filterRepos,
  filterReposByOptions,
  getUniqueLanguages,
  getUniqueTopics,
} from "@/lib/github/api";
import type { GitHubRepo, RepoFilterOptions } from "@/lib/github/api";

/**
 * Lightweight repo summary for AI context
 */
export interface RepoSummary {
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
  };
  license: {
    spdx_id: string;
  } | null;
  visibility: string;
}

export interface SearchInput {
  query?: string;
  language?: string;
  topic?: string;
  minStars?: number;
  maxStars?: number;
  sortBy?: "stars" | "updated" | "name";
  sortOrder?: "asc" | "desc";
  limit?: number;
}

export interface SearchOutput {
  repos: RepoSummary[];
  totalCount: number;
  formatted: string;
  availableLanguages: string[];
  availableTopics: string[];
  __duration: number;
}

/**
 * Convert full GitHubRepo to lightweight RepoSummary
 */
function toRepoSummary(repo: GitHubRepo): RepoSummary {
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
    },
    license: repo.license,
    visibility: repo.visibility,
  };
}

/**
 * Format repos for AI context
 */
function formatReposForContext(
  repos: GitHubRepo[] | RepoSummary[],
  maxLength: number = 15
): string {
  if (repos.length === 0) {
    return "No repositories found matching your criteria.";
  }

  const formatRepo = (repo: GitHubRepo | RepoSummary) => `
## ${repo.full_name}
- ⭐ Stars: ${repo.stargazers_count.toLocaleString()}
- 🍴 Forks: ${repo.forks_count.toLocaleString()}
- 💻 Language: ${repo.language || "N/A"}
- 📝 Description: ${repo.description || "No description"}
- 🏷️ Topics: ${repo.topics.join(", ") || "None"}
- 👤 Owner: ${repo.owner.login}
- 🔗 URL: ${repo.html_url}
- 📅 Updated: ${new Date(repo.updated_at).toLocaleDateString()}
${repo.license ? `- 📜 License: ${repo.license.spdx_id}` : ""}
`.trim();

  const formatted = repos.slice(0, maxLength).map(formatRepo).join("\n\n");

  if (repos.length > maxLength) {
    return (
      `${formatted
      }\n\n... and ${repos.length - maxLength} more repositories. Please use the search tool to find more specific results.`
    );
  }

  return formatted;
}

/**
 * Search repositories tool implementation
 */
export async function searchRepositoriesTool(
  repos: GitHubRepo[],
  input: SearchInput
): Promise<SearchOutput> {
  const startTime = Date.now();

  let filtered = repos;

  // Text search
  if (input.query) {
    filtered = filterRepos(filtered, input.query);
  }

  // Apply filters
  const filterOptions: RepoFilterOptions = {};
  if (input.language)
    filterOptions.language = input.language;
  if (input.topic)
    filterOptions.topic = input.topic;
  if (input.minStars !== undefined)
    filterOptions.minStars = input.minStars;
  if (input.maxStars !== undefined)
    filterOptions.maxStars = input.maxStars;
  if (input.sortBy)
    filterOptions.sortBy = input.sortBy;
  if (input.sortOrder)
    filterOptions.sortOrder = input.sortOrder;

  if (Object.keys(filterOptions).length > 0) {
    filtered = filterReposByOptions(filtered, filterOptions);
  }

  // Apply limit
  const limit = input.limit || 10;
  const limited = filtered.slice(0, limit);

  // Convert to lightweight summary
  const summaryRepos = limited.map(toRepoSummary);

  return {
    repos: summaryRepos,
    totalCount: filtered.length,
    formatted: formatReposForContext(summaryRepos),
    availableLanguages: getUniqueLanguages(repos),
    availableTopics: getUniqueTopics(repos).slice(0, 20),
    __duration: Date.now() - startTime,
  };
}

/**
 * Create Search Repositories Tool - Complete tool definition
 */
export function createSearchRepositoriesTool(repos: GitHubRepo[]) {
  return tool({
    description: "Search and filter repositories by query, language, topic, or star count",
    inputSchema: z.object({
      query: z.string().optional(),
      language: z.string().optional(),
      topic: z.string().optional(),
      minStars: z.number().optional(),
      maxStars: z.number().optional(),
      sortBy: z.enum(["stars", "updated", "name"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      limit: z.number().optional(),
    }),
    execute: async (params: SearchInput) => {
      return searchRepositoriesTool(repos, params);
    },
  });
}
