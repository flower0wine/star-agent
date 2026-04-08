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
      "工具执行失败，请告知用户原因：createSubAgent 未选择 SubAgent Profile。请在 设置 > Agent > 工具中心 > createSubAgent > 绑定 SubAgent 中选择一个已启用 Profile。"
    );
  }

  if (boundIds.length > 1) {
    throw new SubAgentConfigError(
      "SUBAGENT_BINDING_AMBIGUOUS",
      "工具执行失败，请告知用户原因：createSubAgent 工具当前绑定了多个 SubAgent，请仅保留一个绑定。"
    );
  }

  const profiles = resolveEnabledProfilesForAgent(options.customParams);
  const selected = profiles.find(profile => profile.id === boundIds[0]);
  if (!selected) {
    throw new SubAgentConfigError(
      "SUBAGENT_PROFILE_NOT_FOUND",
      `工具执行失败，请告知用户原因：已绑定的 SubAgent Profile "${boundIds[0]}" 不存在或未启用，请重新选择一个已启用 Profile。`
    );
  }

  return selected;
}
