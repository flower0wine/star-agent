# Master-SubAgent 流式输出架构设计

---

## 1. 背景与目标

### 1.1 当前问题

现有架构中，Master Agent 调用子Agent（通过 `createSubAgent` 工具）是**同步阻塞**的：

```
用户请求 → Master Agent → [等待子Agent完成] → 返回结果
```

**痛点**：
1. 子Agent执行期间，Master Agent 完全阻塞
2. 前端看不到子Agent的中间输出，只能等待最终结果
3. 多个仓库并行处理时，无法展示每个子Agent的独立输出
4. 用户体验类似"黑盒"，缺乏透明度和参与感

### 1.2 目标

实现**非阻塞、并行、流式**的子Agent执行架构：

```
用户请求 → Master Agent → [启动子Agent，立即返回] → 继续执行
                                      ↓
                               子Agent独立执行
                                      ↓
                               流式输出到前端
```

**具体目标**：
1. 子Agent工具调用**立即返回**，不阻塞主流程
2. 多个子Agent可以**并行执行**
3. 子Agent输出**实时流式**到达前端，像主Agent一样自然
4. 前端能清晰展示**主Agent + 多个子Agent**的消息

---

## 2. 核心架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 前端                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Chat 界面                                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Master Agent │  │ SubAgent #1  │  │ SubAgent #2  │              │   │
│  │  │   流式输出   │  │   流式输出   │  │   流式输出   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ SSE / WebSocket
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 后端                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      API Route (chat)                               │   │
│  │   ┌─────────────────────────────────────────────────────────────┐  │   │
│  │   │                  Multi-Stream Merger                         │  │   │
│  │   │  (合并主Agent流 + 子Agent流，统一输出到前端)                  │  │   │
│  │   └─────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      ▲                                      │
│                    ┌─────────────────┼─────────────────┐                    │
│                    │                 │                 │                    │
│  ┌─────────────────▼───────┐  ┌─────▼─────┐  ┌───────▼────────┐          │
│  │      Master Agent        │  │ SubAgent  │  │   SubAgent     │          │
│  │      (streamText)        │  │  Executor │  │    Executor    │          │
│  │                         │  │  (后台)    │  │    (后台)       │          │
│  └─────────────────────────┘  └────────────┘  └────────────────┘          │
│                    │                                                      │
│                    │ tool call                                             │
│                    ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   SubAgent Manager                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              Agent Task Queue (内存/Redis)                   │   │   │
│  │  │   [{ id, task, status, progress, result, ... }]           │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              Agent Executor (调度器)                        │   │   │
│  │  │   - 消费队列                                                │   │   │
│  │  │   - 创建 ToolLoopAgent                                      │   │   │
│  │  │   - 流式输出 → 通过 SSE 发送到前端                          │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

| 组件 | 职责 | 技术实现 |
|------|------|----------|
| **SubAgentManager** | 管理子Agent生命周期、任务队列、调度执行 | 单例/依赖注入 |
| **TaskQueue** | 存储待执行的子Agent任务 | 内存 Map / Redis |
| **AgentExecutor** | 消费队列，创建子Agent，流式执行 | AsyncGenerator + ToolLoopAgent |
| **MultiStreamMerger** | 合并主Agent和子Agent的流式输出 | TransformStream + SSE |
| **Frontend Router** | 根据 streamId 路由消息到正确的UI区域 | React State |

---

## 3. 详细设计

### 3.1 子Agent任务队列

