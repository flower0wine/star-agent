# 动态 Agent 基座与配置化实施方案

## 1. 背景与目标

本方案目标是在现有 `src/agents` 体系上，构建一个可复用的“基座 Agent（Base Agent）”，使任意 Agent 都能通过配置动态组合：

1. 系统提示词（支持 CodeMirror 编辑）
2. 工具选择（任意 Agent 可搭配任意 Tool）
3. Tool 参数默认值（模型未给定时自动回填）
4. Agent 与 Tool 配置隔离（每个 Agent 的每个 Tool 独立配置）

同时把 `src/components/app/settings/agent-settings/template-variable-textarea.tsx` 抽取为通用组件，适配后续“带变量占位的文本编辑”场景。

---

## 2. 现状审计（基于当前代码）

### 2.1 Agent 运行入口与分发

- 后端入口为 `src/app/api/chat/route.ts`，当前按 `agentId` 做 `if/else` 分发到：
1. `handleStarAgent`
2. `handleMasterAgent`
3. `handlePatentAgent`

- 该分发方式导致新增 Agent 必须修改 route 与 handler，扩展性一般。

### 2.2 Agent 定义方式

- `src/agents/star/index.ts`、`src/agents/master/index.ts`、`src/agents/patent/index.ts` 以“工厂函数返回 `AgentConfig`”方式组装。
- Tool 集合是在代码中直接 hardcode（如 `master` 里固定 `getAllRepos/createSubAgent/displayRepositories`）。
- Prompt 也是代码内函数拼接（如 `src/agents/master/prompt.ts`）。

### 2.3 配置存储模型

- `src/lib/storage/db.ts` 的 `AgentDynamicConfig` 目前只有：
1. `additionalSystemPrompt`
2. `enabledTools`
3. `customParams`

- 缺少“每个 tool 的参数默认值”一级结构，默认值目前散落在各个 tool 的 zod `.default()` 或 execute 逻辑里。

### 2.4 Tool 注册模型

- `src/lib/agents/tool-registry.ts` 当前有 `TOOL_CATALOG`，但仍通过 `agentIds/defaultEnabledAgentIds` 将 tool 和 agent 强绑定。
- `normalizeEnabledTools(agentId, enabledTools)` 也会按 agent 过滤，阻碍“任意 tool 可挂载到任意 agent”。

### 2.5 设置面板状态

- `src/components/app/settings/agent-settings.tsx` 已支持工具中心、提示词附加和 subagent 配置。
- `template-variable-textarea.tsx` 功能较完整（变量高亮、补全、CodeMirror 主题），但路径与命名偏业务化，不利于复用。

---

## 3. 目标架构（建议）

### 3.1 核心原则

1. Agent 负责“角色与策略”，Tool 负责“能力与执行”，二者解耦
2. Tool 参数默认值归属于“Agent-Tool 绑定配置”，不归属于 Tool 全局定义
3. 前端只编辑配置，后端统一做配置归一化与执行时合并
4. 配置化优先，代码硬编码兜底最小化

### 3.2 新增抽象层

1. `BaseAgentDefinition`（基座定义）
- `id/name/description`
- `defaultSystemPrompt`
- `recommendedToolIds`（仅推荐，不是限制）
- `runtimePolicy`（如 maxSteps、是否允许子 agent）

2. `ToolDefinition`
- `id/name/description/category`
- `inputSchema`（zod）
- `factory(context)` 返回 `Tool`
- `supportsSubAgent` 等 capability 标记

3. `AgentRuntimeConfigResolved`
- 运行时最终配置（system prompt + enabled tools + per-tool defaults）
- 由 “基础定义 + 用户配置 + 请求参数” 合并得到

### 3.3 推荐目录结构

```text
src/lib/agents/
  base/
    types.ts
    registry.ts
    resolver.ts
  tools/
    definitions/
      search-repositories.ts
      get-readme.ts
      get-all-repos.ts
      ...
    registry.ts
    defaults.ts
```

```text
src/components/
  ai-elements/
    editors/
      template-editor.tsx
```

说明：将 `template-variable-textarea.tsx` 下沉到 `ai-elements/editors`，命名为通用 `TemplateEditor`（或 `VariableTemplateEditor`）。

---

## 4. 数据模型改造

## 4.1 Agent 动态配置扩展

建议把 `AgentDynamicConfig` 扩展为：

```ts
interface AgentDynamicConfig {
  additionalSystemPrompt: string;
  enabledTools: string[]; // 可保留，兼容“快速切换”
  customParams: Record<string, unknown>;
  systemPromptOverride?: string; // 完整覆盖式提示词（CodeMirror编辑）
  toolConfigs?: Record<string, AgentToolConfig>;
}

interface AgentToolConfig {
  enabled?: boolean;
  defaultInput?: Record<string, unknown>; // 该 Agent 下该 Tool 的默认参数
}
```

关键点：

1. `toolConfigs[toolId]` 是 Agent 局部作用域，天然满足“每个 agent 每个 tool 独立”
2. `defaultInput` 在 tool 调用前合并：`finalInput = { ...defaultInput, ...modelInput }`
3. 若模型已给值，以模型输入覆盖默认值（符合“除非模型给定”）

## 4.2 Tool 元数据扩展

在 `ToolDefinition` 中补充：

1. `inputMeta`：字段说明、UI 展示顺序、是否可配置默认值
2. `searchKeywords`：支持设置页检索

---

## 5. 运行时方案

### 5.1 统一分发与执行

