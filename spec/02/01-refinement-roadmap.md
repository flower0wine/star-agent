# 动态 Agent 配置化二期完善计划（基于当前实现）

## 1. 目的

`spec/02/00-dynamic-agent-config-plan.md` 给出了总体方向，但当前代码已经发生了关键演进（例如系统提示词改为单一 `systemPromptTemplate`）。本文件用于：

1. 对齐“当前真实状态”
2. 明确未完成的能力缺口
3. 给出可执行的二期重构路线（文件级落地）

---

## 2. 当前实现状态（已完成）

## 2.1 已落地能力

1. Tool 可跨 Agent 组合（保留每个 Agent 的默认工具）
2. 每个 Agent 的每个 Tool 支持独立 `defaultInput`
3. Tool 中心支持搜索和 JSON 默认参数编辑
4. 系统提示词编辑统一为 `systemPromptTemplate`（不再使用附加提示词）
5. CodeMirror 编辑器已抽取为通用组件 `TemplateEditor`

## 2.2 当前主要文件

1. `src/lib/agents/runtime-tools.ts`
2. `src/lib/agents/tool-registry.ts`
3. `src/lib/agents/default-system-prompt-template.ts`
4. `src/lib/agents/prompt-template.ts`
5. `src/components/app/settings/agent-settings.tsx`
6. `src/components/app/settings/agent-settings/agent-tool-center.tsx`
7. `src/components/ai-elements/editors/template-editor.tsx`

---

## 3. 仍需完善的问题

## 3.1 架构层

1. `/api/chat/route.ts` 仍然 `if/else` 分发，新增 Agent 仍需改入口
2. `runtime-tools.ts` 采用 `switch` + 明确导入，仍是“半配置化”
3. Agent prompt 默认模板与 Agent 运行逻辑分散，缺少统一的 `BaseAgentDefinition`

## 3.2 配置模型层

1. `toolConfigs.defaultInput` 只做执行前合并，缺少“保存时 schema 校验”
2. 仍存在 `enabledTools + toolConfigs.enabled` 双状态，优先级未显式规范
3. prompt 模板变量没有“每个 Agent 的白名单 schema”与友好校验错误输出

## 3.3 UI 层

1. Tool 默认参数编辑是 JSON 文本，易错且不直观
2. 缺少“恢复默认模板/预览渲染后提示词”能力
3. 缺少“该 Agent 可用变量说明面板”（当前仅文本提示）

## 3.4 质量保障层

1. 缺少统一的配置校验模块（现在逻辑散在 UI 与 runtime）
2. 缺少针对配置编译逻辑的单元测试
3. lint/tsc 依赖环境不稳定，影响回归效率

---

## 4. 二期目标（V2）

## 4.1 架构目标

1. 新增 `BaseAgentDefinition` 与 `ToolDefinition` 注册中心
2. 统一 `resolveAgentRuntime()` 配置编译入口
3. Route 从“硬编码分发”改为“registry 分发”

## 4.2 体验目标

1. 系统提示词模板支持“默认模板回填 + 实时预览渲染”
2. Tool 默认参数支持“schema 驱动表单 + JSON 高级模式”
3. 明确并统一 enabled 规则，避免状态冲突

## 4.3 工程目标

1. 配置编译过程可测试、可追踪、可报错定位
2. 文件职责单一，减少跨文件隐式依赖

---

## 5. 详细实施计划

## Phase A：统一配置编译层（优先级 P0）

### A1. 引入 Agent/Tool Definition

新增：

1. `src/lib/agents/base/types.ts`
2. `src/lib/agents/base/agent-definitions.ts`
3. `src/lib/agents/base/tool-definitions.ts`

核心结构：

1. `BaseAgentDefinition`
2. `PromptTemplateDefinition`（默认模板 + 变量白名单）
3. `ToolDefinition`（schema + factory + uiMeta）

### A2. 实现运行时编译器

新增：

1. `src/lib/agents/base/runtime-resolver.ts`

职责：

1. 合并启用工具（默认 + 用户）
2. 校验并合并 tool defaultInput
3. 渲染系统提示词模板（含变量校验）
4. 产出 `ResolvedAgentRuntimeConfig`

### A3. Handler 收敛

改造：

1. `src/app/api/chat/route.ts`
2. `src/app/api/chat/handler.ts`
3. `src/app/api/chat/handler-master.ts`
4. `src/app/api/chat/handler-patent.ts`

目标：