```typescript
// src/lib/agents/sub-agent/manager.ts

export interface SubAgentTask {
  id: string;                    // 唯一标识 (subagent-{timestamp}-{random})
  parentId: string;              // 父请求ID (用于关联)
  task: string;                  // 要执行的任务描述
  repos: GitHubRepo[];           // 处理的仓库列表
  username: string;              // GitHub 用户名
  status: "pending" | "running" | "completed" | "failed";
  progress: number;              // 0-100
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;               // 最终结果
  error?: string;                // 错误信息
  streamId?: string;             // 用于前端路由
}

export interface SubAgentProgress {
  taskId: string;
  type: "start" | "progress" | "text" | "tool-call" | "tool-result" | "complete" | "error";
  content?: string;
  toolCall?: any;
  toolResult?: any;
  progress?: number;
}

/**
 * SubAgent 管理器 - 全局单例
 * 负责：
 * 1. 接收子Agent任务（工具调用时）
 * 2. 调度执行
 * 3. 管理任务状态
 * 4. 事件通知（SSE推送）
 */
export class SubAgentManager {
  private static instance: SubAgentManager;
  private tasks = new Map<string, SubAgentTask>();
  private executors: Map<string, AbortController> = new Map();
  private listeners: Set<(progress: SubAgentProgress) => void> = new Set();
  
  // 用于 SSE 推送的队列
  private eventQueue: SubAgentProgress[] = [];
  
  static getInstance(): SubAgentManager {
    if (!SubAgentManager.instance) {
      SubAgentManager.instance = new SubAgentManager();
    }
    return SubAgentManager.instance;
  }
  
  /**
   * 添加任务到队列（工具调用时使用）
   */
  addTask(task: Omit<SubAgentTask, "id" | "status" | "createdAt">): string {
    const id = `subagent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const fullTask: SubAgentTask = {
      ...task,
      id,
      status: "pending",
      createdAt: new Date(),
      streamId: `subagent-${id}`,
    };
    
    this.tasks.set(id, fullTask);
    this.notify({ taskId: id, type: "start", progress: 0 });
    
    // 异步启动执行
    this.executeTask(fullTask);
    
    return id;
  }
  
  /**
   * 执行任务（后台进行）
   */
  private async executeTask(task: SubAgentTask): Promise<void> {
    task.status = "running";
    task.startedAt = new Date();
    
    this.notify({ taskId: task.id, type: "start", progress: 0 });
    
    try {
      const modelInstance = getModel();
      
      const subAgentTools = createSubAgentTools(task.repos);
      const subAgent = new ToolLoopAgent({
        model: modelInstance.model,
        instructions: getSubAgentPrompt(task.repos, task.username),
        tools: subAgentTools,
      });
      
      // 流式执行
      const result = await subAgent.stream({
        prompt: task.task,
        abortSignal: this.getAbortSignal(task.id),
      });
      
      // 逐块处理流式输出
      for await (const chunk of result.toUIMessageStream()) {
        // 将子Agent的输出作为事件推送
        this.notify({
          taskId: task.id,
          type: "text",
          content: this.extractTextFromChunk(chunk),
          progress: 50, // 中间进度
        });
      }
      
      task.status = "completed";
      task.progress = 100;
      this.notify({ taskId: task.id, type: "complete", progress: 100 });
      
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Unknown error";
      this.notify({ taskId: task.id, type: "error", content: task.error });
    }
  }
  
  /**
   * 注册事件监听器（SSE推送用）
   */
  subscribe(listener: (progress: SubAgentProgress) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(progress: SubAgentProgress): void {
    this.listeners.forEach(listener => listener(progress));
  }
  
  getTask(id: string): SubAgentTask | undefined {
    return this.tasks.get(id);
  }
  
  getAllTasks(): SubAgentTask[] {
    return Array.from(this.tasks.values());
  }
  
  abortTask(id: string): void {
    const controller = this.executors.get(id);
    controller?.abort();
    this.tasks.get(id)?.status = "failed";
  }
}
```

### 3.2 工具函数改造

```typescript
// src/agents/master/tools/create-sub-agent.ts

import { tool } from "ai";
import { z } from "zod";
import { SubAgentManager } from "@/lib/agents/sub-agent/manager";
import type { GitHubRepo } from "@/lib/github/api";

export function createCreateSubAgentTool(
  repos: GitHubRepo[],
  username: string
) {
  return tool({
    description: "创建子Agent并行处理仓库",
    inputSchema: z.object({
      task: z.string().describe("要分配给子Agent的任务描述"),
      startIndex: z.number().describe("仓库起始索引"),
      endIndex: z.number().describe("仓库结束索引"),
    }),
    
    // 核心改动：立即返回，不等待子Agent完成
    execute: async (params) => {
      const { task, startIndex, endIndex } = params;
      const subRepos = repos.slice(startIndex, endIndex);
      
      // 获取全局管理器
      const manager = SubAgentManager.getInstance();
      
      // 添加任务到队列，立即返回
      const taskId = manager.addTask({
        task,
        repos: subRepos,
        username,
        progress: 0,
      });
      
      // 立即返回，让Master Agent继续执行
      return {
        taskId,
        status: "launched",
        message: `子Agent已启动 (ID: ${taskId})，正在处理 ${subRepos.length} 个仓库`,
        reposCount: subRepos.length,
        // 告诉前端这是异步任务，需要通过taskId订阅进度
        async: true,
      };
    },
  });
}
```

### 3.3 多流合并 SSE

```typescript
// src/lib/agents/multi-stream.ts

