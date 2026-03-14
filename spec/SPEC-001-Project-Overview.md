# SPEC-001: Project Overview

## 1. Project Overview

### 1.1 Project Name

**Star Finder** - GitHub Star Repository Q&A Assistant

### 1.2 Project Goal

Build an AI-powered web application that helps users find relevant GitHub repositories from their starred收藏. Users can ask questions in natural language to discover repositories that match their needs.

### 1.3 Core Value Proposition

- **Personalized Discovery**: Leverage user's own star收藏 to find relevant repositories
- **Progressive Disclosure**: Avoid overwhelming AI with full READMEs; provide summary info first, fetch details on demand
- **Natural Language Interface**: Users can describe what they need in plain English
- **Privacy-First**: All data stays in browser (localStorage); no backend database required

---

## 2. Technical Stack

### 2.1 Core Technologies

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | 16.1.6 |
| UI Library | React | 19.2.3 |
| Language | TypeScript | 5.x (strict mode) |
| Styling | Tailwind CSS | 4.x |
| Component Library | shadcn/ui | 4.x |
| AI Framework | Mastra | 1.x |
| AI SDK | @mastra/ai-sdk | 1.x |
| AI Models | OpenRouter | - |
| Package Manager | Bun | - |

### 2.2 Key Dependencies

```json
{
  "@mastra/core": "^1.12.0",
  "@mastra/ai-sdk": "^1.1.3",
  "@mastra/memory": "^1.7.0",
  "ai": "^6.0.116",
  "@ai-sdk/react": "^3.0.118",
  "next": "16.1.6",
  "react": "19.2.3",
  "tailwindcss": "^4",
  "lucide-react": "^0.577.0",
  "dayjs": "^1.x"
}
```

### 2.3 External Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| GitHub OAuth | User authentication | Via GitHub App credentials |
| GitHub API | Fetch starred repositories | OAuth token from auth |
| OpenRouter | AI model inference | API key in environment |

---

## 3. Architecture Overview

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Sidebar    │  │ AI Chat Panel│  │    Settings Panel    │ │
│  │  Component   │  │  Component   │  │      Component       │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    UI Store (Zustand)                     │  │
│  │  - Auth state    - Conversation state    - Settings      │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  GitHub Auth   │  │  GitHub API    │  │ Storage Layer  │  │
│  │    Service     │  │    Service     │  │ (localStorage) │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Mastra AI Agent                        │  │
│  │  - Instructions    - Tools    - Memory                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Module Responsibilities

| Module | Responsibility | Public API |
|--------|---------------|------------|
| GitHub Auth | OAuth flow, token management | `login()`, `logout()`, `getToken()`, `isAuthenticated()` |
| GitHub API | Fetch starred repos, readme | `getStarredRepos()`, `getRepoDetails()`, `getReadme()` |
| Storage Layer | Persistence abstraction | `saveSession()`, `loadSessions()`, `saveSettings()`, `loadSettings()` |
| AI Agent | Q&A with repo context | `chat()`, `streamChat()`, `createThread()` |
| UI Components | Layout and interaction | React components |

### 3.3 Data Flow

1. **Initial Load**: Check localStorage for existing auth token
2. **Authentication**: If no token, redirect to GitHub OAuth
3. **Data Fetch**: Fetch user's starred repos via GitHub API
4. **Indexing**: Extract basic info (name, description, topics) for each repo
5. **Chat**: User asks question → Agent analyzes repo summaries → Fetches README if needed
6. **Persistence**: Save conversations and settings to localStorage

---

## 4. UI/UX Specification

