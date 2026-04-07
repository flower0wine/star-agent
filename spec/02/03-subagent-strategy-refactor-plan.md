# SubAgent 动态化重构方案（按你的目标修订）

## 1. 目标确认

按你的最新要求，系统目标明确为：

- `create-subagent` tool 能动态创建任意 subagent。
- `subagent` 没有“模板”概念。
- “创建的 profile 就是一个 subagent 实体配置”。
- 任意 agent 使用 `create-subagent` 时，不由模型指定 subagent，而是使用“预配置绑定”的 subagent。
- subagent 的系统提示词支持动态变量填充，变量字段名不固定。
- 非必要场景禁止硬编码字段名与参数结构。
- `variables` 和 `payloadRef` 不通过 tool 调用传入，而是由 subagent 运行时上下文自动提供（局部变量）。

## 2. 现状与偏差

当前实现偏差点：

- `createSubAgent` 入参结构是固定的（`profileId/taskVars/payloadRef`）。
- `taskDescriptionRequirement` 仍在 profile 中承担“模板化任务文本”职责。
- 内置变量和 payload 类型存在硬编码分支。
- 当前由模型侧决定 `profileId`，与“预配置绑定”目标冲突，且易断联。

这些与“profile 即 subagent、无模板层、动态变量字段”存在冲突。

## 3. 新模型（核心）

## 3.1 数据模型收敛：Profile 即 SubAgent

将 `SubAgentProfile` 语义统一为 `SubAgentDefinition`（命名可后续统一）：

- `id`: subagent 唯一标识
- `name`: 展示名
- `enabled`: 是否可被选择
- `systemPrompt`: subagent 系统提示词（可含变量占位）
- `variablesSchema`: 变量定义（字段名动态）
- `toolIds`: 当前 subagent 可用工具
- `limits`: 执行限制（timeout 等）
- `version`

删除/废弃：

- `taskDescriptionRequirement`
- 任何“模板列表”“任务模板”概念字段

说明：任务由 `create-subagent` 的调用参数直接给出，不再经过模板中转。

## 3.2 create-subagent tool 目标形态（预配置绑定）

建议固定“最小外壳”，由运行时绑定 subagent：

- `task: string`（主 agent 传入的任务描述）

关键点：

- 不由模型传 `subagentId`，避免选择断联与越权。
- 不由模型传 `variables/payloadRef`，避免调用层参数膨胀。
- 不再硬编码变量字段名；变量由运行时注入并按 `variablesSchema` 校验。
- `task` 为显式输入，不依赖模板字段。

绑定来源：

- 在 agent 的 `createSubAgent` tool 配置中预先设置 `boundSubAgentIds`。
- 最简模式：单绑定（只允许 1 个 subagent）。
- 可扩展模式：多绑定池 + 调度策略自动挑选，但仍不由模型指定。

## 3.3 提示词变量动态化

引入统一变量解析链路（策略）：

1. 读取 subagent 的 `variablesSchema`
2. 从运行时上下文注入局部变量（如 `username`、仓库子集信息、任务上下文等）
3. 仅对 schema 定义变量做校验与注入
4. 对未知变量处理采用策略（ignore/warn/error 可配置）

注意：

- `username/repos_count/...` 只能作为“可选 runtime source”，不能成为强制硬编码字段。
- 只有 schema 声明需要时才注入/校验。

## 4. 策略模式重构（按新目标）

建议目录：`src/lib/agents/sub-agent/strategies/`

1. `SubAgentResolveStrategy`
- 输入：`parentAgentId, toolConfig, customParams`
- 输出：`resolvedSubAgentDefinition`

2. `VariableResolutionStrategy`
- 输入：`variablesSchema, runtimeSources`
- 输出：`resolvedVariables`
- 作用：实现“字段名不固定”的变量动态解析

3. `PromptRenderStrategy`
- 输入：`systemPrompt, resolvedVariables`
- 输出：`finalSystemPrompt`

4. `PayloadSelectionStrategy`
- 输入：`repos, subagentConfig, runtimeContext`
- 输出：`selectedRepos, payloadMeta`
- 说明：payload 信息来自运行时/调度上下文，不在 tool 参数中显式传入

5. `ToolResolutionStrategy`
- 输入：`toolIds, runtimeContext`
- 输出：`tools`

6. `ExecutionPolicyStrategy`
- 输入：`subagentConfig, task, runtimeContext`
- 输出：`timeout/model/toolLimits/...`

