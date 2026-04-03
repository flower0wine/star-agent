import type { AgentConfig } from "@/lib/agents/registry";

import { patentAgent } from "./config";
import { getPatentSystemPrompt } from "./prompt";
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

    getSystemPrompt: () => getPatentSystemPrompt({ runtimeConfig }),
  };
}

export { patentAgent };

