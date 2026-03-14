# REVIEW-006: Conversation UI 模块分析

**规范参考**: SPEC-006  
**完成度**: 0% ❌  
**状态**: 完全缺失

---

## 1. 规范要求回顾

### 1.1 功能要求

- [ ] Chat Panel 容器
- [ ] Chat Header (标题、模型选择、清除)
- [ ] Message List (消息列表)
- [ ] Chat Input (输入框)
- [ ] 流式响应显示
- [ ] 加载状态
- [ ] 空状态

### 1.2 技术要求

- [ ] 使用现有 ai-elements 组件
- [ ] 流式响应集成
- [ ] 键盘导航
- [ ] ARIA 属性

---

## 2. ❌ 缺失文件

根据 SPEC-006，应该存在以下文件：

| 文件 | 路径 | 状态 |
|------|------|------|
| Chat Panel | `src/components/chat/chat-panel.tsx` | ❌ |
| Chat Header | `src/components/chat/chat-header.tsx` | ❌ |
| Chat Input | `src/components/chat/chat-input.tsx` | ❌ |
| Message List | `src/components/chat/message-list.tsx` | ❌ |
| Message Item | `src/components/chat/message-item.tsx` | ❌ |
| Repo Card | `src/components/chat/repo-card.tsx` | ❌ |
| Chat Store | `src/stores/chat-store.ts` | ❌ |

---

## 3. 现有资源 (未使用)

### 3.1 ai-elements 组件库 ✅

项目已有丰富的组件但未被集成：

| 组件 | 路径 | 状态 |
|------|------|------|
| Conversation | `src/components/ai-elements/conversation.tsx` | ✅ 未集成 |
| ConversationContent | `src/components/ai-elements/conversation.tsx` | ✅ 未集成 |
| ConversationEmptyState | `src/components/ai-elements/conversation.tsx` | ✅ 未集成 |
| Message | `src/components/ai-elements/message.tsx` | ✅ 未集成 |
| MessageContent | `src/components/ai-elements/message.tsx` | ✅ 未集成 |
| MessageResponse | `src/components/ai-elements/message.tsx` | ✅ 未集成 |
| PromptInput | `src/components/ai-elements/prompt-input.tsx` | ✅ 未集成 |

### 3.2 Chat Store ⚠️

```typescript
// src/stores/conversation-store.ts
// 存在但不完整
// 缺失: sendMessage
// 缺失: stopGeneration
// 缺失: 流式响应状态
```

---

## 4. 应该的实现

### 4.1 Chat Panel 容器

```typescript
// src/components/chat/chat-panel.tsx (不存在)
interface ChatPanelProps {
  conversationId: string;
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
}

export function ChatPanel({ ... }: ChatPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <ChatHeader />
      <Conversation>
        <ConversationContent>
          <MessageList />
        </ConversationContent>
      </Conversation>
      <ChatInput />
    </div>
  );
}
```

### 4.2 需要集成的组件

```typescript
// 现有组件应该被使用
import { 
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  Message,
  MessageContent,
  MessageResponse,
  PromptInput,
} from "@/components/ai-elements";
```

---

## 5. 🔴 阻断性问题

### 5.1 主页面无 Chat 界面

```typescript
// src/app/page.tsx - 当前只有欢迎页
export default function Home() {
  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="flex h-full flex-col items-center justify-center">
        <h1>Welcome to Star Finder</h1>
        <p>Sign in with GitHub to get started</p>
      </div>
    </MainLayout>
  );
}
```

**问题**: 登录后仍显示欢迎页，未跳转到 Chat 界面

---

## 6. 与其他模块的依赖

| 依赖模块 | 依赖内容 | 状态 |
|----------|----------|------|
| SPEC-004 (AI Agent) | streamChat, chat | ❌ 未实现 |
| SPEC-005 (Layout) | MainLayout 集成 | ⚠️ 未完成 |
| SPEC-007 (Storage) | 消息持久化 | ⚠️ 部分实现 |

---

## 7. 总结

| 指标 | 评估 |
|------|------|
| 功能完整性 | 0% |
| 组件可用性 | 100% (未使用) |
| 集成度 | 0% |
| 总体评分 | ❌ 完全缺失 |

**结论**: Conversation UI 模块是项目中最大的缺口。虽然有丰富的 ai-elements 组件库，但完全没有集成到主应用中。这是 P0 级别的阻断性问题。

---

*相关文件: [SPEC-006](../spec/SPEC-006-Conversation-UI.md)*
