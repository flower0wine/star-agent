# GitHub Star Repository AI Agent - 项目概览

## 项目目标

构建一个智能 Web 应用，帮助用户通过 AI 对话快速发现和理解他们 Star 的 GitHub 仓库。用户可以通过自然语言提问，AI Agent 会逐步分析仓库信息，最终帮助用户找到最符合需求的仓库。

## 核心价值主张

- **智能发现**：通过 AI 对话而非手动浏览，快速找到需要的仓库
- **渐进式披露**：避免一次性加载所有 README，通过智能问询逐步获取信息
- **个性化体验**：支持多轮对话，AI 记忆用户偏好和需求
- **灵活配置**：用户可选择任意 Mastra 支持的 AI 模型

## 项目范围

### 功能范围

1. **GitHub OAuth 认证**
   - 用户通过 OAuth 登录
   - 获取用户的所有 Star 仓库列表

2. **AI 对话系统**
   - 基于 Mastra Agent 的智能问答
   - 支持多轮对话和上下文记忆
   - 渐进式信息获取（先基础信息，后详细 README）

3. **用户界面**
   - 左侧侧边栏：会话管理、设置、主题切换
   - 右侧交互面板：对话界面、AI 回复展示
   - 响应式设计，支持移动端

4. **数据持久化**
   - 会话记录存储在 localStorage
   - 用户设置存储在 localStorage
   - 架构支持未来数据库迁移

### 技术栈

- **框架**：Next.js 16.1.6 + React 19.2.3
- **语言**：TypeScript (strict mode)
- **样式**：Tailwind CSS v4 + shadcn/ui
- **AI**：Mastra 1.3.9
- **状态管理**：Zustand
- **日期处理**：dayjs
- **包管理**：bun

### 非功能需求

- **性能**：页面加载 < 2s，对话响应流畅
- **可访问性**：WCAG 2.1 AA 标准
- **设计**：简洁优雅，大量留白，丝滑动画
- **可维护性**：模块化架构，单一职责原则

## 项目架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App Router                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │   Sidebar        │              │  Chat Panel      │     │
│  │  (Left)          │              │  (Right)         │     │
│  │                  │              │                  │     │
│  │ - Sessions       │              │ - Conversation   │     │
│  │ - Settings       │              │ - Input          │     │
│  │ - Theme          │              │ - AI Response    │     │
│  └──────────────────┘              └──────────────────┘     │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    State Management (Zustand)                │
│  - Session Store                                             │
│  - Settings Store                                            │
│  - GitHub Data Store                                         │
├─────────────────────────────────────────────────────────────┤
│                    Services Layer                            │
│  - GitHub API Service                                        │
│  - Storage Service (localStorage adapter)                    │
│  - AI Agent Service                                          │
├─────────────────────────────────────────────────────────────┤
│                    Mastra AI Layer                           │
│  - Repository Agent                                          │
│  - Tools (GitHub API, Repository Analysis)                  │
│  - Memory Management                                         │
├─────────────────────────────────────────────────────────────┤
│                    External Services                         │
│  - GitHub OAuth                                              │
│  - GitHub REST API                                           │
│  - AI Model Providers (OpenAI, Claude, etc.)                │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
src/
├── app/
│   ├── page.tsx                    # 主页面
│   ├── layout.tsx                  # 根布局
│   ├── globals.css                 # 全局样式
│   └── api/
│       └── auth/
│           └── [...nextauth].ts    # OAuth 认证端点
│
├── components/
│   ├── ui/                         # shadcn 基础组件
│   ├── ai-elements/                # AI 交互组件
│   ├── layout/
│   │   ├── sidebar.tsx             # 侧边栏
│   │   ├── chat-panel.tsx          # 聊天面板
│   │   └── main-layout.tsx         # 主布局容器
│   ├── sidebar/
│   │   ├── session-list.tsx        # 会话列表
│   │   ├── settings-menu.tsx       # 设置菜单
│   │   └── theme-toggle.tsx        # 主题切换
│   └── chat/
│       ├── message-list.tsx        # 消息列表
│       ├── input-area.tsx          # 输入区域
│       ├── repository-card.tsx     # 仓库卡片
│       └── ai-response.tsx         # AI 回复展示
│
├── lib/
│   ├── utils.ts                    # 工具函数
│   ├── storage.ts                  # localStorage 适配器
│   └── constants.ts                # 常量定义
│
├── hooks/
│   ├── use-session.ts              # 会话管理 hook
│   ├── use-settings.ts             # 设置管理 hook
│   ├── use-github.ts               # GitHub 数据 hook
│   └── use-chat.ts                 # 聊天逻辑 hook
│
├── stores/
│   ├── session-store.ts            # 会话 Zustand store
│   ├── settings-store.ts           # 设置 Zustand store
│   ├── github-store.ts             # GitHub 数据 store
│   └── chat-store.ts               # 聊天状态 store
│
├── services/
│   ├── github-service.ts           # GitHub API 服务
│   ├── storage-service.ts          # 存储服务
│   ├── ai-service.ts               # AI Agent 服务
│   └── types.ts                    # 服务类型定义
│
└── mastra/
    ├── index.ts                    # Mastra 配置
    ├── agents/
    │   └── repository-agent.ts     # 仓库分析 Agent
    ├── tools/
    │   ├── index.ts
    │   ├── github-tools.ts         # GitHub 相关工具
    │   └── analysis-tools.ts       # 分析工具
    └── workflows/
        └── repository-workflow.ts  # 仓库分析工作流
