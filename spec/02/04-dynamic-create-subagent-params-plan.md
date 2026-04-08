# create-subagent 动态参数实现方案（支持 Zod + 可配置 + 模型可识别）

## 1. 目标

让 `createSubAgent` 的入参不再固定为仅 `task`，而是：

- 参数集可由配置动态定义（例如 `startIndex/endIndex`）。
- 每个参数有类型、必填、描述、默认值、约束（min/max/enum 等）。
- 运行时使用 Zod 校验。
- 模型在工具调用时能“看到并理解”这些参数（名称、说明、是否必填）。
- 这些动态参数可作为变量注入 SubAgent 系统提示词并直接使用（如 `{{startIndex}}`）。

## 2. 现状与关键约束

当前 `createSubAgent` 输入 schema 是硬编码 `z.object({ task: z.string() })`。

AI SDK 约束：

- 工具 `inputSchema` 必须是一个明确 schema。
- 但它可以在**每次请求构建工具时动态生成**（这是可行的）。

结论：

- 可通过“配置 -> schema 工厂 -> 动态 zod schema”实现。
- 无需每次改代码添加参数字段。

## 3. 总体设计

## 3.1 配置模型（新增）

在 `toolConfigs.createSubAgent` 下新增参数定义配置：

```ts
interface ToolParamConfig {
  key: string; // 参数名，如 startIndex
  type: "string" | "number" | "boolean";
  required?: boolean;
  description?: string;
  defaultValue?: string | number | boolean;
  constraints?: {
    min?: number;
    max?: number;
    enum?: Array<string | number | boolean>;
    pattern?: string; // string 正则
  };
}

interface CreateSubAgentParamConfig {
  parameters: ToolParamConfig[];
}
```

约定：

- `task` 也进入这套配置（默认 required string）。
- `startIndex/endIndex` 通过配置声明，不再硬编码。

## 3.2 Schema 工厂（核心）

新增模块：`src/lib/agents/sub-agent/dynamic-schema.ts`

职责：

1. 从 `CreateSubAgentParamConfig` 生成 Zod object schema。
2. 对参数定义本身先做一次配置合法性校验（防止无效配置）。
3. 输出：
  - `inputSchema`（给 tool）
  - 参数元信息（给描述拼接和 UI 展示）

示意：

```ts
const dynamicSchema = buildCreateSubAgentInputSchema(paramConfig);
return tool({
  description: buildCreateSubAgentToolDescription(paramMeta),
  inputSchema: dynamicSchema,
  execute: async (params) => { ... }
});
```

## 3.3 模型可识别策略

模型识别靠两层：

1. `inputSchema` 字段本身（AI SDK 会用于 tool 调用约束）。
2. tool `description` 注入参数清单（名称/类型/必填/含义/示例）。

建议描述模板：

- 固定前缀：何时调用 createSubAgent。
- 动态参数列表（自动拼接）。
- 约束提示（如 `startIndex/endIndex` 适用范围）。

## 3.4 执行层参数处理

`execute(params)` 中按配置解析：

- 直接读取 `params.task`。
- 若存在 `startIndex/endIndex`，交给 `PayloadSelectionStrategy` 切仓库范围。
- 若配置了额外参数（如 `topic`），作为 runtime 变量注入 subagent 提示词上下文。

即：参数到行为映射由策略层处理，不在 tool 内堆 `if/else`。

## 3.5 参数注入提示词（新增）

可行性：**完全可行**。  
原因：SubAgent 提示词目前已支持变量渲染，动态参数只需进入同一变量上下文。

新增规则：

1. 动态参数注入域  
- 将 `validatedParams`（去除保留键后）注入 `runtimeVars`。
- SubAgent 提示词可直接使用 `{{参数名}}`。

2. 保留键与冲突策略  
- 保留键：`task`、`username`、`repos_count`、`repos_context`、`parent_agent_id`、`current_date`。
- 当动态参数与保留键同名时：默认报错（推荐），避免静默覆盖。

