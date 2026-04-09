# Patent Agent 接入 SerpApi Google Patents 实施方案

## 1. 目标与范围

目标：在现有 `patent` agent 中新增一个可配置 Provider，通过 SerpApi 的 Google Patents 能力获取专利检索结果，并与当前工具输出结构保持兼容。

范围包含：
- `src/agents/patent`（Provider 配置、运行时参数）
- `src/lib/patent`（Provider 实现与路由）
- `src/components/app/settings/agent-settings`（设置页新增 SerpApi 配置项）
- `src/app/api/chat/handler-patent.ts`（无需改流程，仅沿用 runtime-resolver 注入）

不在本次范围：
- 改造 `searchPatents` / `analyzePatentTrends` tool 的入参协议
- 新增数据库持久化层
- 复杂多源融合排序（本次仅单 Provider 运行）

## 2. 现状分析（代码级）

### 2.1 现有链路

1. `handlePatentAgent` 通过 `resolveAgentRuntime` 生成 `tools + systemPrompt`。
2. `resolvePatentRuntimeConfig` 把 `staticParams/customParams` 组装为 `PatentRuntimeConfig`。
3. `searchPatents` / `analyzePatentTrends` tool 调用 `src/lib/patent/service.ts`。
4. `service.ts` 内按 `runtimeConfig.provider` 路由到具体 Provider（当前仅 `patentsview` 真正可用）。

### 2.2 可复用点

- Provider 已是插件式接口：`PatentProvider`。
- UI 已支持 `provider` 下拉与按 provider 显示鉴权字段。
- `PatentRecord` 是统一模型，天然适合新增 Provider 做字段归一化。

## 3. SerpApi 研究结论（用于设计约束）

基于 SerpApi 官方文档：

1. Google Patents 检索引擎
- Endpoint: `https://serpapi.com/search.json`
- 必填：`engine=google_patents`、`api_key`
- 主查询：`q`（支持 `;` 分隔多查询；支持 Google Patents 高级语法）

2. 可用过滤参数（与本项目强相关）
- `inventor`
- `assignee`
- `sort`：`new` / `old`
- `dups`：默认 Family，可传 `language` 走 Publication 去重
- `patents`（默认 true）
- `scholar`（默认 false）

3. 返回结构（检索）
- `search_information.total_results`
- `organic_results[]` 常见字段：
  - `patent_id`, `patent_link`, `serpapi_link`
  - `title`, `snippet`
  - `publication_date`, `filing_date`, `priority_date`, `grant_date`
  - `inventor`, `assignee`, `publication_number`, `pdf`

4. 细节引擎（可选增强）
- `engine=google_patents_details`
- 入参：`patent_id`
- 可用于后续补全更丰富字段（如法律事件、家族信息等）

5. 错误语义
- 通用状态：`search_metadata.status` 从 `Processing` 到 `Success/Error`
- 常见 HTTP：
  - `401`：API key 无效
  - `429`：额度用尽（run out of searches）
  - `400`：缺失必要参数

结论：SerpApi 的 `google_patents` 可以直接满足本项目 `searchPatents` 的主能力，且天然输出 Google Patents 链接，适合替代/补充 PatentsView。

## 4. 方案设计

### 4.1 Provider 枚举与配置扩展

文件：`src/agents/patent/static-config.ts`

1. 扩展 Provider 枚举：
- 新增 `"serpapi-google-patents"`

2. 扩展 custom params：
- `serpApiKey?: string`
- `serpApiBaseUrl?: string`（默认 `https://serpapi.com/search.json`）
- `serpApiDedupeMode?: "family" | "publication"`（映射 `dups`）
- `serpApiIncludeScholar?: boolean`（默认 false）

3. 扩展 runtimeConfig：
- 新增 `serpApi` 节点：
  - `apiKey`
  - `baseUrl`
  - `dedupeMode`
  - `includeScholar`

4. 更新 `PATENT_PROVIDER_OPTIONS`：
- 新增“SerpApi Google Patents”选项，并注明需 SerpApi key、按调用计费。

### 4.2 设置页接入

文件：`src/components/app/settings/agent-settings.tsx`

`PatentApiConfigCard` 新增 provider 分支：
- 当 `provider === "serpapi-google-patents"` 时显示：
  - `API Key`（password）
  - `Base URL`
  - `去重策略`（Family/Publication）
  - `是否包含 Scholar`（开关，默认关）

说明文案建议：
- 默认仅拉取 `patents=true`、`scholar=false`，避免噪音。
- `publication` 去重会增大结果量，但更细粒度。

### 4.3 Provider 实现

新增文件：`src/lib/patent/providers/serpapi-google-patents.ts`

实现 `PatentProvider`：

1. 入参映射（PatentSearchParams -> SerpApi）
- `query` -> `q`
- `company` -> `assignee`
- `sortBy/sortOrder` 映射：
  - 日期排序：`desc => sort=new`，`asc => sort=old`
  - 引用排序：SerpApi 检索端无直接 citations 排序，降级为 `sort=new/old` + 在本地标注降级
- 统一强制：`engine=google_patents`, `patents=true`
- `scholar` 按配置开关控制

