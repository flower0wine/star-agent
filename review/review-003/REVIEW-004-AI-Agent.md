# SPEC-004-AI-Agent.md 审查报告

## 一、错误汇总

### TypeScript 错误 (8 个)

| 文件 | 行号 | 错误描述 | 严重程度 |
|------|------|----------|----------|
| `src/lib/agent/agent-service.ts` | 103 | 'messages' does not exist in type | 🔴 高 |
| `src/lib/agent/agent-service.ts` | 115 | Element implicitly has an 'any' type | 🟠 中 |
| `src/mastra/agents/star-agent.ts` | 28 | 'messages' does not exist in type | 🔴 高 |
| `src/mastra/tools/repo-tools.ts` | 39 | 'name' does not exist in type | 🔴 高 |
| `src/mastra/tools/repo-tools.ts` | 110 | 'name' does not exist in type | 🔴 高 |
| `src/mastra/tools/repo-tools.ts` | 170 | 'name' does not exist in type | 🔴 高 |
| `src/mastra/tools/repo-tools.ts` | 224 | Expected 2-3 arguments, but got 1 | 🟠 中 |
| `src/lib/services/openrouter.ts` | 1 | Cannot find module '@mastra/ai-sdk/openrouter' | 🔴 高 |

---

## 二、致命问题分析

### 问题 1: Mastra v1.x API 不兼容 (🔴 P0 - 阻断性)

**问题描述**:  
SPEC-004 文档编写时参考的是 Mastra 旧版 API，但当前项目使用的是 Mastra v1.12.0，API 已发生重大变化。

#### 1.1 Agent Memory 配置错误

**当前代码** (`src/mastra/agents/star-agent.ts`):
```typescript
// 第 28 行 - 错误配置
memory: new Memory({
  messages: 20,
}),
```

**错误原因**:  
`Memory` 构造函数参数与 SPEC-004 文档描述不同。v1.x 中 memory 配置应该是对象而非 `new Memory()`。

**修复建议**:
```typescript
// v1.x 正确配置
memory: {
  messages: [],
},
```

#### 1.2 Tool 定义格式错误

**当前代码** (`src/mastra/tools/repo-tools.ts`):
```typescript
// 第 39, 110, 170 行 - 错误格式
export const searchReposTool = {
  id: "search_repos",
  name: "Search Repositories", // ❌ 'name' 属性不存在
  description: "...",
  inputSchema: z.object({...}),
  execute: async ({ query, limit }) => {...},
};
```

**错误原因**:  
Mastra v1.x 使用 `createTool()` 函数或不同的对象结构。

**修复建议**:
```typescript
import { createTool } from "@mastra/core/tool";

export const searchReposTool = createTool({
  id: "search_repos",
  description: "Search the user's starred repositories...",
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
  execute: async ({ input }) => {
    // 实现
  },
});
```

---

### 问题 2: OpenRouter 模块路径错误 (🔴 P0)

**错误文件**: `src/lib/services/openrouter.ts`

**当前代码**:
```typescript
import { createOpenRouter } from "@mastra/ai-sdk/openrouter"; // ❌ 路径不存在
```

**可能正确的路径**:
```typescript
// 方案 1
import { openrouter } from "@mastra/ai-sdk";

// 方案 2 - 检查 node_modules/@mastra/ai-sdk 实际导出
```

**影响**: AI 模型配置无法加载，整个 Agent 无法工作

---

### 问题 3: Agent Service 配置错误 (🔴 P1)

**错误文件**: `src/lib/agent/agent-service.ts`

**第 103 行**:
```typescript
memory: {
  messages: 20, // ❌ 'messages' 属性不存在
}
```

**第 115 行**: 类型推断错误

---

## 三、SPEC 文档问题

### 3.1 文档与实际 API 差异

| SPEC-004 描述 | 实际 API (v1.12.0) | 差异 |
|---------------|-------------------|------|
| `new Agent({...})` | `new Agent({...})` | ✅ 相同 |
| `model: openrouter("model")` | 可能不同 | ⚠️ 待验证 |
| `tools: { tool1, tool2 }` | 需使用 createTool | ❌ 不兼容 |
| `memory: new Memory({...})` | `memory: { messages: [] }` | ❌ 不兼容 |
| Memory 配置 | Memory 类构造函数变化 | ❌ 不兼容 |

### 3.2 文档需要更新

SPEC-004 需要更新以下部分以匹配 Mastra v1.x:

1. **工具定义** - 使用 `createTool()` 替代直接对象定义
2. **Memory 配置** - 使用对象语法而非 `new Memory()`
3. **Model 配置** - 确认 openrouter 的正确调用方式

---

## 四、功能完整性审查

### 4.1 已实现功能

| 功能 | 状态 |
|------|------|
| Mastra Agent 创建 | ⚠️ 配置错误 |
| OpenRouter 模型配置 | ❌ 导入错误 |
| searchRepos 工具 | ❌ 定义错误 |
| getRepoDetails 工具 | ❌ 定义错误 |
| getReadme 工具 | ❌ 定义错误 |
| 内存管理 | ❌ 配置错误 |

### 4.2 缺失功能

根据 SPEC-004，以下功能需要验证：
- 流式响应处理
- 工具调用显示
- 上下文加载 (loadStarredRepos)

---

## 五、总结

| 指标 | 数量 |
|------|------|
| TypeScript 错误 | 8 |
| 阻断性问题 | 3+ |
| 文档不兼容 | 3+ |

**致命程度**: 🔴 极高 - AI Agent 核心功能完全不可用

**根本原因**: Mastra 版本 (v1.12.0) 与 SPEC-004 文档描述的 API 存在重大差异

**建议**: 
1. 立即修复 OpenRouter 导入路径
2. 立即修复 Tool 定义方式 (使用 createTool)
3. 立即修复 Memory 配置
4. 更新 SPEC-004 文档以匹配当前 Mastra 版本
