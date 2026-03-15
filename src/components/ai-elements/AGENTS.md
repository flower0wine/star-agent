# AI Elements Components

This directory contains UI components for rendering AI-generated content in chat interfaces. These components are designed to work with the Vercel AI SDK and Mastra AI framework.

---

## Component Categories

### Message & Chat Components

| Component | Purpose |
|-----------|---------|
| **message/** | Chat message container with support for branches, content, toolbar, and actions |
| **conversation/** | Multi-turn conversation display wrapper |
| **transcription/** | Real-time audio transcription display with seekable segments |

### AI Reasoning Display

| Component | Purpose |
|-----------|---------|
| **reasoning/** | AI "thinking" display with streaming support and duration tracking |
| **chain-of-thought/** | Step-by-step reasoning visualization with status indicators |

### Code & Technical Display

| Component | Purpose |
|-----------|---------|
| **code-block/** | Syntax-highlighted code with language selector and copy functionality |
| **terminal/** | Terminal/console output with header, status, and action buttons |
| **stack-trace/** | Error stack trace display |
| **snippet/** | Inline code snippet rendering |

### Tool & Action Components

| Component | Purpose |
|-----------|---------|
| **tool/** | AI tool/function invocation display with state management |
| **toolbar/** | Action toolbar for messages |
| **task/** | Task display with status tracking |
| **checkpoint/** | Progress checkpoint visualization |

### Data Display Components

| Component | Purpose |
|-----------|---------|
| **test-results/** | Test suite and test case results with pass/fail status |
| **commit/** | Git commit information display (hash, author, files, changes) |
| **schema-display/** | JSON schema visualization |
| **sources/** | Reference sources/citations display |
| **queue/** | Queue/pending items display |

### Media Components

| Component | Purpose |
|-----------|---------|
| **image/** | AI-generated image display |
| **audio-player/** | Audio playback controls |
| **web-preview/** | Embedded web page preview with navigation |
| **jsx-preview/** | Live React JSX rendering preview |

### User Input Components

| Component | Purpose |
|-----------|---------|
| **prompt-input/** | Chat input with streaming support |
| **speech-input/** | Voice/speech input for chat |
| **voice-selector/** | TTS voice selection UI |
| **mic-selector/** | Microphone selection for speech input |

### Canvas & Visualization

| Component | Purpose |
|-----------|---------|
| **canvas/** | React Flow canvas integration |
| **node/** | Canvas node component |
| **edge/** | Canvas edge/connection component |
| **connection/** | Connection visualization |

### UI Utility Components

| Component | Purpose |
|-----------|---------|
| **artifact/** | Generic container for AI-generated content |
| **agent/** | AI agent display wrapper |
| **plan/** | AI planning display |
| **sandbox/** | Isolated execution environment display |
| **shimmer/** | Loading animation effect |
| **suggestion/** | AI-generated suggestions display |
| **package-info/** | npm package information display |
| **model-selector/** | AI model selection UI |
| **confirmation/** | User confirmation dialog |
| **panel/** | Reusable panel container |
| **context/** | Global context provider |
| **controls/** | Player/media controls |

### File & Reference Components

| Component | Purpose |
|-----------|---------|
| **file-tree/** | Directory/file tree visualization |
| **attachments/** | File attachment display |
| **inline-citation/** | Inline citation/source reference |

### Environment & Config

| Component | Purpose |
|-----------|---------|
| **environment-variables/** | Environment variable display |
| **persona/** | AI persona/character display |
| **open-in-chat/** | External content integration |

---

## Import Pattern

```tsx
import { Message } from "@/components/ai-elements/message";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { Terminal } from "@/components/ai-elements/terminal";
import { Tool } from "@/components/ai-elements/tool";
```

---

## Component Patterns

These components follow the shadcn/ui pattern:
- Use `cva` for variant props
- Use `cn()` utility for class merging
- Export both component and type definitions
- Support `className` prop for customization
- Use `data-slot` pattern for polymorphic components

---

## Dependencies

Most components depend on:
- `@/components/ui/*` - Base shadcn/ui components
- `@/lib/utils` - Utility functions (cn, etc.)
- `ai` - Vercel AI SDK types
- `lucide-react` - Icons
- `@radix-ui/react-use-controllable-state` - Controllable state management

---

## Notes

- These components are designed for AI chat interfaces
- Most components support streaming (real-time updates during AI generation)
- Many components use Context API for state management
- Components are typed with TypeScript for better developer experience
