// =============================================================================
// Star Agent Service
// =============================================================================

import { starAgent, modelOptions } from "@/mastra/agents/star-agent";
import type { ModelId } from "@/mastra/agents/star-agent";

// =============================================================================
// Types
// =============================================================================

export interface ConversationThread {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatOptions {
  modelId?: ModelId;
}

export interface ChatResult {
  response: string;
  toolCalls?: Array<{
    toolName: string;
    input: Record<string, unknown>;
  }>;
}

export interface StreamChatOptions extends ChatOptions {
  onChunk: (chunk: string) => void;
  onComplete?: (result: ChatResult) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// Agent Service
// =============================================================================

class StarAgentService {
  private currentModelId: ModelId = modelOptions.default;

  /**
   * Change the model being used
   */
  setModel(modelId: ModelId): void {
    this.currentModelId = modelId;
  }

  /**
   * Get current model ID
   */
  getModel(): ModelId {
    return this.currentModelId;
  }

  /**
   * Send a message and get a response (non-streaming)
   */
  async chat(message: string, options: ChatOptions = {}): Promise<ChatResult> {
    const modelId = options.modelId ?? this.currentModelId;

    try {
      // Create agent with specified model
      const agent = this.createAgent(modelId);

      // Send message and get response
      const result = await agent.generate([
        { role: "user", content: message },
      ]);

      return {
        response: result.text,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      throw new Error(`Chat failed: ${err.message}`);
    }
  }

  /**
   * Send a message and stream the response
   */
  async streamChat(message: string, options: StreamChatOptions): Promise<ChatResult> {
    const { onChunk, onComplete, onError, modelId } = options;
    const selectedModelId = modelId ?? this.currentModelId;

    try {
      // Create agent with specified model
      const agent = this.createAgent(selectedModelId);

      // Stream the response - pass messages directly as first argument
      const result = await agent.stream([{ role: "user", content: message }]);

      let fullResponse = "";

      // Process the stream - use fullStream for streaming chunks
      const reader = result.fullStream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;

        // value is a chunk with type and content
        if (value && typeof value === "object") {
          const chunk = value as { type: string; text?: string; content?: string };
          const text = chunk.text ?? chunk.content ?? "";
          if (text) {
            fullResponse += text;
            onChunk(text);
          }
        }
      }

      const chatResult: ChatResult = {
        response: fullResponse,
      };

      onComplete?.(chatResult);
      return chatResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      onError?.(err);
      throw err;
    }
  }

  /**
   * Create a new agent instance with the specified model
   */
  private createAgent(modelId: ModelId) {
    return starAgent;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    // Memory is managed by the agent internally
    // This would require a method to clear it if needed
  }
}

// Export singleton instance
export const starAgentService = new StarAgentService();
