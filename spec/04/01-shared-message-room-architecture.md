# 04 - 共享消息架构设计

## 1. 设计目标

在 `src/app/api/chat/route.ts` 现有入口之外，新增交流室专用后端链路，实现：

1. 所有角色读取同一共享消息上下文。
2. 共享上下文自动剔除 reasoning。
3. 严格串行轮转发言。
4. 支持持久化恢复（刷新后继续）。

## 2. 建议目录结构

```text
src/
  lib/
    room/
      types.ts
      constants.ts
      message-share-filter.ts
      turn-policy.ts
      playwright-policy.ts
      runtime/
        room-engine.ts
        room-context-builder.ts
        room-event-bus.ts
      storage/
        room-storage.ts
        room-message-storage.ts
        room-prompt-revision-storage.ts
  app/
    api/
      room/
        route.ts
        handler-room.ts
```

说明：

1. `lib/room/runtime` 只负责运行期状态机和生成流程。
2. `lib/room/storage` 只负责 IndexedDB/服务端存储读写。
3. `message-share-filter.ts` 单独隔离“非思考共享规则”，避免散落在 handler 与 UI。

## 3. 消息模型（共享池）

建议新增共享消息结构（逻辑模型）：

```ts
interface SharedMessage {
  id: string;
  roomId: string;
  turnNo: number;
  actorType: "user" | "character" | "playwright" | "system";
  actorId: string;
  actorName: string;
  visibleParts: Array<{ type: "text" | "tool-summary"; text: string }>;
  createdAt: string; // ISO
  metadata?: {
    sourceMessageId?: string;
    generationCycle?: number;
  };
}
```

关键点：

1. 共享池只保留 `visibleParts`，从源 UIMessage 过滤得到。
2. `actorId/actorName` 是 UI 聊天头像和名称的直接来源。
3. `turnNo` 提供严格时序和幂等恢复基础。

## 4. 非思考过滤策略

新增 `message-share-filter.ts`：

1. 输入：AI SDK 原始 `UIMessage` 或流 chunk 聚合结果。
2. 输出：`SharedMessage.visibleParts`。
3. 规则：
   1. `reasoning` part 直接丢弃。
   2. `text` part 保留。
   3. 工具 part 仅允许映射为可见摘要文本（例如“检索到 12 条结果”）。
4. 若过滤后为空，则不写入共享池（避免噪音消息）。

## 5. 请求与运行时流程

## 5.1 API 分流

建议新增交流室 API：

1. `POST /api/room`：驱动一轮串行对话（由当前轮角色发言）。
2. `POST /api/room/message`：用户向共享池追加消息。
3. `GET /api/room/:id/messages`：拉取共享消息。

这样不污染现有 `/api/chat` 行为，降低回归风险。

## 5.2 单轮执行（角色）

`handler-room.ts` 内流程：

1. 加载 room 状态、参与者、最近共享消息。
2. 根据 `turn-policy` 选中下一位角色。
3. 构建该角色系统提示词 + 共享上下文。
4. 调用 `streamText` 生成。
5. 生成结束后执行 `message-share-filter`。
6. 写入共享池并更新 room turn 状态。

## 5.3 并发控制

必须加“房间级互斥锁”：

1. 同一 `roomId` 同时仅允许一个生成任务。
2. 重复提交时返回 409 或排队。
3. 锁超时后自动释放（防止崩溃死锁）。

## 6. 上下文构建策略

新增 `room-context-builder.ts`：

1. 固定读取最近 N 条共享消息作为上下文窗口。
2. 按 `turnNo` 严格排序。
3. 消息格式统一为：`[角色名]: 内容`。
4. 若启用 token 预算，优先保留最近轮次与编剧修订节点。

## 7. 与现有模块复用建议

可复用：

1. `src/lib/chat/message-metadata.ts`（时延和 usage 元信息）
2. `src/hooks/use-agent-chat.ts` 的 transport 与 `onData` 习惯
3. UI 渲染组件：`src/components/ai-elements/message`、`conversation`

不建议直接复用：

1. `src/lib/agents/multi-stream.ts`（面向主从工具编排，不是共享会话轮转）
2. `SubAgentManager`（任务对象与房间角色对象语义不同）