2. 时间过滤策略
- SerpApi 参数层未提供与当前模型一一对应的 `fromDate/toDate` 字段。
- 本期采用“服务端后过滤”策略：
  - 先取结果
  - 解析 `publication_date` / `filing_date`
  - 在本地按 `fromDate/toDate` 过滤
- 该策略要在返回中记录 `timeFilterMode: "post-filter"`（可放 `raw`）以便调试。

3. 字段归一化（organic_results -> PatentRecord）
- `patentId`: 优先 `publication_number`，否则从 `patent_id` 提取
- `title`: `title`
- `abstract`: `snippet`
- `patentDate`: `publication_date`
- `applicationDate`: `filing_date`
- `assignees`: 从 `assignee` 拆分
- `inventors`: 从 `inventor` 拆分
- `cpcCodes`: 当前检索结果通常无 CPC，设为空数组
- `citationCount`: 通常无，置 `undefined`
- `sourceUrl`: `patent_link`

4. 分页与数量控制
- 先按 `limit` 截断输出，确保与现有 `maxResultsPerRequest` 约束一致。
- `totalHits` 优先 `search_information.total_results`。

5. 错误处理
- `401` -> 明确提示 API Key 无效
- `429` -> 明确提示额度不足
- 其他非 2xx -> 透传状态码 + body 摘要
- 响应 `search_metadata.status === "Error"` 时主动抛错

### 4.4 Provider 路由接入

文件：`src/lib/patent/service.ts`

- 在 `providers` map 注册 `serpapi-google-patents`。
- 移除该 provider 的“未接入”错误分支。
- 保持 PatentsView/EPO/USPTO 逻辑不变。

### 4.5 对 `analyzePatentTrends` 的影响

`analyzePatentTrends` 复用 `searchPatents` 输出；因 SerpApi 返回结构中缺失 CPC 与 citations，趋势分析会有如下变化：
- `topCpcCodes` 大概率为空
- `topKeywords` 与 `topAssignees` 仍可用
- `momentum` 仍可计算（基于月度数量）

建议在系统提示词增加“数据源字段差异提醒”：当 CPC 缺失时要显式告知“该数据源未返回 CPC 结构化字段”。

## 5. 安全与配置建议

1. Key 存储
- 继续走现有 `agentConfig.dynamicConfig.customParams`，仅服务端消费。
- 严禁在日志打印完整 `serpApiKey`。

2. 环境变量兜底（可选）
- 增加 `SERPAPI_API_KEY` 作为兜底来源（当设置页未配置时）。
- 优先级：`customParams.serpApiKey` > `process.env.SERPAPI_API_KEY`。

3. 超时与重试
- 复用现有 `requestTimeoutMs`。
- 推荐仅对 `5xx/网络抖动` 做 1 次短重试，`401/429/400` 不重试。

## 6. 分阶段实施

### Phase 1（最小可用）
- Provider 枚举与设置页新增 SerpApi 配置
- `serpapi-google-patents` provider 实现
- `service.ts` 路由接入
- 手工验证 `searchPatents` 可返回数据

### Phase 2（质量增强）
- 引入本地后过滤 `fromDate/toDate`
- 增强错误分类与用户可读提示
- 对 `analyzePatentTrends` 增加“字段缺失兜底文案”

### Phase 3（能力增强，可选）
- 支持二段式详情拉取（`google_patents_details`）补全字段
- 增加可选的结果缓存（短 TTL）降低配额消耗

## 7. 验收标准

1. 设置页可选择 `SerpApi Google Patents`，并可保存 key/baseUrl 等参数。
2. 使用该 provider 时，`searchPatents` 返回结构符合现有 `PatentSearchResult` 协议。
3. `analyzePatentTrends` 在 SerpApi 下可正常运行，不因 CPC 缺失报错。
4. `401/429` 错误可被用户识别，不出现“未知错误”。
5. 切换回 `patentsview` 后行为无回归。

## 8. 风险与应对

1. 风险：SerpApi 不直接提供 citations/CPC 等结构化字段。
- 应对：在规范中定义可空字段，分析结果显式标记“数据源限制”。

2. 风险：时间过滤精度依赖本地后过滤。
- 应对：严格统一日期解析；过滤失败时丢弃非法日期数据并记录计数。

3. 风险：配额成本增加。
- 应对：默认开启缓存（SerpApi 文档说明同参命中缓存可不计费）；默认 `scholar=false`，并限制 `limit`。

## 9. 变更清单（预计）

- `src/agents/patent/static-config.ts`
- `src/components/app/settings/agent-settings.tsx`
- `src/lib/patent/service.ts`
- `src/lib/patent/providers/serpapi-google-patents.ts`（新增）
- `src/lib/agents/default-system-prompt-template.ts`（可选：补充字段差异提示）
- `src/agents/patent/index.ts`（可选：新增 prompt 变量）

## 10. 参考资料

- SerpApi Google Patents API: https://serpapi.com/google-patents-api
- SerpApi Google Patents Details API: https://serpapi.com/google-patents-details-api
- SerpApi Status & Error Codes: https://serpapi.com/api-status-and-error-codes
- Google Patents 查询语法（SerpApi 文档中引用）: https://support.google.com/faqs/answer/7049475
