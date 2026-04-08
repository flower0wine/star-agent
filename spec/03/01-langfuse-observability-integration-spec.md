# Vercel AI SDK 可扩展观测接入方案（Langfuse 优先）

## 1. 背景与目标

本项目基于 Next.js + Vercel AI SDK，已有多条 AI 调用链路：
- `src/app/api/chat/handler.ts`（star agent）
- `src/app/api/chat/handler-patent.ts`（patent agent）
- `src/app/api/chat/handler-master.ts` + `src/lib/agents/multi-stream.ts`（master + sub-agent 编排）
- `src/lib/agents/sub-agent/executor.ts`（ToolLoopAgent 子任务）

目标：
- 首先接入 Langfuse，覆盖所有主/子 agent 生成链路。
- 方案保持可扩展，后续可并行输出到其他观测平台（如 Helicone / LangSmith / Axiom 等）。
- 以最小侵入实现，尽量不改业务核心逻辑。

## 2. 结论：最佳接入策略

最佳方案是 **OTel 基座 + AI SDK telemetry 封装层 + Provider Adapter**：

1. 使用 Next.js `instrumentation.ts` 注册 OpenTelemetry（Node runtime）。
2. 使用 `LangfuseSpanProcessor` 将 AI SDK telemetry spans 导出到 Langfuse。
3. 在所有 `streamText/generateText`（含恢复调用与子 agent）统一注入 `experimental_telemetry`。
4. 将 telemetry 组装逻辑抽到一个内部工厂（adapter 风格），使平台切换或多平台并发只改一处。

这是当前兼顾“开箱即用”和“可演进”的路径。

## 3. 为什么这样选

### 3.1 Langfuse 对 AI SDK 是官方集成路径
- AI SDK 官方提供 Langfuse Observability integration 页面。
- Langfuse 官方对 Vercel AI SDK 推荐通过 OpenTelemetry 接入。

### 3.2 扩展性来自 OTel + AI SDK integration 机制
- AI SDK telemetry 基于 OpenTelemetry。
- AI SDK 支持 `experimental_telemetry.integrations` 多集成并行。
- 后续可在不改业务调用参数结构的前提下，新增/替换观测接收端。

### 3.3 Next.js 约束明确
- Next.js 推荐在 `instrumentation.ts` 的 `register` 内做启动时注册。
- Langfuse 文档明确建议 Next.js 使用 `NodeSDK` 路径，不走 `@vercel/otel` 的 `registerOTel`（OTel JS SDK v2 兼容性原因）。

## 4. 目标架构

```text
AI Route / Agent Runtime
  -> telemetry options factory (项目内统一函数)
  -> streamText / generateText / ToolLoopAgent stream
      experimental_telemetry: {
        isEnabled,
        functionId,
        metadata,
        recordInputs,
        recordOutputs,
        integrations[]
      }
  -> OpenTelemetry tracer provider
  -> LangfuseSpanProcessor (+ optional other processor/integration)
  -> Langfuse UI / downstream BI
```

## 5. 具体接入设计（针对当前仓库）

### 5.1 基础设施层（一次性）

新增建议文件：
- `instrumentation.ts`
- `src/lib/observability/otel-node.ts`
- `src/lib/observability/telemetry.ts`
- `src/lib/observability/types.ts`

职责：
- `instrumentation.ts`：仅负责在 Node runtime 注册 observability 启动逻辑。
- `otel-node.ts`：初始化 `NodeSDK` 与 `LangfuseSpanProcessor`（可加 span 过滤）。
- `telemetry.ts`：统一生成 `experimental_telemetry` 参数，隐藏平台细节。
- `types.ts`：定义 telemetry 上下文字段（requestId、agentId、conversationId、cycleId 等）。

### 5.2 调用点改造（必须覆盖）

在以下调用点统一注入 telemetry：
- `src/app/api/chat/handler.ts` 的 `streamText(streamOptions)`
- `src/app/api/chat/handler-patent.ts` 的 `streamText(streamOptions)`
- `src/app/api/chat/handler-master.ts` 的 `streamText(streamOptions)`
- `src/lib/agents/orchestrator/master-resumption.ts`（若内部有 `streamText` 恢复调用）
- `src/lib/agents/sub-agent/executor.ts` 的 `createAgentUIStream` / agent 调用链（若支持透传 telemetry 配置则开启）

