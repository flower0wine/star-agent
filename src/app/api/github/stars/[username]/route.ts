import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchUserStars, getGitHubUser } from "@/lib/github/api";
import type { GitHubRepo } from "@/lib/github/api";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{
    username: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { username } = await params;

    if (!username || username.trim() === "") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // First, verify the user exists
    const user = await getGitHubUser(username);

    // Fetch all starred repos
    const repos = await fetchUserStars(username);

    return NextResponse.json({
      user: {
        login: user.login,
        avatar_url: user.avatar_url,
        public_repos: user.public_repos,
        followers: user.followers,
      },
      repos,
      totalCount: repos.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("rate limit")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }

    return NextResponse.json(
      { error: `Failed to fetch stars: ${message}` },
      { status: 500 }
    );
  }
}
