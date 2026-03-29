/**
 * Agent Configuration Store
 *
 * 管理所有 Agent 的配置状态
 * 使用 Zustand 进行状态管理，与 IndexedDB 同步
 */

import { create } from "zustand";

import type { AgentConfiguration, AgentDynamicConfig } from "@/lib/storage";
import {
  getAllAgentConfigs,
  getOrCreateAgentConfig,
  resetAgentConfig,
  updateDynamicConfig,
  updateStaticConfig,
} from "@/lib/storage";

// ============================================================================
// Types
// ============================================================================

interface AgentConfigState {
  /** 所有 Agent 配置 */
  configs: Map<string, AgentConfiguration>;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否已初始化 */
  isInitialized: boolean;
}

interface AgentConfigActions {
  /** 初始化（加载所有配置） */
  initialize: () => Promise<void>;

  /** 获取 Agent 配置 */
  getConfig: <TStatic = Record<string, unknown>>(
    agentId: string,
    defaultStaticConfig: TStatic
  ) => Promise<AgentConfiguration<TStatic>>;

  /** 更新静态配置 */
  updateStatic: <TStatic = Record<string, unknown>>(
    agentId: string,
    updates: Partial<TStatic>,
    defaultStaticConfig: TStatic
  ) => Promise<void>;

  /** 更新动态配置 */
  updateDynamic: <TStatic = Record<string, unknown>>(
    agentId: string,
    updates: Partial<AgentDynamicConfig>,
    defaultStaticConfig: TStatic
  ) => Promise<void>;

  /** 重置配置 */
  reset: <TStatic = Record<string, unknown>>(
    agentId: string,
    defaultStaticConfig: TStatic
  ) => Promise<void>;
}

type AgentConfigStore = AgentConfigActions & AgentConfigState;

// ============================================================================
// Store Implementation
// ============================================================================

export const useAgentConfigStore = create<AgentConfigStore>((set, get) => ({
  configs: new Map(),
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    set({ isLoading: true });

    try {
      const configs = await getAllAgentConfigs();
      const configMap = new Map<string, AgentConfiguration>();
      for (const config of configs) {
        configMap.set(config.agentId, config);
      }
      set({ configs: configMap, isInitialized: true });
    } catch (error) {
      console.error("Failed to initialize agent configs:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  getConfig: async <TStatic = Record<string, unknown>>(
    agentId: string,
    defaultStaticConfig: TStatic
  ): Promise<AgentConfiguration<TStatic>> => {
    const { configs } = get();

    // 检查缓存
    const cached = configs.get(agentId);
    if (cached) {
      return cached as AgentConfiguration<TStatic>;
    }

    // 从数据库获取或创建
    const config = await getOrCreateAgentConfig(agentId, defaultStaticConfig);

    // 更新缓存
    set((state) => {
      const newConfigs = new Map(state.configs);
      newConfigs.set(agentId, config as AgentConfiguration);
      return { configs: newConfigs };
    });

    return config;
  },

  updateStatic: async <TStatic = Record<string, unknown>>(
    agentId: string,
    updates: Partial<TStatic>,
    defaultStaticConfig: TStatic
  ): Promise<void> => {
    const updated = await updateStaticConfig(agentId, updates, defaultStaticConfig);

    set((state) => {
      const newConfigs = new Map(state.configs);
      newConfigs.set(agentId, updated as AgentConfiguration);
      return { configs: newConfigs };
    });
  },

  updateDynamic: async <TStatic = Record<string, unknown>>(
    agentId: string,
    updates: Partial<AgentDynamicConfig>,
    defaultStaticConfig: TStatic
  ): Promise<void> => {
    const updated = await updateDynamicConfig(agentId, updates, defaultStaticConfig);

    set((state) => {
      const newConfigs = new Map(state.configs);
      newConfigs.set(agentId, updated as AgentConfiguration);
      return { configs: newConfigs };
    });
  },

  reset: async <TStatic = Record<string, unknown>>(
    agentId: string,
    defaultStaticConfig: TStatic
  ): Promise<void> => {
    const config = await resetAgentConfig(agentId, defaultStaticConfig);

    set((state) => {
      const newConfigs = new Map(state.configs);
      newConfigs.set(agentId, config as AgentConfiguration);
      return { configs: newConfigs };
    });
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * 获取特定 Agent 的配置
 */
export function useAgentConfigSelector<TStatic = Record<string, unknown>>(
  agentId: string
): AgentConfiguration<TStatic> | undefined {
  const configs = useAgentConfigStore((state) => state.configs);
  return configs.get(agentId) as AgentConfiguration<TStatic> | undefined;
}
