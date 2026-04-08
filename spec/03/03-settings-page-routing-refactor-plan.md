# Settings 从弹窗改为路由页面的重构实施方案

## 1. 背景与目标

当前设置入口位于侧边栏，点击后打开 `SettingsDialog`（弹窗），内部通过本地状态 `activeSection` 切换分区。  
这导致两个问题：

- 无法通过 URL 直接定位某个设置分区或具体设置项。
- 设置内容与页面路由体系解耦，不利于后续扩展（分享链接、浏览器前进后退、外部跳转）。

本次重构目标：

1. 将设置从弹窗迁移为独立页面路由（`/settings`）。
2. 支持通过路由直接跳转到分区与设置项（深链）。
3. 保持现有设置业务逻辑与数据存储不变（仅重构展示与导航层）。

## 2. 现状分析（代码级）

核心现状：

- 弹窗入口：`src/components/app/sidebar/app-sidebar.tsx`
  - 本地状态 `settingsOpen` 控制弹窗显隐。
  - 使用 `SettingsDialog` 组件。
- 弹窗容器：`src/components/app/settings/settings-dialog.tsx`
  - 内部维护 `activeSection`。
  - 左侧导航 `SettingsSectionNav` + 右侧内容 `renderSection(activeSection)`。
- 分区组件（已具备可复用性）：
  - `sections/appearance-settings.tsx`
  - `sections/model-settings.tsx`
  - `sections/conversation-settings.tsx`
  - `agent-settings.tsx`
  - `sections/data-settings.tsx`
  - `sections/about-settings.tsx`

结论：分区内容组件基本可复用，主要重构点在“容器层”和“导航状态来源”（从本地 state 改为 URL）。

## 3. 路由设计（建议）

## 3.1 路由形态

采用可选 catch-all 路由：

- `src/app/settings/[[...slug]]/page.tsx`

URL 约定：

- `/settings` -> 默认分区（`appearance`）
- `/settings/appearance`
- `/settings/model`
- `/settings/conversation`
- `/settings/agents`
- `/settings/data`
- `/settings/about`
- `/settings/:section/:item` -> 分区内设置项深链（可选）

## 3.2 深链参数约定

为了兼顾稳定性与动态项，建议“section 放 path，item 放 path 或 query”：

- 固定设置项：优先 path（例如 `/settings/conversation/auto-save`）
- 动态设置项：使用 query（例如 `/settings/agents/subagents?profileId=xxx`）

建议统一读取结构：

- `section`: `slug[0]`
- `item`: `slug[1]`（可选）
- `searchParams`: 承载动态标识（如 `profileId`、`toolId`、`providerId`）

## 3.3 非法路由处理

- 未知 `section`：重定向到 `/settings/appearance`。
- 已知 `section` 但未知 `item`：回退到该分区默认项（不 404）。
- 动态 query 对应实体不存在：展示友好提示并回退默认项。

## 4. 组件重构方案

## 4.1 拆分 Settings 容器（关键）

从 `settings-dialog.tsx` 抽出纯页面容器，建议新增：

- `src/components/app/settings/settings-layout.tsx`

职责：

- 接收 `activeSection`、`activeItem`、`onSectionChange`。
- 复用 `SettingsSectionNav` 和现有分区组件渲染逻辑。
- 不包含 `Dialog` 相关代码。

可选再抽一层配置常量：

- `src/components/app/settings/settings-registry.tsx`
  - `SETTINGS_SECTIONS`
  - `renderSection(...)`
  - section/item 校验函数（`isValidSection`, `resolveDefaultItem`）。

## 4.2 分区内“设置项定位”能力

为满足“直接跳到某个设置项”，建议在分区组件中补齐锚点或受控定位：

- 方案 A（推荐）：在分区组件暴露 `focusItem` 入参，根据 item 高亮/滚动到目标块。
- 方案 B：为每个可跳转块增加 DOM `id` + URL hash 滚动。