import { streamText, convertToModelMessages } from "ai";
import { SubAgentManager } from "./sub-agent/manager";

/**
 * 创建支持子Agent流式的响应
 * 
 * 核心思路：
 * 1. 主Agent使用正常的 streamText
 * 2. 子Agent通过 SubAgentManager 的事件订阅获取进度
 * 3. 合并到一个 SSE 流中，通过 streamId 区分来源
 */
export async function createMultiStreamResponse(
  masterStream: ReturnType<typeof streamText>,
  requestId: string
): Promise<Response> {
  const encoder = new TextEncoder();
  const { writable, readable } = new TransformStream();
  const writer = writable.getWriter();
  
  const subManager = SubAgentManager.getInstance();
  
  // 创建取消控制器
  const abortController = new AbortController();
  
  // 启动两个并行任务：
  // 1. 处理主Agent流
  // 2. 处理子Agent进度
  
  Promise.all([
    // 主Agent流处理
    (async () => {
      try {
        const masterIter = masterStream.toUIMessageStream();
        
        for await (const chunk of masterIter) {
          // 检查是否已取消
          if (abortController.signal.aborted) break;
          
          // 发送主Agent消息，标记 streamId = "master"
          const sseData = formatSSE({
            streamId: "master",
            messageId: `${requestId}-master`,
            chunk,
          });
          await writer.write(encoder.encode(sseData));
        }
        
        // 发送完成信号
        await writer.write(encoder.encode(formatSSE({
          streamId: "master",
          type: "finish",
        })));
        
      } catch (error) {
        console.error("Master stream error:", error);
        await writer.write(encoder.encode(formatSSE({
          streamId: "master",
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })));
      }
    })(),
    
    // 子Agent进度处理（通过事件订阅）
    (async () => {
      const progressHandler = (progress: SubAgentProgress) => {
        if (abortController.signal.aborted) return;
        
        const sseData = formatSSE({
          streamId: progress.taskId,
          type: progress.type,
          content: progress.content,
          progress: progress.progress,
          toolCall: progress.toolCall,
          toolResult: progress.toolResult,
        });
        
        writer.write(encoder.encode(sseData)).catch(console.error);
      };
      
      subManager.subscribe(progressHandler);
    })(),
  ]).finally(() => {
    // 清理
    writer.close();
  });
  
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 禁用 Nginx 缓冲
    },
  });
}

function formatSSE(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}
```

### 3.4 API Handler 改造

```typescript
// src/app/api/chat/handler-master.ts

import { convertToModelMessages, streamText, stepCountIs } from "ai";
import { createMultiStreamResponse } from "@/lib/agents/multi-stream";

export async function handleMasterAgent(
  requestId: string,
  body: ChatRequestBody
): Promise<Response> {
  // ... 获取 username, repos 等前置逻辑不变 ...
  
  const masterAgent = createMasterAgent(finalRepos, modelInstance, username);
  const tools = masterAgent.getTools({});
  const systemPrompt = masterAgent.getSystemPrompt({ username, repos: finalRepos });
  
  const modelMessages = await convertToModelMessages(body.messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });
  
  // 创建主Agent流
  const masterStream = streamText({
    model: modelInstance.model,
    tools,
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(100),
  });
  
  // 使用多流合并响应
  return createMultiStreamResponse(masterStream, requestId);
}
```

---

## 4. 前端设计

### 4.1 消息类型定义

```typescript
// src/types/agent.ts

export type MessageStreamSource = "master" | "subagent";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: UIPart[];
  createdAt: Date;
  metadata?: {
    streamId: string;        // 用于路由：master 或 subagent-{id}
    source: MessageStreamSource;
    totalUsage?: LanguageModelUsage;
  };
}

export interface SubAgentCard {
  taskId: string;
  status: "pending" | "running" | "completed" | "failed";
  task: string;
  reposCount: number;
  progress: number;
  currentOutput?: string;
  finalResult?: string;
}
```

### 4.2 自定义 Hook

```typescript
// src/hooks/use-multi-agent-stream.ts

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface StreamMessage {
  streamId: string;
  type?: string;
  chunk?: any;
  messageId?: string;
  content?: string;
  progress?: number;
}

export function useMultiAgentStream(onChunk: (chunk: StreamMessage) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const connect = useCallback((sessionId: string) => {
    // 复用现有的 SSE 连接（如果有）
    // 或者在 useChat 内部处理
  }, []);
  
  return {
    isConnected,
    connect,
  };
}
```

### 4.3 UI 渲染组件

```tsx
// src/components/star/agent-chat.tsx

