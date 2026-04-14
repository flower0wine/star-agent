import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { RoomGenerationRequest } from "@/lib/room/types";
import { runRoomGenerationStream } from "@/lib/room/runtime/room-engine";
import {
  acquireRoomLock,
  releaseRoomLock,
} from "@/lib/room/runtime/room-lock";

export const runtime = "nodejs";
export const maxDuration = 60;

function isRoomGenerationRequest(payload: unknown): payload is RoomGenerationRequest {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;

  return typeof record.roomId === "string"
    && Array.isArray(record.sharedMessages)
    && typeof record.roomConfig === "object"
    && record.roomConfig !== null
    && typeof record.turnState === "object"
    && record.turnState !== null;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  try {
    const body: unknown = await request.json();

    if (!isRoomGenerationRequest(body)) {
      return NextResponse.json(
        { error: "Invalid room generation request body" },
        { status: 400 },
      );
    }

    const roomIdForLock = body.roomId;
    const acquired = acquireRoomLock(roomIdForLock);
    if (!acquired) {
      return NextResponse.json(
        { error: "该交流室正在执行中，请稍后重试" },
        { status: 409 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const writeEvent = (event: string, data: unknown) => {
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        };

        const execute = async () => {
          try {
            for await (const event of runRoomGenerationStream({
              ...body,
              requestId,
            })) {
              if (event.type === "start") {
                writeEvent("start", event);
              } else if (event.type === "delta") {
                writeEvent("delta", {
                  text: event.text,
                  partType: event.partType,
                });
              } else if (event.type === "commit") {
                writeEvent("commit", {
                  message: event.message,
                });
              } else if (event.type === "done") {
                writeEvent("done", event.payload);
              }
            }
          } catch (streamError) {
            writeEvent("error", {
              error: streamError instanceof Error ? streamError.message : "Room stream failed",
            });
          } finally {
            releaseRoomLock(roomIdForLock);
            controller.close();
          }
        };

        void execute();
      },
      cancel() {
        releaseRoomLock(roomIdForLock);
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown room error";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Room API is running.",
  });
}
