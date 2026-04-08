# SubAgent Tool UI 与 Agent Tool UI 一致化实现方案

## 1. 背景与目标

当前 `Agent` 与 `SubAgent` 的工具配置 UI 存在明显不一致：

- `Agent`：`AgentToolCenter` 提供分类分组、搜索、全选/清空/恢复默认、卡片态展示、工具描述、核心标记、默认参数 JSON、`createSubAgent` 特殊配置。
- `SubAgent`：`SubAgentProfileCenter` 仅提供“工具白名单”勾选列表（`toolIds`），无搜索/分组/批量操作，信息密度和交互体验明显弱于 Agent。

目标：让 SubAgent 的 Tool 展示与交互体验与 Agent 的 Tool UI 保持一致，同时保持现有 SubAgent 运行时行为稳定。

## 2. 现状分析（代码级）

### 2.1 Agent 侧

- UI：`src/components/app/settings/agent-settings/agent-tool-center.tsx`
- 数据结构：`dynamicConfig.toolConfigs`（`enabled/defaultInput/boundSubAgentIds/dynamicParameters`）
- 工具来源：`getAgentTools(agentId)`（全量目录）
- 默认启用逻辑：`getDefaultEnabledTools(agentId)` + `toolConfigs` 增量覆盖

### 2.2 SubAgent 侧

- UI：`src/components/app/settings/agent-settings/subagent-profile-center.tsx`
- 数据结构：`SubAgentProfile.toolIds: string[]`
- 工具来源：`getSubAgentCompatibleTools()`（`tool-registry` 过滤 `subAgentCompatible`）
- 运行时：`createSubAgentTools(toolIds, context)` 仅支持固定工厂映射，且只消费 `toolIds`

### 2.3 关键约束

- SubAgent 运行时当前不读取 `defaultInput`/`dynamicParameters` 等高级配置。
- `SubAgentProfile` schema（`profile-schema.ts`）只定义了 `toolIds`，无 `toolConfigs`。
- 若直接把 AgentToolCenter 全量复用到 SubAgent，会引入暂未被运行时消费的配置项，导致“可配但不生效”的认知偏差。

## 3. 推荐方案（V1：UI 一致化，数据结构不迁移）

## 3.1 方案摘要

抽取统一的“工具选择面板”基础组件，供 Agent/SubAgent 共用一致的展示层；SubAgent 仅启用与其能力匹配的功能（搜索、分组、批量操作、统一卡片样式），继续写入 `toolIds`。

即：**先统一 UI/交互，再决定是否统一配置模型。**

## 3.2 具体改造点

1. 新增可复用组件（建议）
- 新文件：`src/components/app/settings/agent-settings/tool-selection-panel.tsx`
- 负责：
  - 分类分组（`TOOL_CATEGORIES`）
  - 搜索过滤
  - 统一卡片视觉（checkbox + 名称 + 描述 + badge）
  - 批量操作（全选、清空、恢复默认）
  - 受控 `enabledToolIds` 与变更回调
- 可插槽：
  - `renderToolExtra?(tool)`：用于 Agent 保留默认参数、动态参数等高级区域
  - `isCore?(toolId)`：是否显示核心标记
  - `emptyText`/`notFoundText`/`title`/`description` 等文案

2. 重构 `AgentToolCenter`
- 将现有“通用展示层”迁移到 `ToolSelectionPanel`。
- 保留 Agent 专属逻辑：
  - `toolConfigs` 计算 `enabledToolSet`
  - `defaultInput` JSON 编辑校验
  - `createSubAgent` 的 `boundSubAgentIds` / `dynamicParameters`

3. 改造 `SubAgentProfileCenter`
- 将当前“工具白名单”区块替换为 `ToolSelectionPanel`。
- 数据映射：
  - `enabledToolIds` <- `draftProfile.toolIds`
  - `onEnabledToolIdsChange` -> 写回 `draftProfile.toolIds` 并 `version + 1`
- 默认推荐策略：
  - 使用当前新建 profile 默认值（`["searchRepositories", "getRepositoryReadme"]`）作为“恢复默认”基线
  - 不显示默认参数、动态参数、绑定 SubAgent 的扩展区域
- 工具来源保持 `getSubAgentCompatibleTools()`

4. 文案与一致性
- SubAgent 面板标题与 Agent 对齐为“工具中心”
- 保留 SubAgent 语义提示：只展示“可用于 SubAgent 的工具子集”

## 3.3 验收标准（V1）

- SubAgent 工具区具备与 Agent 一致的：
  - 搜索框
  - 分类分组显示
  - 卡片样式与勾选交互
  - 全选/清空/恢复默认
  - 启用计数 badge
- `SubAgentProfile.toolIds` 持久化与加载行为不变。
- `sub-agent/executor` 执行路径无改动，已有 profile 可直接运行。
- Agent 工具中心现有高级能力（默认参数、动态参数、绑定）不回归。

## 4. 可选方案（V2：配置模型统一，不建议本次一起做）

把 `SubAgentProfile` 从 `toolIds[]` 升级为 `toolConfigs`（同 Agent）。  
收益：完全共享 UI 与校验链路。  
代价：涉及 schema 迁移、历史数据兼容、运行时消费改造，范围明显扩大。

若后续需要推进，建议单独立项，不和本次“UI 一致化”混做。

## 5. 实施步骤（建议顺序）

1. 抽取 `ToolSelectionPanel`（纯展示与选择逻辑）
2. 迁移 `AgentToolCenter` 到新组件（确保功能等价）
3. 改造 `SubAgentProfileCenter` 工具区接入新组件
4. 自测场景：
  - Agent：搜索、批量、默认参数校验、`createSubAgent` 特殊配置
  - SubAgent：搜索、批量、保存后刷新、切换 profile
5. 运行 `bun run lint`（如需 host 权限，按仓库约定走授权）

## 6. 风险与规避

- 风险：抽取通用组件时误伤 Agent 特殊逻辑。
  - 规避：保留 Agent 专属扩展区域为插槽，不在通用层处理业务字段。
- 风险：SubAgent “恢复默认”策略不清晰。
  - 规避：固定使用创建默认值（当前两项）并在 UI 文案明确。
- 风险：视觉一致但行为边界不一致导致误解。
  - 规避：在 SubAgent 面板中明确“仅支持兼容工具，不支持 Agent 高级参数”。

## 7. 影响文件清单（预估）

- 新增：
  - `src/components/app/settings/agent-settings/tool-selection-panel.tsx`
- 修改：
  - `src/components/app/settings/agent-settings/agent-tool-center.tsx`
  - `src/components/app/settings/agent-settings/subagent-profile-center.tsx`

---

结论：本次建议采用 **V1（UI 一致化 + 数据结构不迁移）**。该方案改动可控、风险低，能快速解决“SubAgent 与 Agent Tool UI 不一致”的核心问题，并为后续是否推进模型统一预留空间。
