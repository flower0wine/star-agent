import type { AuthError, GitHubUser } from "@/types/github";

// =============================================================================
// Configuration
// =============================================================================

const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || "";
const GITHUB_REDIRECT_URI = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI || process.env.GITHUB_REDIRECT_URI || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  TOKEN: "github_access_token",
  USER: "github_user",
  STATE: "github_oauth_state",
} as const;

// =============================================================================
// Scopes
// =============================================================================

const OAUTH_SCOPES = ["read:user", "user:email"].join(" ");

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate random state for CSRF protection
 */
function generateState(): string {
  return crypto.randomUUID();
}

/**
 * Store state in sessionStorage
 */
function storeState(state: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEYS.STATE, state);
  }
}

/**
 * Retrieve and clear state from sessionStorage
 */
function retrieveAndClearState(): string | null {
  if (typeof window !== "undefined") {
    const state = sessionStorage.getItem(STORAGE_KEYS.STATE);
    sessionStorage.removeItem(STORAGE_KEYS.STATE);
    return state;
  }
  return null;
}

/**
 * Get access token from localStorage
 */
export function getToken(): string | null {
  if (typeof window === "undefined")
    return null;
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Get cached user from localStorage
 */
export function getCachedUser(): GitHubUser | null {
  if (typeof window === "undefined")
    return null;
  const userJson = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userJson)
    return null;
  try {
    return JSON.parse(userJson) as GitHubUser;
  } catch {
    return null;
  }
}

/**
 * Initiate GitHub OAuth login flow
 */
export function login(): void {
  if (typeof window === "undefined")
    return;

  // Generate and store state for CSRF protection
  const state = generateState();
  storeState(state);

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: OAUTH_SCOPES,
    state,
    // Use device flow for better security
    allow_signup: "true",
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  // Redirect to GitHub
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback
 * Called after redirect from GitHub with code and state
 */
export async function handleCallback(
  code: string,
  state: string
): Promise<{ success: boolean; error?: AuthError }> {
  if (typeof window === "undefined") {
    return {
      success: false,
      error: { code: "UNKNOWN_ERROR", message: "Invalid environment" },
    };
  }

  // Verify state to prevent CSRF attacks
  const storedState = retrieveAndClearState();
  if (!storedState || storedState !== state) {
    return {
      success: false,
      error: { code: "INVALID_STATE", message: "Security check failed. Please try again." },
    };
  }

  try {
    // Exchange code for access token via server-side API
    const response = await fetch("/api/auth/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: "TOKEN_EXCHANGE_FAILED",
          message: errorData.error?.message || "Failed to complete sign in. Please try again.",
        },
      };
    }

    const data = await response.json();

    if (!data.access_token) {
      return {
        success: false,
        error: { code: "TOKEN_EXCHANGE_FAILED", message: "No access token received" },
      };
    }

    // Store token
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.access_token);

    // Fetch user info
    const user = await getCurrentUser();
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }

    return { success: true };
  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Network error. Please check your connection.",
      },
    };
  }
}

/**
 * Get current user info from GitHub API
 */
export async function getCurrentUser(): Promise<GitHubUser | null> {
  const token = getToken();
  if (!token)
    return null;

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired
        logout();
        return null;
      }
      return null;
    }

    const user = await response.json();
    return user as GitHubUser;
  } catch (error) {
    console.error("Failed to get current user:", error);
    return null;
  }
}

/**
 * Logout and clear all auth data
 */
export function logout(): void {
  if (typeof window === "undefined")
    return;

  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  sessionStorage.removeItem(STORAGE_KEYS.STATE);

  // Optionally redirect to home
  window.location.href = APP_URL;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface GitHubAuthService {
  isAuthenticated: () => boolean;
  getToken: () => string | null;
  getCachedUser: () => GitHubUser | null;
  login: () => void;
  handleCallback: (code: string, state: string) => Promise<{ success: boolean; error?: AuthError }>;
  logout: () => void;
  getCurrentUser: () => Promise<GitHubUser | null>;
}

// =============================================================================
// Default Export
// =============================================================================

const githubAuthService: GitHubAuthService = {
  isAuthenticated,
  getToken,
  getCachedUser,
  login,
  handleCallback,
  logout,
  getCurrentUser,
};

export default githubAuthService;
