# Agent 配置系统架构设计

> **状态**: ✅ 已实现
> **更新时间**: 2026-03-29

## 一、现状分析

### 1.1 当前问题

| 问题 | 现状 | 影响 |
|------|------|------|
| GitHub 登录 | 仅输入用户名，无验证流程 | 用户体验差，无法处理错误 |
| Star 仓库获取 | 首次获取后存 localStorage，无刷新机制 | 数据陈旧，约 15 秒加载时间 |
| Agent 配置 | 硬编码，无用户配置能力 | 无法自定义工具、提示词 |
| 项目结构 | 功能分散，缺乏统一抽象 | 扩展困难 |

### 1.2 核心诉求

1. **通用多 Agent 平台**：支持任意 Agent 接入
2. **Agent 可配置**：静态配置 + 动态配置
3. **数据实时性**：缓存 + 可配置刷新策略
4. **易扩展架构**：单一职责，模块化

---

## 二、架构设计

### 2.1 Agent 配置模型

```typescript
// Agent 配置 Schema
interface AgentConfiguration {
  // === 元数据 ===
  agentId: string;
  version: number;
  updatedAt: number;

  // === 静态配置（Agent 特有）===
  staticConfig: Record<string, unknown>;
  // 例如 Star Agent:
  // {
  //   fetchMode: "manual" | "on-login" | "scheduled",
  //   fetchInterval: number, // 分钟
  //   lastFetchedAt: number,
  // }

  // === 动态配置（通用）===
  dynamicConfig: {
    // 用户附加系统提示词
    additionalSystemPrompt: string;
    // 启用的工具列表（从可用工具中选择）
    enabledTools: string[];
    // 自定义参数
    customParams: Record<string, unknown>;
  };
}
```

### 2.2 目录结构重构

```
src/
├── agents/                    # Agent 实现
│   ├── registry/              # Agent 注册中心
│   │   ├── index.ts           # 注册器
│   │   ├── types.ts           # 类型定义
│   │   └── config-schema.ts   # 配置 Schema
│   ├── star/                  # Star Agent
│   │   ├── index.ts
│   │   ├── config.ts          # 静态配置定义
│   │   ├── prompt.ts
│   │   └── tools/
│   └── master/                # Master Agent
│
├── features/                  # 功能模块（新增）
│   ├── github/                # GitHub 相关功能
│   │   ├── api/               # API 客户端
│   │   ├── auth/              # 认证逻辑
│   │   ├── hooks/             # React Hooks
│   │   └── store/             # Zustand Store
│   └── agent-config/          # Agent 配置功能
│       ├── components/        # 配置 UI 组件
│       ├── hooks/             # 配置 Hooks
│       └── store/             # 配置 Store
│
├── lib/
│   ├── storage/               # 存储层
│   │   ├── db.ts              # IndexedDB Schema
│   │   ├── agent-config-storage.ts  # Agent 配置存储
│   │   └── github-cache.ts    # GitHub 数据缓存
│   └── utils.ts
│
└── stores/                    # 全局 Store（保留通用的）
    ├── chat-history-store.ts
    └── settings-store.ts
```

### 2.3 数据存储设计

```typescript
// IndexedDB Schema 扩展
interface StarAgentDB extends DBSchema {
  // 现有
  conversations: { ... };
  messages: { ... };

  // 新增：Agent 配置
  agentConfigs: {
    key: string; // agentId
    value: AgentConfiguration;
    indexes: {
      "by-updated": number;
    };
  };

  // 新增：GitHub 缓存
  githubCache: {
    key: string; // `${username}:${dataType}`
    value: {
      username: string;
      dataType: "stars" | "user" | "repos";
      data: unknown;
      fetchedAt: number;
      expiresAt: number;
    };
    indexes: {
      "by-username": string;
      "by-expires": number;
    };
  };
}
```

### 2.4 Star Agent 静态配置

```typescript
interface StarAgentStaticConfig {
  // 仓库获取模式
  fetchMode: "manual" | "on-login" | "scheduled";
  
  // 定时刷新间隔（分钟），仅 scheduled 模式有效
  fetchIntervalMinutes: number;
  
  // 上次获取时间
  lastFetchedAt: number | null;
  
  // 是否在后台自动刷新
  backgroundRefresh: boolean;
}

const DEFAULT_STAR_STATIC_CONFIG: StarAgentStaticConfig = {
  fetchMode: "on-login",
  fetchIntervalMinutes: 60,
  lastFetchedAt: null,
  backgroundRefresh: false,
};
```

---

## 三、实施计划

### Phase 1: 基础设施 ✅

1. ✅ 扩展 IndexedDB Schema (`src/lib/storage/db.ts`)
2. ✅ 创建 Agent 配置存储服务 (`src/lib/storage/agent-config-storage.ts`)
3. ✅ 创建 GitHub 缓存存储服务 (`src/lib/storage/github-cache-storage.ts`)

### Phase 2: GitHub 模块重构 ✅

1. ✅ 重构 GitHub API 客户端 (`src/lib/github/service.ts`)
2. ✅ 实现 GitHub 缓存层 (集成到 service.ts)
3. ✅ 创建 GitHub 认证 Hook (`src/hooks/use-github-auth.ts`)
4. ✅ 更新 useStarContext (`src/hooks/use-star-context.ts`)

### Phase 3: Agent 配置系统 ✅

1. ✅ 创建 Agent 配置 Store (`src/stores/agent-config-store.ts`)
2. ✅ 创建 useAgentConfig Hook (`src/hooks/use-agent-config.ts`)
3. ✅ 实现配置 UI 组件 (`src/components/app/settings/agent-settings.tsx`)
4. ✅ 集成到设置对话框 (`src/components/app/settings/settings-dialog.tsx`)

### Phase 4: Star Agent 适配 ✅

1. ✅ 添加 Star Agent 静态配置 (`src/agents/star/static-config.ts`)
2. ✅ 实现手动刷新功能 (ChatHeader + ChatView)
3. ✅ 添加刷新按钮到聊天头部

### Phase 5: 项目结构调整

> 当前实现已满足需求，目录结构保持现状。未来如需进一步重构可按原计划执行。

---

## 四、API 设计

### 4.1 Agent 配置 Hook

```typescript
// useAgentConfig Hook
function useAgentConfig<T extends Record<string, unknown>>(agentId: string) {
  return {
    config: AgentConfiguration<T>;
    isLoading: boolean;
    
    // 更新静态配置
    updateStaticConfig: (updates: Partial<T>) => Promise<void>;
    
    // 更新动态配置
    updateDynamicConfig: (updates: Partial<DynamicConfig>) => Promise<void>;
    
    // 重置为默认值
    resetConfig: () => Promise<void>;
  };
}
```

### 4.2 GitHub 缓存 Hook

```typescript
// useGitHubStars Hook
function useGitHubStars(username: string) {
  return {
    stars: GitHubRepo[];
    isLoading: boolean;
    isCacheStale: boolean;
    lastFetchedAt: number | null;
    
    // 手动刷新
    refresh: () => Promise<void>;
    
    // 清除缓存
    clearCache: () => Promise<void>;
  };
}
```

---

## 五、UI 设计

### 5.1 设置对话框新增 "Agent 配置" 部分

```
设置
├── 外观
├── AI 模型
├── 对话
├── Agent 配置 (新增)
│   ├── Star Agent
│   │   ├── 仓库获取模式: [手动/登录时/定时]
│   │   ├── 刷新间隔: [下拉选择]
│   │   ├── 附加提示词: [文本框]
│   │   └── 启用工具: [多选]
│   └── Master Agent
│       └── ...
├── 数据管理
└── 关于
```
