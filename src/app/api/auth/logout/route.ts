import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// =============================================================================
// POST Handler - Clear session and logout
// =============================================================================

export async function POST(_request: NextRequest) {
  try {
    // For client-side OAuth, the token is stored in localStorage on the client
    // This endpoint can be used to:
    // 1. Invalidate token on server side (if implementing server-side sessions)
    // 2. Clear any server-side cookies or session data

    // Currently, GitHub OAuth tokens don't have a server-side invalidation endpoint
    // The client will handle clearing localStorage

    // Return success - client should clear localStorage
    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: { message: "Logout failed" } },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Also support GET for simple redirects
// =============================================================================

export async function GET(_request: NextRequest) {
  return POST(_request);
}
