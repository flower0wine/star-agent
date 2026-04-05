# 02. SubAgent 执行器动态组装实施

## 1. 目标

移除执行器中的 Star 硬编码，实现按 profile 动态拼装 tools、system prompt、task prompt、timeout。

## 2. 影响范围

- `src/lib/agents/sub-agent/executor.ts`
- `src/lib/agents/sub-agent/manager.ts`
- `src/lib/agents/sub-agent/types.ts`
- `src/lib/agents/tool-registry.ts`

## 3. 实施方案

### 3.1 执行输入重构

`executeSubAgentTask(task, ...)` 依赖字段从“repos + task 文本”改为：

- `profileId`
- `templateId`
- `templateVars`
- `payloadRef`
- `profileVersion`

### 3.2 工具动态装配

新增装配器（建议 `src/lib/agents/sub-agent/tool-factory.ts`）：

- 入参：`profile.toolIds + runtime payload`
- 逻辑：从已注册工具构造可执行 tools map
- 规则：仅白名单，不继承父 agent 全工具

### 3.3 提示词动态装配

新增模板渲染器（建议 `src/lib/agents/sub-agent/prompt-renderer.ts`）：

- 渲染 `systemPromptTemplate`
- 渲染 `instructionTemplate`
- 替换变量后做未解析占位符检查

### 3.4 运行限制应用

在 executor 内按 profile limits 设置：

- `timeout`
- 输入规模校验（如 repo 数量）
- 并发限制交由 manager 队列控制

### 3.5 结果元数据

完成事件必须透传：

- `profileId`
- `templateId`
- `profileVersion`
- `originTool`

## 4. 风险与对策

1. 动态工具依赖上下文缺失：tool factory 增加 required payload 检查
2. 模板渲染残留变量：渲染后严格检查 `{{...}}`
3. 并发飙升：manager 增加按 profile 的并发令牌

## 5. 验收标准

1. executor 不再 import Star 专属工具实现
2. 仅配置中的 `toolIds` 会被实际执行
3. 未通过 profile/template 校验的任务会立即失败且返回原因
4. progress/complete 事件附带 profile 元信息
