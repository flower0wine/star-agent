/**
 * AI Tools for GitHub Star Repository Chat
 * These tools allow the AI to search and filter repositories
 */

import {
  filterRepos,
  filterReposByOptions,
  getUniqueLanguages,
  getUniqueTopics,
  fetchRepoReadme


} from "@/lib/github/api";
import type { GitHubRepo, RepoFilterOptions, RepoReadme } from "@/lib/github/api";

export type { GitHubRepo } from "@/lib/github/api";

/**
 * Lightweight repo summary for AI context - contains only essential fields
 * This reduces token usage when passing repo data to the model
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

/**
 * Convert full GitHubRepo to lightweight RepoSummary
 */
export function toRepoSummary(repo: GitHubRepo): RepoSummary {
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

export interface ToolInput {
  query?: string;
  language?: string;
  topic?: string;
  minStars?: number;
  maxStars?: number;
  sortBy?: "stars" | "updated" | "name";
  sortOrder?: "asc" | "desc";
  limit?: number;
}

export interface ToolOutput {
  repos: RepoSummary[];
  totalCount: number;
  filters: {
    query?: string;
    language?: string;
    topic?: string;
    minStars?: number;
    maxStars?: number;
    sortBy?: string;
    sortOrder?: string;
  };
  availableLanguages: string[];
  availableTopics: string[];
}

/**
 * Tool: Search repositories by query
 * Searches through repo names, descriptions, topics, and languages
 */
export async function searchRepositories(
  repos: GitHubRepo[],
  input: ToolInput
): Promise<ToolOutput> {
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
    filters: {
      query: input.query,
      language: input.language,
      topic: input.topic,
      minStars: input.minStars,
      maxStars: input.maxStars,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    },
    availableLanguages: getUniqueLanguages(repos),
    availableTopics: getUniqueTopics(repos),
  };
}

/**
 * Tool: Get repository README content
 * Fetches the README.md content from GitHub API
 */
export async function getRepositoryReadme(
  repos: GitHubRepo[],
  fullName: string
): Promise<{ readme: string; html_url: string } | null> {
  // Find the repo in local cache first
  const repo = repos.find(
    (r) =>
      r.full_name.toLowerCase() === fullName.toLowerCase()
      || r.name.toLowerCase() === fullName.toLowerCase()
  );

  if (!repo) {
    return null;
  }

  try {
    // Extract owner and repo name from full_name
    const [owner, repoName] = repo.full_name.split("/");
    const readmeContent = await fetchRepoReadme(owner, repoName);

    return {
      readme: readmeContent.content || "",
      html_url: readmeContent.html_url,
    };
  } catch (error) {
    // Return null if README not found or other error
    console.error(`Failed to fetch README for ${fullName}:`, error);
    return null;
  }
}

/**
 * Tool: Get all unique languages from repositories
 */
export function getLanguages(repos: GitHubRepo[]): string[] {
  return getUniqueLanguages(repos);
}

/**
 * Tool: Get all unique topics from repositories
 */
export function getTopics(repos: GitHubRepo[]): string[] {
  return getUniqueTopics(repos);
}

/**
 * Tool: Get repository statistics
 */
export function getRepositoryStats(repos: GitHubRepo[]): {
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  languages: Record<string, number>;
  topics: Record<string, number>;
} {
  const languages: Record<string, number> = {};
  const topics: Record<string, number> = {};
  let totalStars = 0;
  let totalForks = 0;

  repos.forEach((repo) => {
    totalStars += repo.stargazers_count;
    totalForks += repo.forks_count;

    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }

    repo.topics.forEach((topic) => {
      topics[topic] = (topics[topic] || 0) + 1;
    });
  });

  return {
    totalRepos: repos.length,
    totalStars,
    totalForks,
    languages,
    topics,
  };
}

/**
 * Format repository for display
 */
export function formatRepoForAI(repo: GitHubRepo | RepoSummary): string {
  return `
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
}

/**
 * Format multiple repos for AI context
 */
export function formatReposForContext(
  repos: GitHubRepo[] | RepoSummary[],
  maxLength: number = 15
): string {
  if (repos.length === 0) {
    return "No repositories found matching your criteria.";
  }

  const formatted = repos.slice(0, maxLength).map(formatRepoForAI).join("\n\n");

  if (repos.length > maxLength) {
    return (
      `${formatted
      }\n\n... and ${repos.length - maxLength} more repositories. Please use the search tool to find more specific results.`
    );
  }

  return formatted;
}