1. 保留 Agent 特有上下文采集逻辑
2. 使用统一 runtime resolver 产物执行 `streamText`

---

## Phase B：配置模型与校验完善（优先级 P0）

### B1. 明确启用规则

定义单一规则：

1. `enabledTools` 为主
2. `toolConfigs[toolId].enabled` 只作为 UI 勾选缓存，不参与最终裁决

或（备选）：

1. 完全移除 `enabledTools`
2. 仅保留 `toolConfigs[toolId].enabled`

建议采用“备选方案”（更一致），但会涉及一次性字段清理。

### B2. Tool 默认值校验

新增：

1. `src/lib/agents/base/tool-default-validator.ts`

能力：

1. 保存时用对应 zod schema 对 `defaultInput` 执行安全校验
2. 输出字段级错误（供 UI 高亮）

### B3. Prompt 模板变量校验

新增：

1. `src/lib/agents/base/prompt-template-validator.ts`

能力：

1. 提取模板变量
2. 对照 Agent 变量白名单校验
3. 给出“未知变量/缺失关键变量”错误

---

## Phase C：设置页体验提升（优先级 P1）

### C1. Prompt 编辑区增强

改造：

1. `src/components/app/settings/agent-settings.tsx`

新增能力：

1. 恢复默认模板按钮
2. 预览渲染结果（只读 CodeMirror）
3. 变量清单可视化（Badge + 描述）

### C2. Tool 默认参数编辑器升级

新增：

1. `src/components/app/settings/agent-settings/tool-default-input-editor.tsx`

能力：

1. 标准模式：schema 驱动表单（string/number/boolean/enum）
2. 高级模式：JSON 编辑器（用于复杂对象）
3. 即时校验与错误提示

### C3. Tool 中心布局统一

改造：

1. `src/components/app/settings/agent-settings/agent-tool-center.tsx`

目标：

1. 卡片层次更明确（启用区/参数区）
2. 检索匹配高亮
3. 统一 `space-y` 与标签语义

---

## Phase D：稳定性与测试（优先级 P1）

### D1. 单测（如可引入 vitest）

建议覆盖：

1. `runtime-resolver` 工具启用合并逻辑
2. `defaultInput` 合并优先级（模型参数覆盖默认值）
3. prompt 变量渲染与校验异常

### D2. 回归脚本

新增：

1. `scripts/check-config-runtime.ts`（可选）

作用：

1. 构造示例配置
2. 输出 resolver 结果快照
3. 作为重构安全网

---

## 6. 文件级任务清单

## 新增

1. `src/lib/agents/base/types.ts`
2. `src/lib/agents/base/agent-definitions.ts`
3. `src/lib/agents/base/tool-definitions.ts`
4. `src/lib/agents/base/runtime-resolver.ts`
5. `src/lib/agents/base/tool-default-validator.ts`
6. `src/lib/agents/base/prompt-template-validator.ts`
7. `src/components/app/settings/agent-settings/tool-default-input-editor.tsx`

## 改造

1. `src/lib/agents/runtime-tools.ts`（逐步迁移到 tool-definitions）
2. `src/lib/agents/tool-registry.ts`（仅保留 UI catalog 或并入 tool-definitions）
3. `src/components/app/settings/agent-settings.tsx`
4. `src/components/app/settings/agent-settings/agent-tool-center.tsx`
5. `src/app/api/chat/route.ts` + `handler*.ts`

---

## 7. 验收标准（更新版）

1. 新增 Agent 时无需改 `/api/chat/route.ts` 分发分支
2. Tool 默认参数保存时可校验并返回字段级错误
3. 系统提示词模板编辑支持：
   - 默认回填
   - 变量校验
   - 预览渲染
4. Tool 配置状态无二义性（enabled 规则唯一）
5. `TemplateEditor` 在至少 3 个场景复用
6. lint/tsc 在稳定依赖环境下通过

---

## 8. 风险与决策点

1. 是否彻底移除 `enabledTools`（建议移除，避免双状态）
2. Tool schema 自动表单的支持深度（先覆盖基础类型，复杂对象走 JSON 模式）
3. 是否将 SubAgent 体系也迁移到同一 `BaseAgentDefinition` 管道（建议在 Phase A 后评估）

---

## 9. 建议执行顺序

1. 先做 Phase A+B（先保证“对”）
2. 再做 Phase C（再保证“好用”）
3. 最后做 Phase D（保证“可持续”）

