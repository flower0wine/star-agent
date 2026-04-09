# searchPatents Tool 前端专属 UI 改造方案（含 displayRepositories 抽离）

## 1. 背景与目标

当前聊天消息渲染统一在 `src/components/chat/message-renderer.tsx`，其中：
- `tool-displayRepositories` 的展示逻辑直接内嵌在 renderer 内。
- 其他 tool 默认走 `ToolInput + ToolOutput(JSON)`。
- `searchPatents` 目前没有专属展示，信息可读性较弱。

本次目标：
1. 为 `searchPatents` 新增独立 UI 组件，突出关键信息（查询条件、命中概览、专利列表）。
2. 将 `displayRepositories` 的内嵌渲染逻辑抽离为可复用组件，降低 `message-renderer` 复杂度。
3. 保持现有流式渲染与 tool 状态机制不变（`input-streaming` / `output-available` / `output-error`）。

## 2. 现状分析（代码证据）

### 2.1 displayRepositories 确实内嵌在 message-renderer

文件：`src/components/chat/message-renderer.tsx`

- 存在 `if (partType === "tool-displayRepositories" && isStaticToolUIPart(part)) { ... }` 分支。
- 分支内部混合了：
  - loading/progress 文案
  - 完整 repo 列表渲染（`GitHubRepo`）
  - duration 显示
- 同一文件也承担：
  - 文本消息
  - reasoning
  - sub-agent 卡片
  - 通用 tool JSON 渲染

结论：`message-renderer` 职责过多，抽离是合理且低风险的。

### 2.2 Star Agent 与 Chat MessageRenderer 的关系

文件：`src/components/agents/star/index.ts`

- `MessageRenderer` 是从 `../../chat/message-renderer` 直接 re-export。
- 不存在单独的 Star message renderer。

结论：改造 `chat/message-renderer.tsx` 会影响 star/master/patent 三个 agent，因此应采用“注册式渲染器 + 默认回退”的保守方案，避免回归。

## 3. 设计原则

1. 单一职责
- `message-renderer` 仅负责“分发不同 part 给对应 renderer”。
- 具体 tool UI 放到独立组件文件。

2. 向后兼容（当前迭代内）
- 不改变后端 tool 协议。
- 对未知字段和缺失字段容错。
- 未命中专属 renderer 的 tool 仍走默认 JSON 展示。

3. 渐进增强
- `searchPatents` 优先展示核心字段，非关键字段折叠/省略。
- 先实现展示，不改 tool 输入 schema。

## 4. 目标架构

```text
MessageRenderer (orchestrator)
  ├─ reasoning/text renderer
  ├─ special tool renderer registry
  │   ├─ DisplayRepositoriesToolPart
  │   ├─ SearchPatentsToolPart   <- new
  │   └─ (future) AnalyzePatentTrendsToolPart
  └─ default Tool (JSON)
```

### 4.1 建议目录结构

```text
src/components/chat/tool-parts/
  index.ts
  types.ts
  display-repositories-tool-part.tsx
  search-patents-tool-part.tsx
```

说明：
- `tool-parts` 归属 `chat`，因为是消息渲染层能力，不属于某个单一 agent。
- 组件命名直观、可扩展，不引入过度抽象。

## 5. displayRepositories 抽离方案

### 5.1 新组件职责

新增：`display-repositories-tool-part.tsx`

职责：
- 仅处理 `tool-displayRepositories` 的 3 种状态渲染。
- 输入类型：`StaticToolUIPart` + repo output 类型。
- 输出：完整 JSX（沿用现有视觉样式，避免行为变化）。

### 5.2 message-renderer 改造

- 删除内嵌 `tool-displayRepositories` 大分支。
- 改为调用 `<DisplayRepositoriesToolPart part={part} index={i} />`。

收益：
- `message-renderer` 体积下降。
- 工具 UI 能力可复用和并行迭代。

## 6. searchPatents 专属 UI 方案

### 6.1 输入/输出数据特征

输入参数不固定（`query/company/date/limit/sort` 可缺省）。

输出常见字段：
- `provider`
- `count` / `totalHits`
- `timeRange.{fromDate,toDate}`
- `patents[]`（核心列表）

