import { NextResponse } from "next/server";

import { getCatalogLiteProviders } from "@/lib/models/catalog";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const providers = await getCatalogLiteProviders();
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("Failed to load catalog lite:", error);
    return NextResponse.json(
      { error: "Failed to load catalog lite" },
      { status: 500 }
    );
  }
}
