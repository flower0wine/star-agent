"use client";

import { useEffect, useState } from "react";
import { useGitHubAuth } from "@/lib/hooks/use-auth";
import { Loader2Icon } from "lucide-react";

export interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
}

export async function AuthGuard({
  children,
  fallback,
  loading,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useGitHubAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Wait for auth to initialize
  useEffect(() => {
    // Small delay to ensure store is hydrated
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      loading ?? (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    );
  }

  // Show fallback if not authenticated
  if (!isAuthenticated) {
    return <>{fallback ?? null}</>;
  }

  // Render children if authenticated
  return <>{children}</>;
}

export default AuthGuard;