"use client";

import { useChat } from "@ai-sdk/react";
import { MessageRenderer, MessageLoadingIndicator } from "./message-renderer";
import { SubAgentPanel } from "./sub-agent-panel";
import { useState, useEffect } from "react";

export function AgentChat() {
  const { messages, input, setInput, sendMessage, status } = useChat();
  const [subAgentCards, setSubAgentCards] = useState<Map<string, SubAgentCard>>(new Map());
  
  // 处理流式消息，根据 streamId 路由
  useEffect(() => {
    // 监听最新消息，提取子Agent相关的部分
    messages.forEach((msg) => {
      const streamId = msg.metadata?.streamId;
      if (streamId?.startsWith("subagent-")) {
        // 更新对应子Agent卡片的状态
        updateSubAgentCard(streamId, msg);
      }
    });
  }, [messages]);
  
  return (
    <div className="flex flex-col h-full">
      {/* 主消息区域 */}
      <div className="flex-1 overflow-auto space-y-4 p-4">
        {messages.map((message) => (
          <MessageRenderer key={message.id} message={message} />
        ))}
        
        {status === "streaming" && <MessageLoadingIndicator />}
      </div>
      
      {/* 子Agent面板（可选：折叠在侧边） */}
      <SubAgentPanel 
        agents={subAgentCards}
        onExpand={(taskId) => {/* 展开详情 */}}
      />
      
      {/* 输入区域 */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你想要什么..."
            className="w-full p-3 border rounded-lg"
          />
        </form>
      </div>
    </div>
  );
}
```

```tsx
// src/components/star/sub-agent-panel.tsx

"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

export function SubAgentPanel({ agents, onExpand }: {
  agents: Map<string, SubAgentCard>;
  onExpand: (taskId: string) => void;
}) {
  const agentsList = Array.from(agents.values());
  
  if (agentsList.length === 0) return null;
  
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium bg-muted/50">
        <ChevronDownIcon className="w-4 h-4" />
        <span>子Agent进度</span>
        <Badge variant="secondary">{agentsList.length}</Badge>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4">
          {agentsList.map((agent) => (
            <AgentCard key={agent.taskId} agent={agent} onExpand={onExpand} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AgentCard({ agent, onExpand }: {
  agent: SubAgentCard;
  onExpand: (taskId: string) => void;
}) {
  const statusColors = {
    pending: "bg-yellow-500",
    running: "bg-blue-500 animate-pulse",
    completed: "bg-green-500",
    failed: "bg-red-500",
  };
  
  return (
    <div 
      className="border rounded-lg p-3 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => onExpand(agent.taskId)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
          <span className="text-sm font-medium">
            {agent.taskId.slice(0, 12)}...
          </span>
        </div>
        <Badge variant="outline">{agent.reposCount} repos</Badge>
      </div>
      
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
        {agent.task}
      </p>
      
      {agent.status === "running" && (
        <Progress value={agent.progress} className="h-1" />
      )}
      
      {agent.currentOutput && (
        <p className="text-xs mt-2 line-clamp-3 font-mono bg-muted p-1 rounded">
          {agent.currentOutput}
        </p>
      )}
    </div>
  );
}
```

---

## 5. 数据流

### 5.1 完整数据流

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│   用户   │────▶│   前端发送   │────▶│  API /chat     │
└──────────┘     │  用户请求    │     └────────┬────────┘
                                         │
                                         ▼
                               ┌─────────────────┐
                               │  Master Agent  │
                               │  (streamText)  │
                               └────────┬────────┘
                                        │
                                        │ tool call: createSubAgent
                                        ▼
                               ┌─────────────────┐
                               │ SubAgentManager │
                               │   addTask()     │──── 立即返回 taskId
                               └────────┬────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │Executor #1 │     │Executor #2 │     │Executor #3 │
            │ (后台并行)  │     │ (后台并行)  │     │ (后台并行)  │
            └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
                   │                   │                   │
                   │   SSE 流式输出    │                   │
                   └─────────┬─────────┴─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │Multi-Stream     │
                    │Merger (合并)    │
                    └────────┬────────┘
                             │
                             ▼ SSE (单连接，多流)
                    ┌─────────────────┐
                    │     前端       │
                    │ - 消息路由     │
                    │ - 状态更新     │
                    │ - UI 渲染      │
                    └─────────────────┘
```

### 5.2 SSE 消息格式

```json
// 主Agent消息
{
  "streamId": "master",
  "messageId": "msg-xxx-master",
  "chunk": { /* UIMessage part */ }
}

// 子Agent进度
{
  "streamId": "subagent-1709xxx-abc123",
  "type": "text",
  "content": "正在分析仓库 xxx/repo-1...",
  "progress": 30
}

// 子Agent完成
{
  "streamId": "subagent-1709xxx-abc123",
  "type": "complete",
  "progress": 100,
  "result": "找到 3 个相关仓库..."
}
```

---

## 6. 关键技术点

### 6.1 为什么这样设计

| 决策 | 理由 |
|------|------|
| **工具立即返回** | 不阻塞Master Agent，允许主流程继续执行 |
| **全局单例Manager** | 跨请求共享状态，便于管理子Agent生命周期 |
| **事件订阅机制** | 解耦子Agent执行和SSE推送，便于扩展 |
| **streamId路由** | 前端可以精确区分消息来源，精准更新UI |
| **TransformStream合并** | 在服务端合并多路流为单路SSE，减少网络开销 |

### 6.2 潜在问题与解决

| 问题 | 解决方案 |
|------|----------|
| **请求超时** | Next.js API 默认60s超时，子Agent任务需要：1) 使用较长超时；2) 或将任务持久化到数据库，前端轮询 |
| **内存泄漏** | SubAgentManager 需要定期清理完成的任务，避免Map无限增长 |
| **并发限制** | 使用信号量控制同时执行的子Agent数量，避免耗尽API配额 |
| **前端SSE断开** | 实现重连机制，参考 useChat 的自动重连逻辑 |

### 6.3 替代方案

如果觉得 SSE 合并太复杂，可以考虑：

**方案B：独立子Agent API**
```
1. Master 返回后，前端为每个子Agent发起独立请求
2. 每个子Agent有独立的 SSE 连接
3. 前端并行渲染多个 useChat 实例
```

**优点**：实现简单，解耦彻底
**缺点**：多个网络连接，增加复杂度

## 7. 文件结构

```
src/
├── lib/
│   └── agents/
│       ├── sub-agent/
│       │   ├── manager.ts        # SubAgentManager 单例
│       │   ├── types.ts          # 类型定义
│       │   ├── executor.ts       # 执行器逻辑
│       │   └── prompt.ts         # 子Agent提示词
│       └── multi-stream.ts       # 多流合并器
├── agents/
│   └── master/
│       └── tools/
│           └── create-sub-agent.ts  # 改造为立即返回
├── app/api/chat/
│   ├── handler-master.ts         # 集成多流响应
│   └── route.ts
├── components/
│   └── star/
│       ├── sub-agent-panel.tsx   # 子Agent状态面板
│       └── agent-chat.tsx        # 主聊天组件
└── hooks/
    └── use-multi-agent-stream.ts  # 流式消息处理
```

---

## 8. 参考资料

- [Vercel AI SDK - createAgentUIStream](https://github.com/vercel/ai/blob/main/content/docs/07-reference/01-ai-sdk-core/17-create-agent-ui-stream.mdx)
- [Vercel AI SDK - Subagents](https://github.com/vercel/ai/blob/main/content/docs/03-agents/06-subagents.mdx)
- [MDN - TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

## 9. 待确认问题

1. **超时处理**：子Agent任务可能耗时较长，是否需要持久化到数据库（Redis）？
2. **并发数量**：是否需要限制同时执行的子Agent数量？上限多少？
3. **UI展示**：子Agent输出是集成在主聊天流中，还是单独的面板展示？
4. **错误处理**：子Agent失败时，如何展示给用户？

---

## 10. 确认决策

根据评审确认，以下决策已确定：

### 10.1 超时策略

- **子任务不限制超时时间**
- 原因：子Agent处理大量仓库可能耗时较长，允许其完整执行完成

### 10.2 并发策略

- **不限制并发数量**
- 原因：Vercel AI SDK 本身有完善的连接管理，允许自由扩展

### 10.3 UI 展示策略

- **使用独立的 UI 面板展示子Agent**
- 主聊天区域：仅展示 Master Agent 的消息和输出
- 子Agent面板：独立展示各个子Agent的运行状态、进度和输出
- 优点：界面清晰，用户可以同时关注主流程和子任务进展

### 10.4 错误处理

- **由 Vercel AI SDK 自动处理**
- SDK 内部包含完善的错误捕获和重试机制
- UI 层面的错误展示：SDK 会自动渲染错误状态，样式与主Agent一致
- 无需额外处理错误场景

