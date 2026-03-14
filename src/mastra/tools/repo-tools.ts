// =============================================================================
// GitHub Repository Tools for Mastra Agent
// =============================================================================

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { githubApi } from "@/lib/services/github-api";

// =============================================================================
// Search Repositories Tool (Level 1 - Basic Info)
// =============================================================================

const searchReposInputSchema = z.object({
  query: z.string().describe("Search query to match against repository name, description, topics, or language"),
  limit: z.number().optional().default(10).describe("Maximum number of results to return"),
});

const searchReposOutputSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    description: z.string().nullable(),
    html_url: z.string(),
    topics: z.array(z.string()),
    language: z.string().nullable(),
    stargazers_count: z.number(),
    forks_count: z.number(),
    updated_at: z.string(),
    owner: z.object({
      login: z.string(),
      avatar_url: z.string(),
    }),
  })
);

export const searchReposTool = createTool({
  id: "search_repos",
  description:
    "Search through your starred GitHub repositories by name, description, topics, or programming language. Use this tool to find repositories that match what the user is looking for. This tool uses basic repository information (Level 1) and is the primary way to discover relevant repositories.",
  inputSchema: searchReposInputSchema,
  outputSchema: searchReposOutputSchema,
  execute: async (inputData) => {
    try {
      const repos = await githubApi.searchRepos(inputData.query, inputData.limit);
      return repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        topics: repo.topics || [],
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url,
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      throw new Error(`Failed to search repositories: ${message}`);
    }
  },
});

// =============================================================================
// Get Repository Details Tool (Level 2 - Extended Metadata)
// =============================================================================

const getRepoDetailsInputSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
});

const getRepoDetailsOutputSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string(),
  topics: z.array(z.string()),
  language: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  updated_at: z.string(),
  created_at: z.string(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string(),
  }),
  license: z
    .object({
      name: z.string(),
      spdx_id: z.string(),
    })
    .nullable(),
  open_issues_count: z.number(),
  default_branch: z.string(),
  size: z.number(),
  watchers_count: z.number(),
  fromCache: z.boolean(),
});

export const getRepoDetailsTool = createTool({
  id: "get_repo_details",
  description:
    "Get detailed information about a specific GitHub repository. Use this when you need more than basic info - like license details, issue count, repository size, or default branch. This fetches Level 2 data.",
  inputSchema: getRepoDetailsInputSchema,
  outputSchema: getRepoDetailsOutputSchema,
  execute: async (inputData) => {
    try {
      const { data, fromCache } = await githubApi.getRepoDetails(
        inputData.owner,
        inputData.repo
      );
      return {
        id: data.id,
        name: data.name,
        full_name: data.full_name,
        description: data.description,
        html_url: data.html_url,
        topics: data.topics || [],
        language: data.language,
        stargazers_count: data.stargazers_count,
        forks_count: data.forks_count,
        updated_at: data.updated_at,
        created_at: data.created_at,
        owner: {
          login: data.owner.login,
          avatar_url: data.owner.avatar_url,
        },
        license: data.license,
        open_issues_count: data.open_issues_count,
        default_branch: data.default_branch,
        size: data.size,
        watchers_count: data.watchers_count,
        fromCache,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get repo details";
      throw new Error(`Failed to get repository details: ${message}`);
    }
  },
});

// =============================================================================
// Get Repository README Tool (Level 3 - Content)
// =============================================================================

const getReadmeInputSchema = z.object({
  owner: z.string().describe("Repository owner (username or organization)"),
  repo: z.string().describe("Repository name"),
  branch: z.string().optional().describe("Branch name (optional, defaults to default branch)"),
});

const getReadmeOutputSchema = z.object({
  content: z.string().describe("README content in plain text"),
  encoding: z.string(),
  fromCache: z.boolean(),
  truncated: z.boolean().optional(),
});

export const getReadmeTool = createTool({
  id: "get_readme",
  description:
    "Get the README content of a GitHub repository for detailed analysis. Use this when the user wants to understand what a repository does in detail, or when comparing similar repositories. This fetches Level 3 content. NOTE: Only fetch README when explicitly needed - it consumes API rate limit and takes longer than basic searches.",
  inputSchema: getReadmeInputSchema,
  outputSchema: getReadmeOutputSchema,
  execute: async (inputData) => {
    try {
      const { content, encoding, fromCache } = await githubApi.getReadme(
        inputData.owner,
        inputData.repo,
        inputData.branch
      );

      // Truncate if too long for context
      const maxLength = 50000;
      const truncated = content.length > maxLength;

      return {
        content: truncated ? `${content.slice(0, maxLength)}\n\n[Content truncated...]` : content,
        encoding,
        fromCache,
        truncated,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get README";
      throw new Error(`Failed to get README: ${message}`);
    }
  },
});

// =============================================================================
// Get Starred Repos Summary Tool
// =============================================================================

const getStarredReposSummaryInputSchema = z.object({
  forceRefresh: z
    .boolean()
    .optional()
    .default(false)
    .describe("Force refresh from GitHub API instead of using cache"),
});

const getStarredReposSummaryOutputSchema = z.object({
  totalCount: z.number(),
  repos: z.array(
    z.object({
      name: z.string(),
      full_name: z.string(),
      description: z.string().nullable(),
      topics: z.array(z.string()),
      language: z.string().nullable(),
      stargazers_count: z.number(),
    })
  ),
  languages: z.record(z.string(), z.number()).describe("Language distribution"),
});

export const getStarredReposSummaryTool = createTool({
  id: "get_starred_repos_summary",
  description:
    "Get a summary of all your starred repositories including total count and language distribution. This is useful for understanding the overall composition of your starred repos.",
  inputSchema: getStarredReposSummaryInputSchema,
  outputSchema: getStarredReposSummaryOutputSchema,
  execute: async (inputData) => {
    try {
      const response = await githubApi.getStarredRepos({
        forceRefresh: inputData.forceRefresh,
      });

      // Calculate language distribution
      const languages: Record<string, number> = {};
      response.data.forEach((repo) => {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
      });

      return {
        totalCount: response.totalCount,
        repos: response.data.map((repo) => ({
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          topics: repo.topics || [],
          language: repo.language,
          stargazers_count: repo.stargazers_count,
        })),
        languages,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get summary";
      throw new Error(`Failed to get starred repos summary: ${message}`);
    }
  },
});

// =============================================================================
// Export all tools
// =============================================================================

export const repoTools = {
  searchRepos: searchReposTool,
  getRepoDetails: getRepoDetailsTool,
  getReadme: getReadmeTool,
  getStarredReposSummary: getStarredReposSummaryTool,
};
