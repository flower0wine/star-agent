# SubAgent 策略模式改造方案（支持动态参数与动态执行逻辑）

## 1. 关键前提（新增）

你提出的约束是正确且必须满足的：

- `createSubAgent` 的输入参数不应固定。
- 不同 SubAgent Profile 接受不同参数。
- 同一 SubAgent 在不同任务类型下，执行逻辑也应不同。

因此，方案从“固定 createSubAgent 入参”升级为“Profile + Task Contract 驱动”。

## 2. 当前问题（为什么会硬编码）

当前实现采用单一 `createSubAgent(profileId, taskVars, payloadRef)` 协议，原因为：

- 早期优先跑通 master/subagent 主链路。
- 通过固定字段减少模型调用失败。
- 缺少“任务契约（Task Contract）”模型，导致参数和执行行为只能写死在工具文件中。

这直接导致：

- 扩展新任务类型要改 `create-sub-agent.ts`。
- payload 分发逻辑固定在工具实现中。
- master 选 profile 容易断联（猜 profileId）。

## 3. 新架构：Profile + Task Contract + Strategy

## 3.1 核心数据模型（新增）

在 `SubAgentProfile` 下新增 `taskContracts`（替代固定参数假设）：

- `contractId`: 任务类型 ID（如 `repo-cluster-summary`）
- `name`: 任务名
- `description`: 给 master 的调用说明
- `inputSchema`: 参数 JSON Schema（每个 contract 不同）
- `payloadPolicy`: payload 选择策略标识（range/list/custom/...）
- `executionPolicy`: 执行策略标识（analysis/report/extract/...）
- `outputSchema`（可选）：输出结构约束
- `enabled`: 是否可用

结论：参数结构由 `taskContracts[*].inputSchema` 决定，不再硬编码在 tool 文件。

## 3.2 Tool 层改造（两种可选实现）

### 方案 A（推荐，先落地）

保持单个 tool：`createSubAgent`

固定外壳：

- `profileId: string`
- `contractId: string`
- `args: Record<string, unknown>`
- `payloadRef?: unknown`

动态行为：

- 根据 `profileId + contractId` 找到 contract
- 用 `inputSchema` 校验 `args`
- 交给策略层执行

优点：改动小、兼容当前 UI 和历史调用路径。

### 方案 B（可选，后续增强）

为每个 contract 动态生成 tool（例如 `createSubAgent_profileA_contractX`），让模型得到强类型提示。

难点更高：工具数量膨胀、名称稳定性、上下文噪声、UI 显示复杂度。

## 3.3 策略接口（升级版）

建议目录：`src/lib/agents/sub-agent/strategies/`

1. `ContractResolveStrategy`
- 输入：`profileId, contractId, runtimeContext`
- 输出：`resolvedProfile, resolvedContract`

2. `ContractInputValidationStrategy`
- 输入：`args, inputSchema`
- 输出：`validatedArgs`

3. `PayloadSelectionStrategy`
- 输入：`repos, payloadRef, payloadPolicy`
- 输出：`selectedRepos, payloadMeta`

4. `TaskBuildStrategy`
- 输入：`resolvedContract, validatedArgs, runtimeContext, payloadMeta`
- 输出：`taskText, runtimeVars`

5. `ExecutionPolicyStrategy`
- 输入：`executionPolicy, task, profile, runtimeContext`
- 输出：`executorConfig`（模型、工具白名单、超时、附加约束）

6. `SubAgentToolResolutionStrategy`
- 输入：`toolIds, runtimeContext, executionPolicy`
- 输出：`tools`

7. `OrchestrationPolicyStrategy`
- 输入：`agentId, requestContext`
- 输出：`maxCycles, timeoutMs, waitMode`

## 4. master 与 subagent 断联治理（按新模型）

## 4.1 新增 `listSubAgentContracts` tool（必须）

返回：

- profile 基础信息
- 可用 `contractId/name/description`
- 每个 contract 的参数摘要（从 schema 提取）

master 调用流程改为：

1. `listSubAgentContracts`
2. 选择 `profileId + contractId`
3. `createSubAgent({ profileId, contractId, args, payloadRef })`

## 4.2 Prompt 与运行时一致化

master 默认提示词改成“必须先发现 contract 再创建”，避免模型直接猜参数结构。

## 5. 分阶段实施（更新）

## Phase S1：引入契约模型与默认策略（不改现有交互表面）

- 扩展 `SubAgentProfile` 增加 `taskContracts`
- 提供兼容转换：把旧 `taskDescriptionRequirement + varSchema` 映射为一个默认 contract
- 实现 `ContractResolve + Validation + TaskBuild` 默认策略
- `createSubAgent` 切换为 `{ profileId, contractId, args, payloadRef }` 内核

验收：

- 能通过 contract 动态校验参数并创建任务
- `bun lint`、`bun tsc` 通过

## Phase S2：断联治理

- 新增 `listSubAgentContracts` tool
- 更新 master 默认提示词和工具调用路径
- 前端展示 contract 与参数摘要（帮助人类配置）

验收：

- master 不再依赖“猜 profileId/猜参数结构”

## Phase S3：执行策略可插拔

- 引入 `executionPolicy`，在 executor 中按策略装配上下文和工具
- 编排参数接入 `OrchestrationPolicyStrategy`

验收：

- 新任务类型只需加 contract/策略，无需改 create-sub-agent 主流程

## 6. 文件结构建议（更新）

```text
src/lib/agents/sub-agent/
  contracts/
    contract-schema.ts
    contract-catalog.ts
  strategies/
    interfaces.ts
    default/
      contract-resolve.ts
      contract-validate.ts
      payload-selection.ts
      task-build.ts
      execution-policy.ts
      tool-resolution.ts
      orchestration-policy.ts
    registry.ts
  runtime-context.ts
```

## 7. 直接说明：会遇到的问题与难点

1. AI SDK tool schema 与“动态参数”冲突
- 单个 tool 的输入 schema 在一次请求内通常是固定的。
- 解决：使用“固定外壳 + runtime schema 校验”，或生成动态多 tool（复杂）。

2. Contract Schema 的可读性与模型可用性
- JSON Schema 太复杂时，模型仍会填错参数。
- 解决：`listSubAgentContracts` 返回“简化参数摘要 + 示例”，并在错误时返回结构化校验信息。

3. Profile/Contract 版本漂移
- 任务创建时和执行时 profile 可能被用户修改。
- 解决：任务入队时保存 profile+contract snapshot（不可变快照）。

4. 执行策略过度抽象风险
- 策略过多会造成排查困难。
- 解决：先仅实现默认策略，策略粒度保持中等，不做插件化框架。

5. 前后端配置一致性
- UI 展示 contract 与运行时解析 contract 若不一致会产生隐性 bug。
- 解决：共享同一 schema/validator 模块，不在前端手写另一套规则。

6. 任务结果结构化与恢复链路
- contract 不同意味着 output 结构可能不同，master 恢复消息难统一。
- 解决：先统一封装 `summary + rawOutput + contractId`，再按 contract 做增强渲染。

7. 工具数量与上下文成本
- 若采用“每 contract 一个 tool”，上下文 token 和选择复杂度都会升高。
- 解决：先用单 tool 外壳方案（A），后续按热点 contract 再做专用 tool。

## 8. 验收清单（更新）

- `createSubAgent` 不再假定固定业务参数结构。
- 不同 profile/contract 能定义不同 `inputSchema` 并被运行时校验。
- 新增 `listSubAgentContracts`，master 可先发现后调用。
- 任务执行使用 contract snapshot，避免配置漂移。
- `bun lint`、`bun tsc` 全量通过。

