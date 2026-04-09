/**
 * Agent Configuration Hook
 *
 * 提供便捷的 Agent 配置管理 API
 * 封装 store 操作，支持类型安全的配置访问
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import type { AgentConfiguration, AgentDynamicConfig } from "@/lib/storage";
import { useAgentConfigStore } from "@/stores/agent-config-store";

// ============================================================================
// Types
// ============================================================================

export interface UseAgentConfigOptions<TStatic> {
  /** Agent ID */
  agentId: string;
  /** 默认静态配置 */
  defaultStaticConfig: TStatic;
}

export interface UseAgentConfigReturn<TStatic> {
  /** 当前配置 */
  config: AgentConfiguration<TStatic> | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 更新静态配置 */
  updateStaticConfig: (updates: Partial<TStatic>) => Promise<void>;
  /** 更新动态配置 */
  updateDynamicConfig: (updates: Partial<AgentDynamicConfig>) => Promise<void>;
  /** 重置配置 */
  resetConfig: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Agent 配置 Hook
 *
 * @example
 * ```tsx
 * const { config, updateStaticConfig } = useAgentConfig({
 *   agentId: "star",
 *   defaultStaticConfig: DEFAULT_STAR_STATIC_CONFIG,
 * });
 *
 * // 更新配置
 * await updateStaticConfig({ fetchMode: "scheduled" });
 * ```
 */
export function useAgentConfig<TStatic = Record<string, unknown>>({
  agentId,
  defaultStaticConfig,
}: UseAgentConfigOptions<TStatic>): UseAgentConfigReturn<TStatic> {
  const [config, setConfig] = useState<AgentConfiguration<TStatic> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const liveConfig = useAgentConfigStore((state) => state.configs.get(agentId) as AgentConfiguration<TStatic> | undefined);

  const {
    getConfig,
    updateStatic,
    updateDynamic,
    reset,
    initialize,
    isInitialized,
  } = useAgentConfigStore();

  // 初始化并加载配置
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      try {
        if (!isInitialized) {
          await initialize();
        }
        const loadedConfig = await getConfig(agentId, defaultStaticConfig);
        setConfig(loadedConfig);
      } catch (error) {
        console.error(`Failed to load config for agent ${agentId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadConfig();
  }, [agentId, defaultStaticConfig, getConfig, initialize, isInitialized]);

  useEffect(() => {
    const refreshFromStorage = async () => {
      const latest = await getConfig(agentId, defaultStaticConfig);
      setConfig(latest);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshFromStorage();
      }
    };
    const handleWindowFocus = () => {
      void refreshFromStorage();
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [agentId, defaultStaticConfig, getConfig]);

  // 同步其他页面/组件对同一 Agent 配置的修改，避免使用过期配置。
  useEffect(() => {
    if (!liveConfig) {
      return;
    }
    setConfig(liveConfig);
  }, [liveConfig]);

  // 更新静态配置
  const updateStaticConfig = useCallback(
    async (updates: Partial<TStatic>) => {
      await updateStatic(agentId, updates, defaultStaticConfig);
      const updated = await getConfig(agentId, defaultStaticConfig);
      setConfig(updated);
    },
    [agentId, defaultStaticConfig, getConfig, updateStatic]
  );

  // 更新动态配置
  const updateDynamicConfig = useCallback(
    async (updates: Partial<AgentDynamicConfig>) => {
      await updateDynamic(agentId, updates, defaultStaticConfig);
      const updated = await getConfig(agentId, defaultStaticConfig);
      setConfig(updated);
    },
    [agentId, defaultStaticConfig, getConfig, updateDynamic]
  );

  // 重置配置
  const resetConfig = useCallback(async () => {
    await reset(agentId, defaultStaticConfig);
    const updated = await getConfig(agentId, defaultStaticConfig);
    setConfig(updated);
  }, [agentId, defaultStaticConfig, getConfig, reset]);

  return {
    config,
    isLoading,
    updateStaticConfig,
    updateDynamicConfig,
    resetConfig,
  };
}
