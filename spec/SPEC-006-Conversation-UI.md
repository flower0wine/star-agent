# SPEC-006: Conversation UI Module

## 1. Module Overview

### 1.1 Purpose

Implement the chat/conversation UI for interacting with the AI agent. This module focuses on leveraging existing components from `src/components/ai-elements/` to create a polished chat experience.

### 1.2 Scope

This module handles:
- Chat panel container
- Message display (user and AI)
- User input with PromptInput
- Streaming response display
- Loading states
- Empty states

This module does NOT handle:
- Layout structure (see SPEC-005)
- Authentication (see SPEC-002)
- AI agent logic (see SPEC-004)
- Data storage (see SPEC-007)

---

## 2. Architecture

### 2.1 Component Hierarchy

```
ChatPanel (Main Container)
├── ChatHeader
│   ├── Conversation Title
│   ├── Model Selector
│   └── Actions (Clear, Download)
│
├── MessageList (Scrollable)
│   ├── Message (User)
│   │   ├── MessageContent
│   │   └── MessageActions
│   │
│   └── Message (Assistant)
│       ├── MessageContent
│       │   ├── MessageResponse (Streaming text)
│       │   └── [Optional] Tool Calls Display
│       └── MessageActions
│
├── ChatInput
│   └── PromptInput
│       ├── PromptInputTextarea
│       └── PromptInputSubmit
│
└── [Optional] ScrollToBottomButton
```

### 2.2 Existing Components to Use

From `src/components/ai-elements/`:

| Component | Purpose |
|-----------|---------|
| `Conversation` | Scrollable container |
| `ConversationContent` | Message list wrapper |
| `ConversationEmptyState` | Empty state display |
| `ConversationScrollButton` | Scroll to bottom |
| `Message` | Message wrapper |
| `MessageContent` | Message bubble |
| `MessageResponse` | Streaming response display |
| `MessageActions` | Action buttons |
| `MessageToolbar` | Toolbar below message |
| `PromptInput` | Full input component |
| `PromptInputTextarea` | Text input |
| `PromptInputSubmit` | Submit button |
| `PromptInputProvider` | State provider |
| `Agent` | Agent info display |

---

## 3. Component Specifications

### 3.1 Chat Panel Container

```typescript
// src/components/chat/chat-panel.tsx

interface ChatPanelProps {
  // Current conversation
  conversationId: string;
  
  // Callbacks
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
  onClearChat: () => void;
}

export function ChatPanel({ 
  conversationId, 
  onSendMessage, 
  onStopGeneration,
  onClearChat 
}: ChatPanelProps) {
  // Use existing Conversation component
  return (
    <div className="flex h-full flex-col">
      <ChatHeader 
        conversationId={conversationId}
        onClearChat={onClearChat}
      />
      
      <Conversation className="flex-1">
        <ConversationContent>
          <MessageList conversationId={conversationId} />
        </ConversationContent>
        
        <ConversationScrollButton />
      </Conversation>
      
      <ChatInput 
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
      />
    </div>
  );
}
```

### 3.2 Chat Header

```typescript
// src/components/chat/chat-header.tsx

interface ChatHeaderProps {
  conversationId: string;
  onClearChat: () => void;
  onDownload?: () => void;
}

export function ChatHeader({ 
  conversationId, 
  onClearChat,
  onDownload 
}: ChatHeaderProps) {
  // Use existing components
  // - Button from ui/button.tsx
  // - Select from ui/select.tsx
  
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Conversation Title */}
        <h1 className="text-lg font-semibold">
          {getConversationTitle(conversationId)}
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Model Selector */}
        <ModelSelector />
        
        {/* Actions */}
        <Button 
          variant="ghost" 
          size="icon-sm"
          onClick={onClearChat}
          title="Clear chat"
        >
          <TrashIcon className="size-4" />
        </Button>
        
        {onDownload && (
          <Button 
            variant="ghost" 
            size="icon-sm"
            onClick={onDownload}
            title="Download"
          >
            <DownloadIcon className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
```

### 3.3 Message List

```typescript
// src/components/chat/message-list.tsx

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { messages, isLoading } = useChatMessages(conversationId);
  
  // Use existing ConversationEmptyState when no messages
  if (messages.length === 0 && !isLoading) {
    return (
      <ConversationEmptyState
        title="Welcome to Star Finder"
        description="Ask me about your starred repositories"
        icon={<SparklesIcon className="size-10" />}
      />
    );
  }
  
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <Message
          key={message.id}
          from={message.role}
        >
          <MessageContent>
            {message.role === "assistant" ? (
              <MessageResponse>
                {message.content}
              </MessageResponse>
            ) : (
              <p>{message.content}</p>
            )}
          </MessageContent>
          
          {message.role === "assistant" && (
            <MessageToolbar>
              <MessageActions>
                <MessageAction 
                  tooltip="Copy"
                  onClick={() => copyToClipboard(message.content)}
                >
                  <CopyIcon className="size-4" />
                </MessageAction>
              </MessageActions>
            </MessageToolbar>
          )}
        </Message>
      ))}
    </div>
  );
}
```

### 3.4 Chat Input