### 6.2 UI 信息层级（建议）

优先级 A（始终展示）
- 数据源：`provider`
- 命中：`count / totalHits`
- 时间窗口：`fromDate ~ toDate`

优先级 B（有值才展示）
- 查询条件 chips：`query/company/sortBy/sortOrder/limit`

优先级 C（列表）
- 专利卡片（前 N 条，默认 10，支持展开查看全部）：
  - `title`
  - `patentId`
  - `patentDate`（其次 `applicationDate`）
  - `assignees`（最多前 2）
  - `inventors`（最多前 2）
  - `abstract` 摘要截断
  - `sourceUrl` 外链

### 6.3 组件行为

新增：`search-patents-tool-part.tsx`

状态处理：
- `input-streaming`：展示“正在检索专利...” loading。
- `output-error`：展示错误卡片。
- `output-available`：展示结构化结果卡片。

容错规则：
- `patents` 为空时展示“未检索到专利数据”。
- 字段缺失时回退为 `-`，不抛异常。
- `sourceUrl` 非法则不渲染链接按钮。

### 6.4 视觉建议（基于现有 shadcn 样式）

- 使用现有 `Card/Badge/Button/Separator` 等基础组件。
- 不写固定颜色值，统一使用语义色（`bg-muted/xx`, `text-muted-foreground`, `border-border`）。
- 与 `GitHubRepo` 卡片风格保持一致的信息密度，避免突兀。

## 7. message-renderer 组件重构建议

### 7.1 分发逻辑

在 `renderParts` 中加入专属 tool 分发：
1. `tool-displayRepositories` -> `DisplayRepositoriesToolPart`
2. `tool-searchPatents` -> `SearchPatentsToolPart`
3. 其他 -> 默认 `Tool` JSON

### 7.2 可选增强（非本期必须）

- 建立简单映射表：
  - `const TOOL_PART_RENDERERS: Record<string, Renderer>`
- 让新增 tool UI 只需要注册，不再修改长 if/else。

## 8. 分阶段实施

### Phase 1（本次）
- 抽离 `displayRepositories` 到独立组件。
- 新增 `searchPatents` 专属组件并接入。
- 保持默认 tool JSON 兜底不变。

### Phase 2（增强）
- 新增 `analyzePatentTrends` 专属 UI（趋势摘要 + 关键词/CPC tag）。
- 引入 tool renderer registry，进一步解耦。

## 9. 影响文件（预计）

新增：
- `src/components/chat/tool-parts/types.ts`
- `src/components/chat/tool-parts/display-repositories-tool-part.tsx`
- `src/components/chat/tool-parts/search-patents-tool-part.tsx`
- `src/components/chat/tool-parts/index.ts`

修改：
- `src/components/chat/message-renderer.tsx`

（可选）
- `src/components/agents/star/index.ts`（若后续要拆分不同 agent renderer）

## 10. 验收标准

1. `tool-displayRepositories` 在 UI 上行为与当前一致（含 partial/complete/loading）。
2. `tool-searchPatents` 不再显示纯 JSON，而是结构化卡片展示。
3. 输入参数缺失或输出字段不完整时不崩溃，UI 正常降级。
4. 未专门适配的 tool 仍走默认 `Tool` JSON 展示。
5. `bun run lint` 与 `bun run tsc -- --noEmit` 通过。

## 11. 风险与规避

1. 风险：抽离时漏掉 displayRepositories 的渐进式状态。
- 规避：先复制现有逻辑 1:1，再做小步重构。

2. 风险：searchPatents 返回字段随 provider 变化而不稳定。
- 规避：类型采用可选字段 + 空值兜底；展示关键字段最小集合。

3. 风险：`message-renderer` 改动影响所有 agent。
- 规避：保留默认 JSON fallback，逐步灰度专属 renderer。

---

结论：
- `displayRepositories` 当前确实内嵌在 `message-renderer`，应先抽离。
- `searchPatents` 适合新增独立 Tool Part 组件，以结构化卡片替代纯 JSON，提升可读性且不改变后端协议。
