import { NextResponse } from "next/server";

import { getProviderSummaries } from "@/lib/models/catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const providers = await getProviderSummaries();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Failed to load provider list:", error);
    return NextResponse.json(
      { error: "Failed to load provider list" },
      { status: 500 }
    );
  }
}
