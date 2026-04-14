# 04 - UI、设置与存储模型方案

## 1. UI 目标

交流室 UI 需要同时满足三个视角：

1. 剧场视角：多角色聊天流（主区域）。
2. 控制台视角：编剧与角色提示词面板（右侧或抽屉）。
3. 运行态视角：当前轮到谁、距离编剧介入还剩多少轮。

## 2. 页面结构建议

建议新增页面：`src/app/room/[roomId]/page.tsx`

布局建议（桌面）：

1. 左侧：共享聊天消息流。
2. 右侧上半：世界观与编剧提示词（可编辑）。
3. 右侧下半：角色列表 + 每个角色提示词（可编辑、可折叠）。

移动端：右侧面板改为 `Sheet`。

## 3. 组件拆分建议

```text
src/components/room/
  room-chat-view.tsx
  room-chat-message-list.tsx
  room-chat-message-item.tsx
  room-status-bar.tsx
  room-director-panel.tsx
  room-character-panel.tsx
  room-prompt-editor.tsx
  room-turn-timeline.tsx
```

职责约束：

1. `room-chat-*` 只处理消息渲染。
2. `room-director-panel` 只处理编剧相关 prompt 与周期信息。
3. `room-character-panel` 只处理角色配置与提示词列表。
4. `room-prompt-editor` 复用 `TemplateEditor` 风格能力，避免多处编辑器实现。

## 4. 视觉与主题约束落实

遵循你给出的约束：

1. 不写固定色值，统一使用 shadcn token：`bg-background`、`text-foreground`、`border-border`、`bg-muted` 等。
2. 如果确需强调色，先在 `globals.css` 定义 CSS 变量，再在 Tailwind 类中引用。
3. 编剧“掌控感”建议通过布局层级和信息密度实现，不依赖硬编码颜色。

## 5. 提示词配置模型

当前 `agent-config` 是按单 agentId 存储，无法覆盖“一个房间多个角色”。
建议新增房间配置模型：

```ts
interface RoomConfig {
  roomId: string;
  name: string;
  playwright: {
    id: string;
    name: string;
    systemPromptTemplate: string;
  };
  world: {
    worldPromptTemplate: string;
  };
  characters: Array<{
    id: string;
    name: string;
    systemPromptTemplate: string;
    order: number;
    enabled: boolean;
  }>;
  updatedAt: number;
}
```

说明：

1. 角色提示词和编剧提示词作为房间配置保存，而不是复用 `agentId = subagent` 的 `customParams`。
2. 编剧每次修订后写入 `promptRevision` 记录，便于回看。

## 6. 聊天消息展示协议

消息项建议直接携带角色名：

```ts
interface RoomChatMessageVM {
  id: string;
  role: "user" | "assistant";
  speakerType: "character" | "playwright" | "user";
  speakerId: string;
  speakerName: string;
  text: string;
  createdAt: string;
}
```

渲染规则：

1. 角色消息：显示 `speakerName`。
2. 编剧消息：显示“编剧 / Playwright”标签。
3. 可选：编剧修订完成时插入系统事件卡片（非对话气泡）。

## 7. 与现有设置页衔接

`src/components/app/settings/agent-settings.tsx` 建议做最小侵入调整：

1. 保留现有 star/master/patent 设置不变。
2. 新增“Room Templates”入口（独立 section）。
3. 该入口可管理默认编剧模板、默认角色模板。

交流室实例级 prompt 编辑仍放在 `room/[roomId]` 页，不放入全局 settings。

## 8. 数据库存储建议

当前 IndexedDB `DB_VERSION = 2`，建议升级至 `3` 并新增表：

1. `rooms`
2. `roomConfigs`
3. `roomMessages`
4. `roomPromptRevisions`
5. `roomTurnStates`

因为当前处于开发阶段，不需要兼容旧结构，允许直接升级 schema。
