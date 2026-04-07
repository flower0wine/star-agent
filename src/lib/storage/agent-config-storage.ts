/**
 * Agent Configuration Storage
 *
 * 管理 Agent 配置的 IndexedDB 存储操作
 */

import { getDB } from "./db";
import type { AgentConfiguration, AgentDynamicConfig } from "./db";

// ============================================================================
// Default Dynamic Config
// ============================================================================

export const DEFAULT_DYNAMIC_CONFIG: AgentDynamicConfig = {
  systemPromptTemplate: "",
  toolConfigs: {},
  customParams: {},
};

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * 获取 Agent 配置
 */
export async function getAgentConfig<TStatic = Record<string, unknown>>(
  agentId: string
): Promise<AgentConfiguration<TStatic> | undefined> {
  const db = await getDB();
  const config = await db.get("agentConfigs", agentId);
  return config as AgentConfiguration<TStatic> | undefined;
}

/**
 * 获取或创建 Agent 配置
 * 如果配置不存在，使用默认值创建
 */
export async function getOrCreateAgentConfig<TStatic = Record<string, unknown>>(
  agentId: string,
  defaultStaticConfig: TStatic
): Promise<AgentConfiguration<TStatic>> {
  const existing = await getAgentConfig<TStatic>(agentId);
  if (existing) {
    return existing;
  }

  const newConfig: AgentConfiguration<TStatic> = {
    agentId,
    version: 1,
    updatedAt: Date.now(),
    staticConfig: defaultStaticConfig,
    dynamicConfig: { ...DEFAULT_DYNAMIC_CONFIG },
  };

  await saveAgentConfig(newConfig);
  return newConfig;
}

/**
 * 保存 Agent 配置
 */
export async function saveAgentConfig<TStatic = Record<string, unknown>>(
  config: AgentConfiguration<TStatic>
): Promise<void> {
  const db = await getDB();
  const updatedConfig = {
    ...config,
    updatedAt: Date.now(),
  };
  await db.put("agentConfigs", updatedConfig as AgentConfiguration);
}

/**
 * 更新 Agent 静态配置
 */
export async function updateStaticConfig<TStatic = Record<string, unknown>>(
  agentId: string,
  updates: Partial<TStatic>,
  defaultStaticConfig: TStatic
): Promise<AgentConfiguration<TStatic>> {
  const config = await getOrCreateAgentConfig(agentId, defaultStaticConfig);
  const updatedConfig: AgentConfiguration<TStatic> = {
    ...config,
    staticConfig: {
      ...config.staticConfig,
      ...updates,
    },
    version: config.version + 1,
    updatedAt: Date.now(),
  };

  await saveAgentConfig(updatedConfig);
  return updatedConfig;
}

/**
 * 更新 Agent 动态配置
 */
export async function updateDynamicConfig<TStatic = Record<string, unknown>>(
  agentId: string,
  updates: Partial<AgentDynamicConfig>,
  defaultStaticConfig: TStatic
): Promise<AgentConfiguration<TStatic>> {
  const config = await getOrCreateAgentConfig(agentId, defaultStaticConfig);
  const updatedConfig: AgentConfiguration<TStatic> = {
    ...config,
    dynamicConfig: {
      ...config.dynamicConfig,
      ...updates,
    },
    version: config.version + 1,
    updatedAt: Date.now(),
  };

  await saveAgentConfig(updatedConfig);
  return updatedConfig;
}

/**
 * 重置 Agent 配置为默认值
 */
export async function resetAgentConfig<TStatic = Record<string, unknown>>(
  agentId: string,
  defaultStaticConfig: TStatic
): Promise<AgentConfiguration<TStatic>> {
  const newConfig: AgentConfiguration<TStatic> = {
    agentId,
    version: 1,
    updatedAt: Date.now(),
    staticConfig: defaultStaticConfig,
    dynamicConfig: { ...DEFAULT_DYNAMIC_CONFIG },
  };

  await saveAgentConfig(newConfig);
  return newConfig;
}

/**
 * 删除 Agent 配置
 */
export async function deleteAgentConfig(agentId: string): Promise<void> {
  const db = await getDB();
  await db.delete("agentConfigs", agentId);
}

/**
 * 获取所有 Agent 配置
 */
export async function getAllAgentConfigs(): Promise<AgentConfiguration[]> {
  const db = await getDB();
  return db.getAll("agentConfigs");
}