```typescript
// src/components/chat/chat-input.tsx

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopGeneration: () => void;
}

export function ChatInput({ 
  onSendMessage, 
  onStopGeneration 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const isGenerating = useChatStore((s) => s.isGenerating);
  
  const handleSubmit = useCallback((msg: string) => {
    if (!msg.trim() || isGenerating) return;
    onSendMessage(msg);
    setMessage("");
  }, [onSendMessage, isGenerating]);
  
  // Use existing PromptInput components
  return (
    <PromptInputProvider>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(message);
        }}
        className="border-t p-4"
      >
        <PromptInputBody>
          <PromptInputTextarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your repositories..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(message);
              }
            }}
            disabled={isGenerating}
          />
          
          <PromptInputSubmit
            status={isGenerating ? "streaming" : undefined}
            onStop={isGenerating ? onStopGeneration : undefined}
            disabled={!message.trim()}
          >
            {isGenerating ? (
              <StopIcon className="size-4" />
            ) : (
              <SendIcon className="size-4" />
            )}
          </PromptInputSubmit>
        </PromptInputBody>
      </form>
    </PromptInputProvider>
  );
}
```

---

## 4. Streaming Response

### 4.1 Implementation

```typescript
// Using MessageResponse for streaming

export function StreamingMessage({ 
  content, 
  isStreaming 
}: { 
  content: string; 
  isStreaming: boolean;
}) {
  return (
    <MessageContent>
      <MessageResponse 
        isAnimating={isStreaming}
      >
        {content}
      </MessageResponse>
    </MessageContent>
  );
}
```

### 4.2 Loading States

```typescript
// Different loading states

// While waiting for first response
<MessageResponse isLoading={isLoading && messages.length === 0}>
  <LoadingDots />
</MessageResponse>

// While streaming
<MessageResponse isAnimating={isStreaming}>
  {content}
</MessageResponse>
```

---

## 5. State Management

### 5.1 Chat Store

```typescript
// src/stores/chat-store.ts

interface ChatStore {
  // Current conversation
  currentConversationId: string | null;
  messages: ChatMessage[];
  
  // UI State
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  loadConversation: (id: string) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
```

---

## 6. Special UI Patterns

### 6.1 Repository Cards

When AI recommends repositories, display them as cards:

```typescript
// Display repository recommendation as card
function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle>{repo.full_name}</CardTitle>
        <CardDescription>{repo.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {repo.topics.slice(0, 3).map(topic => (
            <Badge key={topic} variant="secondary">{topic}</Badge>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{repo.stargazers_count} stars</span>
          <span>{repo.language}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <a href={repo.html_url} target="_blank" rel="noopener">
            View on GitHub
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### 6.2 Tool Call Display

When agent uses tools, show in message:

```typescript
// Display tool calls being executed
function ToolCallIndicator({ toolName }: { toolName: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner size="sm" />
      <span>Searching repositories...</span>
    </div>
  );
}
```

---

## 7. Accessibility

### 7.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` | Send message (in input) |
| `Shift + Enter` | New line |
| `Escape` | Stop generation |
| `Cmd/Ctrl + K` | Focus input |

### 7.2 ARIA Labels

```tsx
// Input area
<PromptInputTextarea 
  aria-label="Chat message input"
  aria-describedby="input-hint"
/>

// Send button
<PromptInputSubmit aria-label="Send message" />

// Stop button
<PromptInputSubmit aria-label="Stop generation" />
```

---

## 8. Animation

### 8.1 Message Animations

```css
/* New message fade-in */
@keyframes message-appear {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-enter {
  animation: message-appear 200ms ease-out;
}

/* Streaming cursor blink */
@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.streaming-cursor {
  animation: cursor-blink 1s infinite;
}
```

### 8.2 Using Motion Library

```typescript
import { motion, AnimatePresence } from "motion/react";

<AnimatePresence>
  {messages.map((message) => (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Message ... />
    </motion.div>
  ))}
</AnimatePresence>
```

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

- [ ] User can type and send messages
- [ ] AI responses stream in real-time
- [ ] User can stop generation mid-stream
- [ ] Chat can be cleared
- [ ] Conversation history displayed correctly
- [ ] Empty state shown for new chats
- [ ] Loading states displayed appropriately

### 9.2 UI Requirements

- [ ] Uses existing ai-elements components
- [ ] Smooth streaming animations
- [ ] Proper message alignment (user right, AI left)
- [ ] Repository cards render correctly
- [ ] Input auto-grows with content
- [ ] Scroll to bottom works

### 9.3 Accessibility Requirements

- [ ] Keyboard navigation works
- [ ] Screen reader announces messages
- [ ] Focus management correct
- [ ] ARIA labels present

---

## 10. File Checklist

```
src/
├── components/
│   └── chat/
│       ├── chat-panel.tsx           # Main container
│       ├── chat-header.tsx          # Header with title/actions
│       ├── chat-input.tsx           # Input area
│       ├── message-list.tsx         # Messages display
│       ├── message-item.tsx         # Single message
│       ├── repo-card.tsx             # Repository card
│       └── loading-state.tsx         # Loading indicators
│
├── hooks/
│   └── use-chat.ts                   # Chat logic hook
│
├── stores/
│   └── chat-store.ts                 # Zustand chat store
│
└── app/
    └── chat/
        └── [id]/
            └── page.tsx              # Chat page route
```

---

## 11. Dependencies

### 11.1 Existing Components to Use

All from `src/components/ai-elements/`:
- `Conversation`, `ConversationContent`, `ConversationEmptyState`, `ConversationScrollButton`
- `Message`, `MessageContent`, `MessageResponse`, `MessageActions`, `MessageToolbar`
- `PromptInput`, `PromptInputTextarea`, `PromptInputSubmit`, `PromptInputProvider`

From `src/components/ui/`:
- `button.tsx`
- `card.tsx`
- `badge.tsx`
- `spinner.tsx`
- `scroll-area.tsx`

### 11.2 Icons

From `lucide-react`:
- `SendIcon` - Send message
- `StopIcon` - Stop generation
- `TrashIcon` - Clear chat
- `DownloadIcon` - Download
- `CopyIcon` - Copy message
- `SparklesIcon` - Empty state