### 4.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                              Header                             │
├────────────────┬────────────────────────────────────────────────┤
│                │                                                │
│   Sidebar      │            Main Content Area                  │
│   (Collapsible)│                                                │
│                │   ┌────────────────────────────────────────┐   │
│  ┌──────────┐  │   │         Conversation Header           │   │
│  │ New Chat │  │   ├────────────────────────────────────────┤   │
│  ├──────────┤  │   │                                        │   │
│  │ History  │  │   │         AI Message Area               │   │
│  │  List    │  │   │         (Scrollable)                   │   │
│  │          │  │   │                                        │   │
│  ├──────────┤  │   ├────────────────────────────────────────┤   │
│  │ Settings │  │   │         User Input Area               │   │
│  │  Theme   │  │   │         (PromptInput)                 │   │
│  │  About   │  │   └────────────────────────────────────────┘   │
│  └──────────┘  │                                                │
└────────────────┴────────────────────────────────────────────────┘
```

### 4.2 Sidebar Specifications

**Dimensions**:
- Expanded: 280px width
- Collapsed: 64px width
- Transition: 300ms ease-in-out

**Sections**:
1. **Top Section** (Conversation Management)
   - New Chat button
   - Conversation history list (scrollable)
   - Each item: title, timestamp, delete action

2. **Bottom Section** (Settings & Info)
   - Settings menu
   - Theme toggle (light/dark)
   - About section
   - Collapse toggle

**Collapsed State**:
- Show only icons
- Tooltip on hover
- Smooth expand/collapse animation

### 4.3 Main Chat Area Specifications

**Layout**:
- Full remaining width
- Max-width: 900px (centered)
- Min-height: 100vh

**Components**:
1. **Header**: Current conversation title, model selector
2. **Message Area**: Scrollable, auto-scroll to bottom
3. **Input Area**: PromptInput component with file attachments disabled

### 4.4 Design Principles

1. **Minimalism**: Generous whitespace, clean typography
2. **Animation**: Smooth transitions (300ms default)
3. **Accessibility**: ARIA labels, keyboard navigation, focus states
4. **Responsiveness**: Mobile-first, adapt to viewport changes

---

## 5. File Structure

### 5.1 Proposed Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home page
│   └── globals.css             # Global styles
│
├── components/
│   ├── layout/
│   │   ├── sidebar/
│   │   │   ├── sidebar.tsx    # Main sidebar component
│   │   │   ├── sidebar-header.tsx
│   │   │   ├── sidebar-conversations.tsx
│   │   │   ├── sidebar-settings.tsx
│   │   │   └── sidebar-item.tsx
│   │   ├── header.tsx          # App header
│   │   └── main-layout.tsx    # Layout wrapper
│   │
│   ├── chat/
│   │   ├── chat-panel.tsx      # Main chat container
│   │   ├── chat-header.tsx
│   │   ├── message-list.tsx
│   │   └── chat-input.tsx
│   │
│   ├── auth/
│   │   └── login-button.tsx    # GitHub login button
│   │
│   └── ui/                     # shadcn/ui components (existing)
│
├── lib/
│   ├── services/
│   │   ├── github-auth.ts      # GitHub OAuth service
│   │   ├── github-api.ts       # GitHub API service
│   │   └── openrouter.ts       # OpenRouter configuration
│   │
│   ├── storage/
│   │   ├── storage.ts          # Storage abstraction
│   │   ├── session-storage.ts  # Conversation persistence
│   │   └── settings-storage.ts # User settings
│   │
│   ├── agent/
│   │   ├── agent.ts            # Mastra agent setup
│   │   ├── instructions.ts     # Agent system prompt
│   │   └── tools.ts            # Agent tools
│   │
│   ├── hooks/
│   │   ├── use-auth.ts         # Auth state hook
│   │   ├── use-chat.ts         # Chat interaction hook
│   │   ├── use-storage.ts      # Storage hook
│   │   └── use-theme.ts        # Theme hook
│   │
│   └── utils/
│       ├── cn.ts               # Class name utility
│       └── date.ts             # Date formatting (dayjs)
│
├── mastra/
│   ├── agents/
│   │   └── star-agent.ts       # Repository Q&A agent
│   ├── tools/
│   │   ├── repo-tools.ts       # GitHub repo tools
│   │   └── search-tools.ts     # Search tools
│   └── index.ts               # Mastra instance
│
├── stores/
│   ├── auth-store.ts           # Auth state (Zustand)
│   ├── chat-store.ts           # Chat state
│   └── settings-store.ts       # Settings state
│
└── types/
    ├── github.ts               # GitHub API types
    ├── conversation.ts         # Conversation types
    └── settings.ts             # Settings types
```

