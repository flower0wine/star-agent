# SPEC-002: GitHub OAuth Authentication Module

## 1. Module Overview

### 1.1 Purpose

Handle GitHub OAuth authentication flow to allow users to sign in with their GitHub account and grant access to their starred repositories.

### 1.2 Scope

This module handles:
- OAuth authorization flow initiation
- Callback handling with token exchange
- Token storage and retrieval
- User session management
- Logout functionality

This module does NOT handle:
- GitHub API data fetching (see SPEC-003)
- User profile data beyond basic info
- Repository data processing

---

## 2. User Flow

### 2.1 Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  User   │────▶│ Login Page  │────▶│ GitHub OAuth │────▶│   Callback  │
│         │     │             │     │    Authorize │     │   Handler   │
└─────────┘     └─────────────┘     └──────────────┘     └─────────────┘
                                                                    │
                                                                    ▼
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Home   │◀────│ Chat Panel │◀────│ Store Token  │◀────│ Exchange    │
│  Page   │     │             │     │ in localSto  │     │ Code for    │
└─────────┘     └─────────────┘     └──────────────┘     │ Access Token│
                                                          └─────────────┘
```

### 2.2 State Machine

```
States: UNINITIALIZED → IDLE → AUTHENTICATING → AUTHENTICATED → ERROR

Transitions:
- UNINITIALIZED → IDLE: App loads, check existing token
- IDLE → AUTHENTICATING: User clicks "Login with GitHub"
- AUTHENTICATING → AUTHENTICATED: Token received and stored
- AUTHENTICATED → IDLE: User logs out
- Any → ERROR: OAuth error occurs
- ERROR → IDLE: User dismisses error
```

---

## 3. Technical Implementation

### 3.1 OAuth Configuration

**GitHub OAuth App Settings**:
- Authorization callback URL: `{APP_URL}/api/auth/callback`
- Scopes: `read:user`, `user:email`

**Environment Variables Required**:
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3.2 OAuth Flow (Client-Side)

Since this is a frontend-only application, we'll use the **Authorization Code Flow with PKCE** for better security, or fallback to the implicit flow for simplicity.

#### Option A: Client-Side Only (Recommended for this project)

1. **Initiate Authorization**:
   ```typescript
   // Redirect to GitHub with client_id, redirect_uri, scope, state
   const params = new URLSearchParams({
     client_id: GITHUB_CLIENT_ID,
     redirect_uri: GITHUB_REDIRECT_URI,
     scope: "read:user user:email",
     state: generateRandomState(),
   });
   window.location.href = `https://github.com/login/oauth/authorize?${params}`;
   ```

2. **Handle Callback**:
   - GitHub redirects to `/api/auth/callback?code=xxx&state=xxx`
   - Exchange code for access token via server-side API route

3. **Exchange Code for Token** (Server Route):
   ```typescript
   // POST to GitHub token endpoint
   const response = await fetch("https://github.com/login/oauth/access_token", {
     method: "POST",
     headers: {
       "Accept": "application/json",
       "Content-Type": "application/json",
     },
     body: JSON.stringify({
       client_id: GITHUB_CLIENT_ID,
       client_secret: GITHUB_CLIENT_SECRET,
       code: authorizationCode,
       redirect_uri: GITHUB_REDIRECT_URI,
     }),
   });
   ```

### 3.3 API Routes Structure

```
src/app/api/auth/
├── route.ts           # POST - Initiate OAuth (optional)
├── callback/
│   └── route.ts       # GET  - Handle OAuth callback
└── logout/
    └── route.ts       # POST - Clear session
```

### 3.4 Token Storage

**Storage Key**: `github_access_token`

**Storage Format**:
```typescript
interface AuthToken {
  access_token: string;
  token_type: string;
  expires_at?: number;        // Unix timestamp
  refresh_token?: string;    // If using refresh token flow
}
```

**Storage Location**: localStorage

**Security Note**: For a client-side only app, localStorage is acceptable. Tokens are notHttpOnly due to the need to make API calls from the client.

---

## 4. Module API

### 4.1 Service Interface

```typescript
// lib/services/github-auth.ts

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GitHubUser | null;
  error: string | null;
}

interface GitHubAuthService {
  // Check if user is already authenticated
  isAuthenticated(): boolean;
  
  // Get current access token
  getToken(): string | null;
  
  // Initiate login flow
  login(): void;
  
  // Handle OAuth callback (call after redirect)
  handleCallback(code: string, state: string): Promise<boolean>;
  
  // Logout and clear session
  logout(): void;
  
  // Get current user info
  getCurrentUser(): Promise<GitHubUser | null>;
}
```

### 4.2 Usage Examples

```typescript
// In React components
import { useGitHubAuth } from "@/lib/hooks/use-auth";

// Inside component
const { isAuthenticated, login, logout, user } = useGitHubAuth();