建议优先 A（更可控，避免 hash 与动画/滚动容器冲突）。

## 4.3 Agent 分区特殊处理

`agents` 分区有二级状态（`activePanel`、`activeSubAgentProfileId`），需建立 URL 映射：

- `/settings/agents/agent?agentId=star`
- `/settings/agents/subagents?profileId=<id>`

`AgentSettings` 新增受控入参（建议）：

- `initialPanel?: "agents" | "subagents"`
- `initialAgentId?: "star" | "master" | "patent"`
- `initialSubAgentProfileId?: string`

并在首次加载时消费，避免与内部 state 冲突。

## 5. 迁移步骤（建议顺序）

1. 新增 `settings-registry.tsx`，统一 section 常量、校验、渲染映射。
2. 新增 `settings-layout.tsx`，承接原 `SettingsDialog` 中“非弹窗”部分。
3. 新增路由页 `src/app/settings/[[...slug]]/page.tsx`，从 URL 解析 section/item 并渲染 `SettingsLayout`。
4. 改造 `SettingsSectionNav`：
  - `onChange` 改为导航到 `/settings/:section`（保留受控 props，不强耦合 router）。
5. 改造 `AppSidebar`：
  - 删除 `settingsOpen` 和 `SettingsDialog` 挂载。
  - “设置”按钮改为 `Link href="/settings"` 或 `router.push("/settings")`。
6. 增加分区内 item 定位能力（先覆盖 `conversation`、`model`、`agents` 三个高价值分区）。
7. 删除/下线 `settings-dialog.tsx`（或保留一版兼容包装，下一迭代移除）。

## 6. 影响文件清单（预估）

新增：

- `src/app/settings/[[...slug]]/page.tsx`
- `src/components/app/settings/settings-layout.tsx`
- `src/components/app/settings/settings-registry.tsx`

修改：

- `src/components/app/sidebar/app-sidebar.tsx`
- `src/components/app/settings/settings-section-nav.tsx`
- `src/components/app/settings/agent-settings.tsx`（增加 URL 初始化能力）
- `src/components/app/settings/sections/conversation-settings.tsx`（补 item 定位）
- `src/components/app/settings/sections/model-settings.tsx`（补 item 定位）
- `src/components/app/settings/index.ts`（导出调整）

待移除或降级：

- `src/components/app/settings/settings-dialog.tsx`

## 7. 风险与规避

- 风险：分区组件内部本地 state 与 URL 状态双写，导致跳转后状态不一致。
  - 规避：定义“URL 为单一真源”，组件仅初始化一次或受控同步。
- 风险：`agents` 分区存在动态 profile，深链命中失效。
  - 规避：profile 不存在时回退首个可用 profile，并提示。
- 风险：从弹窗改页面后，用户操作路径变化带来体验回归。
  - 规避：保留侧边栏入口位置不变；页面布局复用原视觉结构（左导航 + 右内容）。

## 8. 验收标准

功能验收：

1. 访问 `/settings` 可正常展示设置页，默认分区正确。
2. 访问 `/settings/:section` 可进入对应分区。
3. 访问 `/settings/:section/:item` 或带 query 的 URL，可定位到目标设置项。
4. 浏览器前进/后退时，分区和设置项状态与 URL 一致。
5. 侧边栏“设置”入口不再弹窗，而是进入设置路由页。

回归验收：

1. 现有设置读写逻辑不变（主题、模型、历史策略、数据清理、Agent 配置）。
2. 无新增持久化 schema 变更。
3. 页面在桌面端与移动端可用（响应式不破坏）。

## 9. 实施边界（本次重构）

本次仅做“容器和路由重构”，不调整：

- 各设置项业务语义
- store 数据结构
- 后端 API 或本地存储协议

这样可以将风险控制在 UI/路由层，先完成“可直达链接”的核心能力，再迭代设置项信息架构。