替换 `route.ts` 的硬编码分支，改为：

1. 从 `agentRegistry` 获取 agent definition
2. 通过 `resolver` 组装运行时配置
3. 由统一 handler 执行 `streamText`

保留少量 agent-specific context 注入点（如 star/master 需要 username/repo）。

### 5.2 Tool 参数默认值注入

在 tool 调用链增加一个包装层：

1. 拦截模型对 tool 的 input
2. 读取 `agentConfig.dynamicConfig.toolConfigs[toolId].defaultInput`
3. 合并后再执行原始 tool

合并规则：

1. 仅对 `undefined` 字段回填默认值
2. `null` 视为模型显式输入，不覆盖
3. 合并后走 zod schema 校验

### 5.3 系统提示词生成

优先级建议：

1. `systemPromptOverride`（完整覆盖）
2. `defaultSystemPrompt + additionalSystemPrompt`

并保留现有“附加提示词”体验，降低学习成本。

---

## 6. 设置页重构方案

### 6.1 Tool 选择与检索

`AgentToolCenter` 改造为：

1. 顶部搜索输入框（按 `id/name/description/searchKeywords` 检索）
2. 展示全部 Tool（不再按 agentIds 过滤）
3. 每个 tool 行支持：
- 启用开关
- “参数默认值”按钮（弹出 schema-driven 表单）

### 6.2 Tool 参数默认值编辑器

新增 `ToolDefaultInputEditor`：

1. 根据 tool `inputSchema` 渲染基本字段编辑（string/number/boolean/enum/object）
2. 保存至 `dynamicConfig.toolConfigs[toolId].defaultInput`

### 6.3 系统提示词编辑

将 `PromptCard` 升级为 CodeMirror 编辑：

1. 使用通用 `TemplateEditor`
2. 提供语法高亮/变量提示（对需要模板变量的 agent）
3. 非模板场景可关闭变量补全，仅作为通用长文本编辑器

### 6.4 Template 组件通用化

将现有 `template-variable-textarea.tsx` 拆分：

1. `TemplateEditor`（通用编辑器内核）
2. `TemplateHint`（“输入 {{ 触发建议”提示条，可选）
3. 业务层只负责传入变量列表与 placeholder

---

## 7. 实施计划（分阶段）

## Phase 1：基础模型与注册中心

1. 新建 `base` 与 `tools` 注册层
2. 去除 `tool-registry` 中 agent 强绑定字段（`agentIds/defaultEnabledAgentIds` 改为推荐级）
3. 保留当前 agent 行为不变（先平移）

交付：

1. 新的 `ToolDefinition` 与 `BaseAgentDefinition` 类型
2. 可遍历的全量 tool registry

## Phase 2：运行时配置编译

1. 新增 `resolver`，编译系统提示词与 tool 列表
2. 引入 tool input 默认值合并器
3. route 改为 registry 驱动分发（减少 if/else）

交付：

1. 统一 handler 或统一执行层
2. `toolConfigs.defaultInput` 生效

## Phase 3：设置页与通用编辑器

1. 抽取 `TemplateEditor`
2. `AgentToolCenter` 增加搜索 + 全量 tool 列表
3. 增加 tool 默认参数编辑 UI
4. 系统提示词切换到 CodeMirror

交付：

1. 设置页可配置“任意 agent + 任意 tool + tool 默认参数”
2. 模块化 UI 组件可复用

## Phase 4：清理与收敛

1. 删除旧的 agent-tool 强绑定逻辑
2. 删除不再使用的 legacy 字段与分支
3. 文档与注释同步更新

---

## 8. 风险与方向性问题

### 8.1 需要你确认的方向

1. `createSubAgent` 是否对所有 Agent 默认可见？
- 建议：默认关闭，仅 master 推荐开启；但技术上允许任意 agent 启用。

2. Tool 参数默认值是否允许“复杂对象深层编辑”？
- 建议：第一版支持一层对象与基础类型，复杂结构先 JSON 模式编辑，避免 UI 过重。

3. Agent 系统提示词是否需要“版本化与回滚”？
- 若你后续要做团队协作，建议加；若仅本地单人配置，可先不做。

### 8.2 主要技术风险

1. 任意 tool 全开放后，模型可能误用不适配工具
- 通过 `recommendedToolIds + prompt 约束 + UI 默认模板` 控制

2. tool defaultInput 与 zod schema 不一致
- 保存时先校验，执行前再校验，双保险

---

## 9. 验收标准

1. 设置页可检索并启用全量 tool，不再受 agent 白名单限制
2. 每个 agent 的同名 tool 默认参数互不影响
3. 模型未传某参数时，tool 使用 agent 上配置的默认值
4. 系统提示词可用 CodeMirror 编辑并持久化
5. `template-variable-textarea.tsx` 完成通用化抽取并至少复用两处
6. `bun run lint` 与 `bun run tsc -- --noEmit` 通过

---

## 10. 建议首批落地文件清单

1. `src/lib/agents/base/types.ts`
2. `src/lib/agents/base/registry.ts`
3. `src/lib/agents/base/resolver.ts`
4. `src/lib/agents/tools/registry.ts`
5. `src/components/ai-elements/editors/template-editor.tsx`
6. `src/components/app/settings/agent-settings/agent-tool-center.tsx`
7. `src/components/app/settings/agent-settings.tsx`
8. `src/app/api/chat/route.ts`
9. `src/app/api/chat/handler*.ts`（收敛为统一执行路径）

