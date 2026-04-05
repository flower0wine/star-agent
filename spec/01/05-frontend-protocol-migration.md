# 05. 前端协议统一实施（用户定义 subagent）

## 1. 目标

前端按统一 subagent 元数据协议展示，不依赖固定工具名，实现不同用户自定义 subagent 的统一渲染。

## 2. 影响范围

- `src/components/chat/message-renderer.tsx`
- `src/lib/chat/sub-agent-history.ts`
- `src/hooks/use-sub-agent-messages.ts`
- `src/lib/agents/multi-stream.ts`

## 3. 实施方案

### 3.1 统一字段

消息中统一携带：

- `subAgent.profileId`
- `subAgent.templateId`
- `subAgent.profileVersion`
- `subAgent.displayName`（可选）

### 3.2 渲染策略

- 任意工具输出只要含 `subAgent` 元数据即走 subagent 卡片
- 卡片标题优先显示 profile/template 名称
- 展示变量摘要（脱敏后）

### 3.3 历史恢复

- 仅按统一元数据 + data-subagent 事件恢复
- 不依赖固定工具名或 taskId 前缀

### 3.4 开发环境数据重建

- 清理旧 subagent 历史
- 仅保留新协议历史数据

## 4. 验收标准

1. 用户自定义的不同 subagent 都能一致展示
2. 刷新后恢复不丢 profile/template 上下文
3. 代码中无固定 `tool-createSubAgent` 解析分支