```

## 数据模型

### 核心数据结构

```typescript
// 用户会话
interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  selectedRepositories?: string[];  // 仓库 ID 列表
}

// 消息
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    repositoriesAnalyzed?: string[];
    toolsUsed?: string[];
  };
}

// GitHub 仓库基础信息
interface RepositoryBasic {
  id: string;
  name: string;
  owner: string;
  url: string;
  description: string;
  stars: number;
  language: string;
  topics: string[];
}

// GitHub 仓库详细信息
interface RepositoryDetail extends RepositoryBasic {
  readme: string;
  license: string;
  lastUpdated: string;
  contributors: number;
  forks: number;
}

// 用户设置
interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  modelProvider: string;
  modelName: string;
  apiKey?: string;
  sidebarCollapsed: boolean;
  language: 'en' | 'zh';
}
```

## 开发规范

### 代码风格

- **TypeScript**：严格模式，完整类型注解
- **命名**：
  - 组件：PascalCase
  - 文件：kebab-case
  - 函数/变量：camelCase
  - 常量：UPPER_SNAKE_CASE
- **导入顺序**：Node 模块 → 第三方 → 别名 → 相对路径
- **格式化**：ESLint auto-fix on save

### 组件设计原则

1. **单一职责**：每个组件只做一件事
2. **可组合性**：使用 shadcn/ui 组件库，避免重复造轮子
3. **可访问性**：ARIA 标签、键盘导航、屏幕阅读器支持
4. **性能**：使用 React.memo、useMemo、useCallback 优化

### 状态管理原则

1. **Zustand Store**：全局状态（会话、设置、GitHub 数据）
2. **React Hooks**：局部状态（UI 状态、表单状态）
3. **localStorage**：持久化存储（会话、设置）

### 错误处理

- 使用 try-catch 捕获异步错误
- 提供用户友好的错误提示
- 记录错误日志便于调试

## 开发流程

### 阶段划分

1. **第一阶段**：基础架构和认证
   - 项目初始化和目录结构
   - GitHub OAuth 集成
   - 基础布局和导航

2. **第二阶段**：数据层和存储
   - GitHub API 服务
   - localStorage 适配器
   - Zustand stores 实现

3. **第三阶段**：AI Agent 实现
   - Mastra Agent 配置
   - GitHub 工具集
   - 对话逻辑

4. **第四阶段**：UI 组件和交互
   - 侧边栏组件
   - 聊天面板组件
   - 仓库卡片和展示

5. **第五阶段**：优化和完善
   - 性能优化
   - 可访问性审计
   - 测试和 bug 修复

## 关键技术决策

### 为什么选择 Zustand？
- 轻量级，学习曲线平缓
- 支持中间件和持久化
- 与 localStorage 集成简单

### 为什么使用 localStorage？
- 无需后端，快速原型开发
- 支持离线使用
- 架构设计支持未来数据库迁移

### 为什么采用渐进式披露？
- 减少 API 调用和数据传输
- 提高 AI 分析效率
- 改善用户体验

### 为什么使用 Mastra？
- 原生支持多个 AI 模型提供商
- 内置 Agent 和 Tool 框架
- 支持内存管理和工作流

## 成功指标

- ✅ 用户可通过 OAuth 登录
- ✅ 能获取用户所有 Star 仓库
- ✅ AI 可进行多轮对话
- ✅ 支持渐进式信息获取
- ✅ 会话和设置持久化
- ✅ 响应式设计，移动端可用
- ✅ 页面加载快速，动画流畅
- ✅ 无障碍设计符合标准

## 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|--------|
| GitHub API 速率限制 | 无法获取仓库数据 | 实现缓存，使用 GraphQL 优化查询 |
| AI 模型成本高 | 用户体验受影响 | 让用户自配置 API Key，优化 prompt |
| localStorage 容量限制 | 无法存储大量会话 | 实现会话压缩，定期清理 |
| 跨浏览器兼容性 | 功能不可用 | 充分测试，使用 polyfill |

## 下一步

详见各个功能模块的实现文档：
- `01-auth-setup.md` - GitHub OAuth 认证
- `02-github-service.md` - GitHub API 服务
- `03-storage-layer.md` - 存储层实现
- `04-ai-agent.md` - AI Agent 实现
- `05-ui-components.md` - UI 组件开发
- `06-chat-interface.md` - 聊天界面实现
- `07-sidebar-navigation.md` - 侧边栏导航
- `08-settings-system.md` - 设置系统