7. `OrchestrationPolicyStrategy`
- 输入：`parentAgentId/requestContext`
- 输出：`maxCycles, waitTimeout`

## 5. master/agent 与 subagent 的交互改造

## 5.1 交互路径（去掉模型选 subagent）

调用路径统一为：

1. 配置阶段：用户在设置里将 `createSubAgent` 绑定到一个或多个 subagent。
2. 运行阶段：主 agent 仅调用 `createSubAgent({ task })`。
3. 运行时：`SubAgentResolveStrategy` 按预配置绑定选择目标 subagent。

说明：

- 不再需要主 agent 选择 `subagentId`。
- 若存在多绑定，选择逻辑由策略完成（例如轮询、按标签、按负载）。

## 5.2 create-subagent 的职责边界

`create-subagent` 只做：

- subagent 选择与校验
- 按预配置绑定解析目标 subagent
- 变量解析与提示词渲染
- 任务入队

不再做：

- 任务模板拼装
- 固定 payload 类型分支
- 固定内置变量分支

## 6. 分阶段实施计划（修订）

## Phase A：模型收敛

- `SubAgentProfile` 字段收敛为“profile 即 subagent”
- 去除 `taskDescriptionRequirement` 及相关 UI/执行依赖
- settings 面板文案改为 SubAgent 定义编辑

## Phase B：Tool 协议重构

- `createSubAgent` 入参改为 `{ task }`
- 在 Agent Settings 中为 `createSubAgent` 增加 `boundSubAgentIds` 配置
- 默认提示词改为“按预配置 subagent 派发任务”，不再要求模型选择 subagent
- 增加运行时变量注入管线（不走 tool 入参）

## Phase C：策略化替换硬编码

- 引入上述 7 个策略接口及默认实现
- `create-sub-agent.ts`、`executor.ts`、`tool-factory.ts` 去硬编码逻辑

## Phase D：联调与收口

- 更新消息渲染、错误提示（变量缺失/类型错误/未找到 subagent）
- `bun lint`、`bun tsc` 全量通过

## 7. 主要难点与问题（直接说明）

1. AI SDK tool schema 与“动态字段”冲突
- 单个 tool 的 schema 本质是固定的。
- 处理方式：tool 入参采用固定外壳（`variables: Record<string, unknown>`），细粒度校验在运行时完成。

2. 绑定缺失/歧义
- 若未配置 `boundSubAgentIds` 或配置了多个但缺少选择策略，会导致运行时不可决策。
- 处理方式：配置校验 + 默认单绑定策略 + 明确错误码（`SUBAGENT_BINDING_MISSING` / `SUBAGENT_BINDING_AMBIGUOUS`）。

3. 提示词变量可发现性与可控性
- 变量不再由模型显式传参，需确保模型知道“可用变量名”以正确编写系统提示词。
- 处理方式：设置面板展示可注入变量清单；运行时渲染时返回结构化缺失变量错误（`SUBAGENT_VAR_MISSING`）。

4. UI 编辑器与运行时一致性
- 如果前端 schema 编辑和后端解析实现不一致，会出现“UI 可配但运行报错”。
- 处理方式：共享 schema/validator 模块，不做前后端两套规则。

5. 历史数据与过渡期
- 当前存量数据仍有旧字段（如 taskDescriptionRequirement）。
- 若你坚持不兼容旧配置，可直接做破坏式切换；代价是旧配置失效需重建。

6. 多 agent 共用 subagent 的权限边界
- 任何 agent 都能创建任意 subagent 时，需防止工具越权/误用。
- 处理方式：在 subagent 定义中加入可选 `allowedParentAgents`（默认 all）策略校验。

7. 执行逻辑“不同任务不同策略”如何表达
- 若全部依赖自然语言 `task`，可控性较差。
- 处理方式：先通过 `executionPolicy` + prompt 约束；必要时后续再引入显式 `mode` 字段。

## 8. 验收标准（修订）

- profile 与 subagent 语义合并，无模板概念残留。
- `create-subagent` 不依赖固定变量字段名。
- `create-subagent` 入参仅保留 `task`，不接受 `variables/payloadRef`。
- 主 agent 不传 `subagentId`，目标 subagent 完全由预配置绑定决定。
- 变量解析由 schema + 策略驱动，不在工具中硬编码分支。
- `bun lint`、`bun tsc` 通过。
