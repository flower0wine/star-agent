// =============================================================================
// Chat API Route
// Server-side streaming chat endpoint using Mastra agent
// =============================================================================

import { handleChatStream, toAISdkStream } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { mastra } from "@/mastra";
import type { MastraModelOutput } from "@mastra/core/stream";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await handleChatStream({
    mastra,
    agentId: "star-agent",
    params: {
      messages,
    },
  });

  // Convert stream to AI SDK format - use type assertion to bypass version mismatch
  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }: { writer: any }) => {
      for await (const part of toAISdkStream(stream as unknown as MastraModelOutput<unknown>, {
        from: "agent",
      })) {
        await writer.write(part);
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
}