3. 命名规范  
- 参数 key 建议 camelCase（如 `startIndex`）。
- 提示词占位同名使用：`{{startIndex}}`。

4. 类型一致性  
- 注入前已通过 Zod 校验。
- 模板渲染层只负责字符串替换，不再做二次弱类型猜测。

## 4. 与你当前架构的对齐（关键）

你已经改成“subagent 绑定预配置、模型不传 subagentId”，本方案完全兼容：

- 模型只传“任务参数”，不传 subagent 选择参数。
- 绑定 subagent 后，参数 schema 仍可按 agent/tool 配置动态变化。

可选增强：

- 支持“按绑定 subagent 覆盖参数定义”（优先级：subagent > tool）。

## 5. UI 改造建议（Agent Settings）

在 `createSubAgent` 工具配置卡片中新增“参数定义编辑器”：

- 参数名
- 类型
- 必填
- 默认值
- 说明
- 约束（min/max/enum/pattern）

并实时展示：

- 生成后的 JSON 预览
- 生成后的 Zod 校验结果（配置层验证）

重要：

- 保持单一职责：参数编辑组件独立文件，不塞进 `agent-tool-center.tsx` 巨型组件。

## 6. 分阶段实施

## Phase P1：后端可用最小版

- 实现 `dynamic-schema.ts` schema 工厂。
- `create-sub-agent.ts` 改为读取 `toolConfig` 动态构建 schema。
- 默认参数配置内置为：`task(required string)` + `startIndex/endIndex(optional number)`。

验收：

- 模型可传 `startIndex/endIndex` 并通过 Zod。
- 未传 task 报错；越界值按约束报错。

## Phase P2：策略联动

- 将 `startIndex/endIndex` 接入 `PayloadSelectionStrategy`。
- 其他动态参数进入 runtime vars 注入链路，并可在 SubAgent 系统提示词中直接使用。

验收：

- 参数改变可影响 subagent 输入仓库子集与提示词变量。

## Phase P3：设置面板动态化

- 增加 createSubAgent 参数定义 UI。
- 可增删改参数，保存到 `toolConfigs.createSubAgent.parameters`。

验收：

- 改配置后无需改代码即可改变模型可调用参数集合。

## 7. 主要难点与应对

1. 动态 schema 与 TypeScript 静态类型冲突  
- `execute(params)` 不能再依赖固定 interface。  
- 方案：`params` 使用 `Record<string, unknown>` + runtime parse 后得到 `validatedParams`。

2. 参数配置质量问题  
- 用户可配出冲突配置（重名、类型/默认值不一致）。  
- 方案：参数配置先走 `configSchema` 校验，不合法不生效并给错误提示。

3. 模型仍可能漏参  
- 即使 schema 可见，模型也会偶发漏传。  
- 方案：required + 清晰 description + 错误信息可读（告诉缺哪个参数）。

4. 参数到执行行为映射复杂化  
- 参数变多后，行为分支容易再次硬编码。  
- 方案：坚持策略层映射，不在 create-subagent 主文件直接写业务分支。

5. 参数变量与预定义变量冲突  
- 动态参数可能覆盖系统变量，造成提示词行为不可预期。  
- 方案：建立保留键白名单并默认冲突报错（可配置为 warn 模式）。

6. 未使用参数与未定义变量诊断  
- 参数已传但提示词未使用，或提示词引用了不存在参数。  
- 方案：在设置页提供“变量引用检查”，在运行时返回结构化 warning。

## 8. 验收清单

- `createSubAgent` 参数定义可配置（非硬编码）。
- 动态参数支持 Zod 校验并实际生效。
- 模型可感知动态参数（schema + description）。
- `startIndex/endIndex` 可由模型传入并参与仓库范围选择。
- 动态参数可在 SubAgent 系统提示词中通过同名变量占位使用。
- `bun lint`、`bun tsc` 通过。
