# 动态 Agent 配置化下一步实施方案（Phase B/C 详细版）

## 1. 范围与目标

本方案承接 `Phase A` 已完成成果，聚焦三件事：

1. 配置校验落地（Tool 默认参数、Prompt 变量）
2. 设置页可用性升级（schema 表单 + JSON 高级模式 + 预览）
3. 配置状态收敛（解决 `enabledTools` 与 `toolConfigs.enabled` 双状态）

---

## 2. 当前问题清单

1. `defaultInput` 仅在运行时做弱校验，错误无法在设置页直观看到
2. Prompt 模板未知变量只 `console.warn`，用户无感知
3. Tool 参数编辑仅 JSON 文本，易输错
4. `enabledTools` 与 `toolConfigs.enabled` 并存，存在歧义

---

## 3. 关键决策

## 3.1 启用状态单一化（必须）

采用：**移除 `enabledTools`，仅使用 `toolConfigs[toolId].enabled`**。

理由：

1. 单一真值来源，避免冲突
2. 工具参数与启用状态天然同域，便于维护

运行时规则：

1. 若 `toolConfigs[toolId].enabled === false` -> 禁用
2. 若 `toolConfigs[toolId].enabled === true` -> 启用
3. 若未配置 -> 退回 Agent 默认工具集合

## 3.2 参数编辑双模式

1. 标准模式：schema 驱动表单（基础类型）
2. 高级模式：JSON 编辑器（复杂对象）

默认打开标准模式，解析失败或复杂结构时回退高级模式。

## 3.3 Prompt 校验策略

1. 保存时做变量校验
2. 校验失败不阻止输入，但阻止“保存”
3. 错误信息定位到具体变量名

---

## 4. 详细任务拆解

## Task B1：配置模型收敛（P0）

### 目标

移除 `enabledTools` 依赖，统一到 `toolConfigs.enabled`。

### 变更文件

1. `src/lib/storage/db.ts`
2. `src/lib/storage/agent-config-storage.ts`
3. `src/app/api/chat/types.ts`
4. `src/hooks/use-agent-chat.ts`
5. `src/components/chat/chat-view.tsx`
6. `src/lib/agents/base/runtime-resolver.ts`
7. `src/components/app/settings/agent-settings.tsx`
8. `src/components/app/settings/agent-settings/agent-tool-center.tsx`

### 实施步骤

1. 删除 `AgentDynamicConfig.enabledTools`
2. `AgentToolCenter` 勾选时直接写入 `toolConfigs[toolId].enabled`
3. `runtime-resolver` 只读取 `toolConfigs.enabled` + agent 默认工具
4. 移除 `toolSelectionConfigured` 的历史逻辑

### 验收

1. 设置页切换工具后，刷新仍保持状态
2. 运行时工具集合与设置一致
3. 无任何 `enabledTools` 读写残留

---

## Task B2：Tool 默认参数校验反馈（P0）

### 目标

参数错误在设置页可见，不再只在运行时告警。

### 新增/改造文件

1. `src/lib/agents/base/tool-default-validator.ts`（增强）
2. `src/lib/agents/base/runtime-resolver.ts`（返回校验信息）
3. `src/components/app/settings/agent-settings/agent-tool-center.tsx`
4. `src/components/app/settings/agent-settings/tool-default-input-editor.tsx`（新）

### 实施步骤

1. `validateDefaultInputWithSchema` 输出结构化错误（path/message）
2. 保存配置前触发校验
3. 设置页显示字段级错误，禁止保存无效默认参数

### 验收

1. 输入非法 number/enum 时立即提示
2. 无效参数不进入持久化配置
3. 运行时不再出现“无提示的默认参数失效”

---

## Task B3：Prompt 模板保存校验（P0）

### 目标

模板变量错误在设置页即时提示，减少线上隐性失败。

### 新增/改造文件

1. `src/lib/agents/base/prompt-template-validator.ts`（增强）
2. `src/components/app/settings/agent-settings.tsx`
3. `src/lib/agents/base/agent-definitions.ts`

### 实施步骤

1. 基于 `AgentDefinition.promptVariables` 进行白名单校验
2. 编辑区下方展示“未知变量”与“建议变量”
3. 增加“恢复默认模板”按钮

### 验收

1. 输入 `{{unknown_var}}` 有明确报错
2. 一键恢复默认模板可用
3. 模板保存后下一次请求立刻生效

---

## Task C1：Tool 参数编辑器升级（P1）

### 目标

从 JSON-only 升级到 schema-first。

### 新增文件

1. `src/components/app/settings/agent-settings/tool-default-input-editor.tsx`

### 子组件职责

1. `ToolDefaultInputForm`：标准字段编辑（string/number/boolean/enum）
2. `ToolDefaultInputJsonEditor`：高级 JSON 编辑
3. `ToolDefaultInputModeSwitch`：模式切换

### 数据来源

来自 `tool-definitions.ts` 的 `uiMeta`（需补充）：

1. 字段 label
2. 字段顺序
3. 字段说明

### 验收

1. 基础工具参数无需手写 JSON
2. 高级模式可覆盖复杂结构
3. 两种模式切换不丢数据

---

## Task C2：Prompt 渲染预览（P1）

### 目标

用户可以看到“变量替换后”的最终提示词。

### 改造文件

1. `src/components/app/settings/agent-settings.tsx`
2. `src/lib/agents/prompt-template.ts`

### 实施步骤

1. 增加只读预览编辑区（CodeMirror）
2. 使用 mock/runtime variables 渲染预览
3. 预览区与编辑区联动（防抖 200ms）

### 验收

1. 编辑模板后预览实时更新
2. 变量为空时给出占位样例值

---

## 5. 接口与类型调整清单

1. `AgentDynamicConfig`
   - 删除：`enabledTools`
   - 保留：`systemPromptTemplate`、`toolConfigs`、`customParams`

2. `AgentConfigPayload`
   - 删除：`enabledTools`
   - 保留：`systemPromptTemplate`、`toolConfigs`、`customParams`、`staticParams`

3. `toolConfigs[toolId]`
   - `enabled?: boolean`
   - `defaultInput?: Record<string, unknown>`
   - `validationErrors?: ...`（仅 UI 本地态，不持久化）

---

## 6. 里程碑与预计产出

## M1（1-2 天）

1. 完成 `enabledTools` 收敛
2. 完成 prompt 变量保存校验

## M2（2-3 天）

1. 完成 tool 参数 schema 表单（首批基础类型）
2. 完成 JSON 高级模式

## M3（1 天）

1. 完成提示词预览
2. UI 收口 + 文档更新

---

## 7. 测试与验收脚本

1. `bun run lint`
2. `bun run tsc -- --noEmit`
3. 手工回归：
   - star/master/patent 各发送 1 次消息
   - 每个 agent 切换 2 个工具
   - 设置 1 个非法默认参数并确认 UI 报错
   - 输入 1 个非法模板变量并确认无法保存

---

## 8. 风险与应对

1. schema 自动表单覆盖不足
   - 应对：优先基础类型，复杂对象走 JSON 模式

2. 状态收敛影响旧数据
   - 当前为开发期，不做兼容迁移；初始化缺失字段时走默认值

3. UI 复杂度增长
   - 应对：拆分子组件，单文件单职责

---

## 9. 完成定义（DoD）

1. 配置状态单一，无双真值来源
2. 参数和模板错误在设置页可见且可阻止保存
3. 工具参数编辑具备标准模式与高级模式
4. 系统提示词模板支持恢复默认与预览
5. 通过 lint/tsc（在依赖环境正常前提下）

