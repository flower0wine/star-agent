import type { AgentToolConfig } from "@/lib/agents/base/types";
import { SubAgentConfigError, resolveEnabledProfilesForAgent } from "./profile-schema";
import type { SubAgentProfile } from "./types";

interface ResolveBoundSubAgentOptions {
  customParams?: Record<string, unknown>;
  toolConfig?: AgentToolConfig;
}

function resolveBoundProfileIds(toolConfig?: AgentToolConfig): string[] {
  const ids = toolConfig?.boundSubAgentIds || [];
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids
    .filter(id => typeof id === "string")
    .map(id => id.trim())
    .filter(Boolean);
}

export function resolveBoundSubAgentProfile(
  options: ResolveBoundSubAgentOptions
): SubAgentProfile {
  const boundIds = resolveBoundProfileIds(options.toolConfig);
  if (boundIds.length === 0) {
    throw new SubAgentConfigError(
      "SUBAGENT_BINDING_MISSING",
      "createSubAgent 工具未绑定任何 SubAgent，请在设置中配置绑定。"
    );
  }

  if (boundIds.length > 1) {
    throw new SubAgentConfigError(
      "SUBAGENT_BINDING_AMBIGUOUS",
      "createSubAgent 工具当前绑定了多个 SubAgent，请仅保留一个绑定。"
    );
  }

  const profiles = resolveEnabledProfilesForAgent(options.customParams);
  const selected = profiles.find(profile => profile.id === boundIds[0]);
  if (!selected) {
    throw new SubAgentConfigError(
      "SUBAGENT_PROFILE_NOT_FOUND",
      `绑定的 SubAgent "${boundIds[0]}" 不存在或未启用。`
    );
  }

  return selected;
}
