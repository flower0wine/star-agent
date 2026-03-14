import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// =============================================================================
// Environment Variables
// =============================================================================

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

// =============================================================================
// POST Handler - Exchange code for access token
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_REDIRECT_URI) {
      console.error("Missing GitHub OAuth environment variables");
      return NextResponse.json(
        { error: { message: "Server configuration error" } },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: { message: "Authorization code is required" } },
        { status: 400 }
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: GITHUB_REDIRECT_URI,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("GitHub token exchange failed:", errorData);
      return NextResponse.json(
        { error: { message: errorData.error_description || "Failed to exchange code for token" } },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    // Check for errors in response
    if (tokenData.error) {
      console.error("GitHub OAuth error:", tokenData);
      return NextResponse.json(
        { error: { message: tokenData.error_description || tokenData.error } },
        { status: 400 }
      );
    }

    // Return access token to client
    return NextResponse.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Handle OAuth callback (redirect from GitHub)
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors from GitHub
  if (error) {
    console.error("GitHub OAuth error:", error, errorDescription);
    // Redirect to home with error
    const redirectUrl = new URL("/");
    redirectUrl.searchParams.set("auth_error", error);
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // If we have code, redirect to a page that will handle the callback
  // We use the page approach because we need client-side JavaScript to exchange the code
  if (code && state) {
    // Redirect to home with callback params - client will handle the exchange
    const redirectUrl = new URL("/", request.nextUrl.origin);
    redirectUrl.searchParams.set("code", code);
    redirectUrl.searchParams.set("state", state);
    return NextResponse.redirect(redirectUrl);
  }

  // No code, redirect to home
  return NextResponse.redirect(new URL("/", request.nextUrl.origin));
}
