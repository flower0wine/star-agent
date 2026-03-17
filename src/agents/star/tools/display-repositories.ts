/**
 * Display Repositories Tool
 *
 * Tool for displaying repositories as UI cards with progressive loading
 */

import { tool } from "ai";
import { z } from "zod";

/**
 * Display repository schema
 */
const DisplayRepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullable(),
  html_url: z.string(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  language: z.string().nullable(),
  topics: z.array(z.string()),
  updated_at: z.string(),
  owner: z.object({
    login: z.string(),
    avatar_url: z.string(),
    html_url: z.string(),
  }),
  license: z.object({ spdx_id: z.string() }).nullable(),
  watchers_count: z.number(),
  visibility: z.string(),
});

/**
 * Display repositories input schema
 */
export const displayRepositoriesSchema = z.object({
  repos: z.array(DisplayRepoSchema),
});

export type DisplayRepositoriesInput = z.infer<typeof displayRepositoriesSchema>;

/**
 * Display repositories tool implementation
 * Uses async generator for progressive loading UI
 */
export async function* displayRepositoriesTool(
  params: DisplayRepositoriesInput
): AsyncGenerator<{
  state: "loading" | "partial" | "complete";
  repos: DisplayRepositoriesInput["repos"];
  loaded: number;
  total: number;
  message: string;
  __duration?: number;
}> {
  const repos = params.repos;
  const total = repos.length;
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
    const batch = repos.slice(i, i + batchSize);
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
  const completeState = {
    state: "complete" as const,
    repos,
    loaded: total,
    total,
    message: `已显示全部 ${total} 个仓库`,
    __duration: Date.now() - startTime,
  };
  yield completeState;
}

/**
 * Create Display Repositories Tool - Complete tool definition
 */
export function createDisplayRepositoriesTool() {
  return tool({
    description: "当你想让用户看到你选择的Github仓库时，使用这个工具来展示，这个工具会将你选择的仓库以 UI 的形式呈现给用户，不可直接使用文本的形式呈现",
    inputSchema: z.object({
      repos: z.array(DisplayRepoSchema),
    }),
    // Use async generator for progressive loading
    async* execute(params: DisplayRepositoriesInput) {
      yield* displayRepositoriesTool(params);
    },
  });
}