// Login
const handleLogin = () => {
  login();
};

// Logout
const handleLogout = () => {
  logout();
};

// Check auth on app init
useEffect(() => {
  const initAuth = async () => {
    const user = await getCurrentUser();
    if (user) {
      setAuthState({ isAuthenticated: true, user });
    }
  };
  initAuth();
}, []);
```

---

## 5. Component Specifications

### 5.1 Login Button Component

**File**: `src/components/auth/login-button.tsx`

**Requirements**:
- Use existing `Button` component from `src/components/ui/button.tsx`
- GitHub icon from `lucide-react`
- "Sign in with GitHub" text
- Loading state during authentication
- Disabled state while authentication in progress

**Visual**:
```tsx
<Button 
  variant="default" 
  size="lg"
  onClick={login}
  disabled={isLoading}
>
  <GithubIcon className="mr-2 h-5 w-5" />
  {isLoading ? "Signing in..." : "Sign in with GitHub"}
</Button>
```

### 5.2 Auth Guard Component

**File**: `src/components/auth/auth-guard.tsx`

**Purpose**: Protect routes/components requiring authentication

**Props**:
```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // Shown when not authenticated
  loading?: React.ReactNode;    // Shown while checking auth
}
```

**Behavior**:
1. Show loading state while checking auth
2. If authenticated, render children
3. If not authenticated, render fallback (or redirect to login)

### 5.3 User Avatar Component

**File**: `src/components/auth/user-avatar.tsx`

**Props**:
```typescript
interface UserAvatarProps {
  user: GitHubUser;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}
```

---

## 6. Error Handling

### 6.1 Error Types

| Error Code | Description | User Message |
|------------|-------------|--------------|
| `AUTH_CANCELLED` | User cancelled OAuth | "Sign in was cancelled" |
| `TOKEN_EXCHANGE_FAILED` | Failed to exchange code | "Failed to complete sign in. Please try again." |
| `TOKEN_EXPIRED` | Access token expired | "Your session has expired. Please sign in again." |
| `INVALID_STATE` | CSRF state mismatch | "Sign in failed due to security check. Please try again." |
| `NETWORK_ERROR` | Network failure | "Network error. Please check your connection." |

### 6.2 Error Display

- Show error toast/notification
- Log error for debugging
- Provide retry option where applicable

---

## 7. State Management

### 7.1 Zustand Store

**File**: `src/stores/auth-store.ts`

```typescript
interface AuthStore {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GitHubUser | null;
  token: string | null;
  error: string | null;
  
  // Actions
  setUser: (user: GitHubUser) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
}
```

### 7.2 Persistence

- Token stored in localStorage (key: `github_access_token`)
- User info cached in localStorage (key: `github_user`)
- On app init, hydrate store from localStorage

---

## 8. Security Considerations

### 8.1 State Parameter

Generate random state for CSRF protection:
```typescript
function generateState(): string {
  return crypto.randomUUID();
}
```

Store state in sessionStorage before redirect, verify on callback.

### 8.2 Token Security

- Never log tokens to console in production
- Clear token on logout
- Implement token refresh if using refresh tokens

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

- [ ] User can initiate GitHub OAuth flow by clicking login button
- [ ] After successful OAuth, user info is displayed in UI
- [ ] User can log out, clearing all auth data
- [ ] Auth state persists across page reloads
- [ ] OAuth errors are handled gracefully with user-friendly messages
- [ ] Loading states shown during authentication

### 9.2 Technical Requirements

- [ ] OAuth state parameter used to prevent CSRF
- [ ] Access token stored securely in localStorage
- [ ] API route handles token exchange server-side (protects client secret)
- [ ] TypeScript strict mode passes
- [ ] ESLint passes

### 9.3 UX Requirements

- [ ] Login button prominently displayed on unauthenticated state
- [ ] User avatar/name shown in sidebar when authenticated
- [ ] Smooth transition between authenticated/unauthenticated states
- [ ] Clear feedback for all auth operations (loading, success, error)

---

## 10. File Checklist

```
src/
├── components/
│   └── auth/
│       ├── login-button.tsx      # Login button component
│       ├── auth-guard.tsx        # Route protection component
│       └── user-avatar.tsx       # User avatar display
│
├── lib/
│   └── services/
│       └── github-auth.ts        # Auth service implementation
│
├── hooks/
│   └── use-auth.ts              # Auth hook
│
├── stores/
│   └── auth-store.ts            # Zustand auth store
│
├── app/
│   └── api/
│       └── auth/
│           └── callback/
│               └── route.ts      # OAuth callback handler
│
└── types/
    └── github.ts                # GitHub types
```

---

## 11. Dependencies

### 11.1 Required Packages

None additional - using built-in fetch and Next.js API routes.

### 11.2 Environment Variables

```env
# Required
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (for production)
GITHUB_SCOPE=read:user+user:email
```
