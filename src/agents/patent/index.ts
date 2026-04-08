import type { AgentConfig } from "@/lib/agents/registry";
import { createPromptTemplateVars, renderPromptTemplate } from "@/lib/agents/prompt-template";
import { getDefaultSystemPromptTemplate } from "@/lib/agents/default-system-prompt-template";

import { patentAgent } from "./config";
import type { PatentRuntimeConfig } from "./static-config";
import { createPatentTools } from "./tools";

export function createPatentAgent(runtimeConfig: PatentRuntimeConfig): AgentConfig {
  const tools = createPatentTools(runtimeConfig);

  return {
    id: patentAgent.id,
    name: patentAgent.name,
    description: patentAgent.description,
    icon: patentAgent.icon,

    getTools: () => tools,

    getSystemPrompt: () => renderPromptTemplate(
      getDefaultSystemPromptTemplate("patent"),
      createPromptTemplateVars({
        extras: {
          provider: runtimeConfig.provider,
          default_lookback_months: runtimeConfig.defaultLookbackMonths,
          max_results_per_request: runtimeConfig.maxResultsPerRequest,
          default_sort_by: runtimeConfig.defaultSortBy,
        },
      })
    ),
  };
}

export { patentAgent };

