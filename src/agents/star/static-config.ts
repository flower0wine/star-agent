/**
 * Star Agent Static Configuration
 *
 * 定义 Star Agent 特有的静态配置类型和默认值
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Star 仓库获取模式
 */
export type StarFetchMode = "manual" | "on-login" | "scheduled";

/**
 * Star Agent 静态配置
 */
export interface StarAgentStaticConfig {
  /** 仓库获取模式 */
  fetchMode: StarFetchMode;
  /** 定时刷新间隔（分钟），仅 scheduled 模式有效 */
  fetchIntervalMinutes: number;
  /** 上次获取时间 */
  lastFetchedAt: number | null;
  /** 是否在后台自动刷新 */
  backgroundRefresh: boolean;
}

// ============================================================================
// Default Config
// ============================================================================

export const DEFAULT_STAR_STATIC_CONFIG: StarAgentStaticConfig = {
  fetchMode: "on-login",
  fetchIntervalMinutes: 60,
  lastFetchedAt: null,
  backgroundRefresh: false,
};

// ============================================================================
// Config Options
// ============================================================================

export const FETCH_MODE_OPTIONS: { value: StarFetchMode; label: string; description: string }[] = [
  {
    value: "manual",
    label: "手动刷新",
    description: "仅在点击刷新按钮时更新仓库列表",
  },
  {
    value: "on-login",
    label: "登录时刷新",
    description: "每次登录时自动更新仓库列表",
  },
  {
    value: "scheduled",
    label: "定时刷新",
    description: "按设定的时间间隔自动更新仓库列表",
  },
];

export const FETCH_INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: "15 分钟" },
  { value: 30, label: "30 分钟" },
  { value: 60, label: "1 小时" },
  { value: 120, label: "2 小时" },
  { value: 360, label: "6 小时" },
  { value: 720, label: "12 小时" },
  { value: 1440, label: "24 小时" },
];
