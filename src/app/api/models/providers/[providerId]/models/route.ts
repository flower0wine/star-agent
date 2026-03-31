import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getProviderDetails } from "@/lib/models/catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await context.params;
    const provider = await getProviderDetails(providerId);

    if (!provider) {
      return NextResponse.json(
        { error: `Provider not found: ${providerId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ provider });
  } catch (error) {
    console.error("Failed to load provider models:", error);
    return NextResponse.json(
      { error: "Failed to load provider models" },
      { status: 500 }
    );
  }
}
