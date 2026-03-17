/**
 * GitHub API Utilities
 * Uses unauthenticated API to fetch user's starred repositories
 */

import { Buffer } from "node:buffer";

export interface GitHubRepo {
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
  created_at: string;
  pushed_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  license: {
    spdx_id: string;
  } | null;
  watchers_count: number;
  open_issues_count: number;
  default_branch: string;
  visibility: string;
}

export interface GitHubStarsResponse {
  repos: GitHubRepo[];
  totalCount: number;
  hasMore: boolean;
}

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Fetch all starred repositories for a user using unauthenticated API
 * Uses pagination to get all repos
 */
export async function fetchUserStars(username: string): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `${GITHUB_API_BASE}/users/${username}/starred?per_page=${perPage}&page=${page}&sort=updated`,
      {
        headers: {
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Star-Agent-Chatbot",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`User "${username}" not found`);
      }
      if (response.status === 403) {
        throw new Error("GitHub API rate limit exceeded. Please try again later.");
      }
      throw new Error(`Failed to fetch stars: ${response.statusText}`);
    }

    const repos: GitHubRepo[] = await response.json();

    if (repos.length === 0 || repos.length < perPage) {
      hasMore = false;
    }

    allRepos.push(...repos);
    page++;

    // Safety limit to prevent infinite loops
    if (page > 10) {
      hasMore = false;
    }
  }

  return allRepos;
}

/**
 * Get basic user info (to verify username exists)
 */
export async function getGitHubUser(username: string): Promise<{
  login: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
}> {
  const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, {
    headers: {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Star-Agent-Chatbot",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`User "${username}" not found`);
    }
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search repositories by query (used for filtering)
 */
export function filterRepos(
  repos: GitHubRepo[],
  query: string
): GitHubRepo[] {
  const lowerQuery = query.toLowerCase();

  return repos.filter((repo) => {
    const searchText = [
      repo.name,
      repo.full_name,
      repo.description,
      repo.language,
      ...repo.topics,
      repo.owner.login,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(lowerQuery);
  });
}

/**
 * Filter repos by multiple criteria
 */
export interface RepoFilterOptions {
  language?: string;
  topic?: string;
  minStars?: number;
  maxStars?: number;
  sortBy?: "stars" | "updated" | "name";
  sortOrder?: "asc" | "desc";
}

export function filterReposByOptions(
  repos: GitHubRepo[],
  options: RepoFilterOptions
): GitHubRepo[] {
  let filtered = [...repos];

  if (options.language) {
    filtered = filtered.filter(
      (r) => r.language?.toLowerCase() === options.language!.toLowerCase()
    );
  }

  if (options.topic) {
    filtered = filtered.filter((r) =>
      r.topics.some(
        (t) => t.toLowerCase() === options.topic!.toLowerCase()
      )
    );
  }

  if (options.minStars !== undefined) {
    filtered = filtered.filter(
      (r) => r.stargazers_count >= options.minStars!
    );
  }

  if (options.maxStars !== undefined) {
    filtered = filtered.filter(
      (r) => r.stargazers_count <= options.maxStars!
    );
  }

  // Sort
  const sortKey = options.sortBy || "updated";
  const sortOrder = options.sortOrder || "desc";

  filtered.sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortKey) {
      case "stars":
        aVal = a.stargazers_count;
        bVal = b.stargazers_count;
        break;
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case "updated":
      default:
        aVal = new Date(a.updated_at).getTime();
        bVal = new Date(b.updated_at).getTime();
    }

    if (sortOrder === "asc") {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }
    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
  });

  return filtered;
}

/**
 * Get unique languages from repos
 */
export function getUniqueLanguages(repos: GitHubRepo[]): string[] {
  const languages = new Set<string>();
  repos.forEach((repo) => {
    if (repo.language) {
      languages.add(repo.language);
    }
  });
  return [...languages].sort();
}

/**
 * Get unique topics from repos
 */
export function getUniqueTopics(repos: GitHubRepo[]): string[] {
  const topics = new Set<string>();
  repos.forEach((repo) => {
    repo.topics.forEach((topic) => topics.add(topic));
  });
  return [...topics].sort();
}

/**
 * Fetch README content for a repository
 * Uses GitHub API: GET /repos/{owner}/{repo}/readme
 */
export interface RepoReadme {
  name: string;
  path: string;
  sha: string;
  size: number;
  content?: string; // Base64 encoded when encoding is base64
  encoding?: string;
  html_url: string;
  download_url: string | null;
}

export async function fetchRepoReadme(owner: string, repo: string): Promise<RepoReadme> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
    {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Star-Agent-Chatbot",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`README not found for ${owner}/${repo}`);
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }
    throw new Error(`Failed to fetch README: ${response.statusText}`);
  }

  const data: RepoReadme = await response.json();
  return data;
}

/**
 * Fetch README content and decode if needed
 * Returns the raw markdown content
 */
export async function fetchRepoReadmeContent(owner: string, repo: string): Promise<string> {
  const readme = await fetchRepoReadme(owner, repo);

  if (readme.encoding === "base64" && readme.content) {
    // Decode base64 and handle potential UTF-8 issues
    const decoded = Buffer.from(readme.content, "base64").toString("utf-8");
    return decoded;
  }

  return readme.content || "";
}
