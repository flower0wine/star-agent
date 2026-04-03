import type { PatentRuntimeConfig } from "./static-config";
import { createAnalyzePatentTrendsTool, createSearchPatentsTool } from "./tools";

export function createPatentTools(runtimeConfig: PatentRuntimeConfig) {
  return {
    searchPatents: createSearchPatentsTool(runtimeConfig),
    analyzePatentTrends: createAnalyzePatentTrendsTool(runtimeConfig),
  };
}

export type PatentTools = ReturnType<typeof createPatentTools>;