### 5.2 Key Naming Conventions

| Category | Convention | Example |
|----------|------------|---------|
| Components | PascalCase | `Sidebar`, `ChatPanel` |
| Files (components) | kebab-case | `sidebar.tsx`, `chat-panel.tsx` |
| Functions | camelCase | `getStarredRepos`, `saveSession` |
| Types/Interfaces | PascalCase | `GitHubRepo`, `Conversation` |
| Directories | kebab-case | `github-auth`, `session-storage` |

---

## 6. Configuration Requirements

### 6.1 Environment Variables

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=Star Finder

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6.2 GitHub OAuth Scopes

Required scopes for the application:
- `read:user` - Read user profile
- `user:email` - Read user email
- `read:org` - Read organization membership (if needed)
- No `repo` scope needed (public stars only)

### 6.3 GitHub App Configuration

1. Create GitHub OAuth App in Developer Settings
2. Set Authorization callback URL to `/api/auth/callback`
3. Enable "Device Flow" if supporting mobile (optional)

---

## 7. Acceptance Criteria

### 7.1 Authentication

- [ ] User can sign in with GitHub OAuth
- [ ] User can sign out
- [ ] Auth state persists across page reloads
- [ ] Login state is clearly indicated in UI

### 7.2 Data Fetching

- [ ] User's starred repositories are fetched on login
- [ ] Repository data includes: name, description, topics, stars, language
- [ ] Fetching large star lists handles pagination
- [ ] Loading states are shown during fetch

### 7.3 AI Chat

- [ ] User can send messages to AI
- [ ] AI responds with relevant repository suggestions
- [ ] Progressive disclosure works: summary first, README on demand
- [ ] Streaming responses are displayed smoothly

### 7.4 UI/UX

- [ ] Sidebar can be collapsed/expanded
- [ ] Theme toggle works (light/dark)
- [ ] Conversations are saved to localStorage
- [ ] Smooth animations on interactions
- [ ] Responsive layout works on different screen sizes

### 7.5 Code Quality

- [ ] TypeScript strict mode passes
- [ ] ESLint passes with auto-fix
- [ ] Components follow single responsibility principle
- [ ] No `as any` or `@ts-ignore` used

---

## 8. Constraints & Guidelines

### 8.1 Development Guidelines

1. **Component Reuse**: Always use existing `src/components/ai-elements/*` components before creating new ones
2. **Shadcn Components**: Use shadcn CLI to install new UI components
3. **No Custom Colors**: Use CSS variables from shadcn theme
4. **Animation**: Use `motion` library or CSS transitions for animations
5. **Date Handling**: Use `dayjs` for all date operations

### 8.2 Performance Considerations

1. **Progressive Loading**: Load repo list incrementally
2. **Caching**: Cache frequently accessed README content
3. **Lazy Loading**: Lazy load non-critical components
4. **Bundle Size**: Monitor bundle size, code split where needed

### 8.3 Security Considerations

1. **Token Storage**: Store tokens in localStorage (acceptable for this use case)
2. **XSS Prevention**: Sanitize user inputs
3. **API Rate Limits**: Handle GitHub API rate limits gracefully

---

## 9. Future Extensibility

### 9.1 Planned Features (Out of Scope)

- Database backend (PostgreSQL, etc.)
- User accounts beyond GitHub OAuth
- Repository ranking based on activity
- Sharing conversations
- Export to markdown/PDF

### 9.2 Architecture for Extensibility

The storage layer is designed to be swappable:

```typescript
// Current: localStorage implementation
class LocalStorageRepository implements Repository {
  async save(key: string, data: any): Promise<void>
  async load(key: string): Promise<any>
}

// Future: Database implementation
class DatabaseRepository implements Repository {
  async save(key: string, data: any): Promise<void>
  async load(key: string): Promise<any>
}
```

---

## 10. References

- [Mastra Documentation](https://mastra.ai)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS v4](https://tailwindcss.com)
