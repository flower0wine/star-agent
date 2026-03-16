"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StarIcon, Loader2Icon } from "lucide-react";
import { motion } from "motion/react";

export interface StarLoginProps {
  onSubmit: (username: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

export function StarLogin({ onSubmit, error, isLoading }: StarLoginProps) {
  const [username, setUsername] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username.trim())
        return;
      await onSubmit(username);
    },
    [username, onSubmit]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10"
          >
            <StarIcon className="size-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-semibold tracking-tight">Star Agent</h1>
          <p className="text-muted-foreground">
            Find your perfect repository from your GitHub stars
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your GitHub username"
              className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          AI can make mistakes. Please verify important information.
        </p>
      </motion.div>
    </div>
  );
}