建议约定 `functionId`：
- `chat.star.stream`
- `chat.patent.stream`
- `chat.master.stream`
- `chat.master.resume`
- `chat.subagent.run`

建议 metadata（统一 key）：
- `requestId`
- `agentId`
- `profileId`（子 agent）
- `conversationId`（如果可获得）
- `cycleNumber`（master orchestration）
- `userId`（若有）
- `environment`（dev/staging/prod）

### 5.3 隐私与采样策略

默认策略建议：
- `isEnabled`: `true`（prod/staging）
- `recordInputs`: `false`（生产默认关，避免敏感输入直接外发）
- `recordOutputs`: `false`（生产默认关，按需白名单开启）
- `metadata` 保留业务诊断字段，不放原始敏感数据

开发环境可临时：
- `recordInputs: true`
- `recordOutputs: true`

采样建议（在 telemetry factory 实现）：
- `prod`: 10%-30% 全量内容 + 100% 错误请求
- `staging/dev`: 100%

## 6. 可扩展设计（多平台）

在 `src/lib/observability/telemetry.ts` 建议定义：
- `buildTelemetryOptions(context): ExperimentalTelemetry | undefined`
- 内部读取配置：
  - `OBSERVABILITY_PROVIDER=langfuse|none|multi`
  - `OBSERVABILITY_EXTRA_INTEGRATIONS=...`

扩展规则：
- Langfuse 是默认 provider（当前阶段）。
- 后续新增平台时，只增加 adapter / integration，不改各业务 handler。
- 允许 `integrations: [langfuseLike, customLogger, devTools]` 并行。

## 7. 分阶段实施计划

### M1（本周可落地）
- 接入 NodeSDK + LangfuseSpanProcessor。
- 在三个主 handler 接入 `experimental_telemetry`。
- 验证 trace 可在 Langfuse 中按 `functionId` 和 `requestId` 检索。

### M2（增强）
- 覆盖 master resume + sub-agent。
- 加入统一 metadata 字段与采样/脱敏策略。
- 补充错误链路标记（tool error、abort、timeout）。

### M3（运营化）
- 定义监控面板：TTFT、总延迟、token、成本、tool failure rate。
- 建立 release 对比（按 deployment version / git sha 聚合）。
- 接入评估闭环（Langfuse scores/datasets，按需）。

## 8. 风险与规避

1. 风险：只在主链路开 telemetry，子 agent 无法串联。  
规避：master + resume + subagent 全覆盖，并传递 `requestId/cycleNumber/profileId`。

2. 风险：敏感数据外发。  
规避：生产默认 `recordInputs/recordOutputs=false`，仅用 metadata 做索引。

3. 风险：Next.js/OTel 初始化方式不当导致不生效。  
规避：使用 `instrumentation.ts` + Node runtime 导入初始化，避免分散初始化。

4. 风险：环境变量命名混淆。  
规避：统一采用 `LANGFUSE_BASE_URL`（同时兼容旧命名时需明确注释）。

## 9. 建议环境变量

```bash
# Langfuse
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Observability policy
OBSERVABILITY_PROVIDER=langfuse
OBSERVABILITY_ENV=development
OBSERVABILITY_RECORD_INPUTS=false
OBSERVABILITY_RECORD_OUTPUTS=false
OBSERVABILITY_SAMPLE_RATE=1
```

## 10. 验收标准

- 任一 `/api/chat` 请求在 Langfuse 可查到对应 trace。
- `chat.master.stream` 触发子任务时，能在同一上下文下定位到子 agent 执行。
- 当 tool 执行失败时，trace 中可看到失败步骤与错误信息（至少 metadata + status）。
- 切换 `OBSERVABILITY_PROVIDER` 不需要修改业务 handler 代码。

## 11. 参考资料（官方）

- AI SDK Telemetry: https://ai-sdk.dev/docs/ai-sdk-core/telemetry  
- AI SDK Langfuse 集成: https://ai-sdk.dev/providers/observability/langfuse  
- Next.js instrumentation 约定: https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation  
- Next.js instrumentation 指南: https://nextjs.org/docs/app/guides/instrumentation  
- Langfuse SDK / OTel（含 Next.js 说明）: https://langfuse.com/docs/observability/sdk/overview  
- Langfuse Observability Quickstart: https://langfuse.com/docs/observability/get-started

