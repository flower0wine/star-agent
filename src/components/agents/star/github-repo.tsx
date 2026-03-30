"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  GithubIcon,
  StarIcon,
  GitForkIcon,
  ExternalLinkIcon,
  EyeIcon,
  CircleIcon,
} from "lucide-react";
import type { HTMLAttributes } from "react";
import { createContext, useContext, useMemo } from "react";

// Language colors map (similar to GitHub's language colors)
const languageColors: Record<string, string> = {
  "JavaScript": "#f1e05a",
  "TypeScript": "#2b7489",
  "Python": "#3572A5",
  "Java": "#b07219",
  "C++": "#f34b7d",
  "C": "#555555",
  "C#": "#178600",
  "Ruby": "#701516",
  "Go": "#00ADD8",
  "Rust": "#dea584",
  "PHP": "#4F5D95",
  "Swift": "#ffac45",
  "Kotlin": "#A97BFF",
  "Scala": "#c22d40",
  "Shell": "#89e051",
  "HTML": "#e34c26",
  "CSS": "#563d7c",
  "Vue": "#41b883",
  "Dart": "#00B4AB",
  "Elixir": "#6e4a7e",
  "Haskell": "#5e5086",
  "Lua": "#000080",
  "R": "#198CE7",
  "MATLAB": "#e16737",
  "Jupyter": "#DA5B0B",
};

export interface GitHubRepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  license: {
    spdx_id: string;
  } | null;
  watchers_count: number;
  visibility: string;
}

interface GitHubRepoContextType {
  repo: GitHubRepoData;
}

const GitHubRepoContext = createContext<GitHubRepoContextType>({
  repo: {
    id: 0,
    name: "",
    full_name: "",
    description: null,
    html_url: "",
    stargazers_count: 0,
    forks_count: 0,
    language: null,
    topics: [],
    updated_at: "",
    owner: {
      login: "",
      avatar_url: "",
      html_url: "",
    },
    license: null,
    watchers_count: 0,
    visibility: "public",
  },
});

export type GitHubRepoHeaderProps = HTMLAttributes<HTMLDivElement>;

export function GitHubRepoHeader({
  className,
  children,
  ...props
}: GitHubRepoHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type GitHubRepoNameProps = HTMLAttributes<HTMLDivElement>;

export function GitHubRepoName({
  className,
  children,
  ...props
}: GitHubRepoNameProps) {
  const { repo } = useContext(GitHubRepoContext);

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <GithubIcon className="size-4 text-muted-foreground shrink-0" />
      <a
        href={repo.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-sm hover:underline hover:text-primary transition-colors"
      >
        {children ?? repo.full_name}
      </a>
      {repo.visibility && (
        <Badge variant="outline" className="text-xs capitalize">
          {repo.visibility}
        </Badge>
      )}
    </div>
  );
}

export type GitHubRepoDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function GitHubRepoDescription({
  className,
  children,
  ...props
}: GitHubRepoDescriptionProps) {
  const { repo } = useContext(GitHubRepoContext);

  if (!repo.description) {
    return null;
  }

  return (
    <p className={cn("mt-2 text-muted-foreground text-sm line-clamp-2", className)} {...props}>
      {children ?? repo.description}
    </p>
  );
}

export type GitHubRepoStatsProps = HTMLAttributes<HTMLDivElement>;

export function GitHubRepoStats({
  className,
  children,
  ...props
}: GitHubRepoStatsProps) {
  const { repo } = useContext(GitHubRepoContext);

  return (
    <div
      className={cn("flex items-center gap-4", className)}
      {...props}
    >
      {children ?? (
        <>
          {repo.language && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleIcon
                className="size-3 shrink-0"
                style={{
                  fill: languageColors[repo.language] || "#8b949e",
                  color: languageColors[repo.language] || "#8b949e",
                }}
              />
              <span>{repo.language}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <StarIcon className="size-3.5" />
            <span>{formatNumber(repo.stargazers_count)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <GitForkIcon className="size-3.5" />
            <span>{formatNumber(repo.forks_count)}</span>
          </div>
          {repo.watchers_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <EyeIcon className="size-3.5" />
              <span>{formatNumber(repo.watchers_count)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export type GitHubRepoTopicsProps = HTMLAttributes<HTMLDivElement>;

export function GitHubRepoTopics({
  className,
  children,
  ...props
}: GitHubRepoTopicsProps) {
  const { repo } = useContext(GitHubRepoContext);

  if (!repo.topics || repo.topics.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-wrap gap-1.5 mt-3", className)}
      {...props}
    >
      {children ?? repo.topics.slice(0, 6).map((topic) => (
        <Badge key={topic} variant="secondary" className="text-xs">
          {topic}
        </Badge>
      ))}
    </div>
  );
}

export type GitHubRepoOwnerProps = HTMLAttributes<HTMLDivElement>;

export function GitHubRepoOwner({
  className,
  children,
  ...props
}: GitHubRepoOwnerProps) {
  const { repo } = useContext(GitHubRepoContext);

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children ?? (
        <>
          <Avatar className="size-5">
            <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
            <AvatarFallback className="text-xs">
              {repo.owner.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <a
            href={repo.owner.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {repo.owner.login}
          </a>
        </>
      )}
    </div>
  );
}

export type GitHubRepoLicenseProps = HTMLAttributes<HTMLDivElement>;

export function GitHubRepoLicense({
  className,
  children,
  ...props
}: GitHubRepoLicenseProps) {
  const { repo } = useContext(GitHubRepoContext);

  if (!repo.license) {
    return null;
  }

  return (
    <div className={cn(className)} {...props}>
      {children ?? (
        <span className="text-xs text-muted-foreground">
          {repo.license.spdx_id === "NOASSERTION"
            ? "No license"
            : repo.license.spdx_id}
        </span>
      )}
    </div>
  );
}

export type GitHubRepoActionsProps = HTMLAttributes<HTMLDivElement>;

export function GitHubRepoActions({
  className,
  children,
  ...props
}: GitHubRepoActionsProps) {
  const { repo } = useContext(GitHubRepoContext);

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children ?? (
        <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLinkIcon className="size-3.5" />
            View on GitHub
          </a>
        </Button>
      )}
    </div>
  );
}

export type GitHubRepoProps = HTMLAttributes<HTMLDivElement> & {
  repo: GitHubRepoData;
};

// Format number with K, M suffixes
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return num.toString();
}

export function GitHubRepo({
  repo,
  className,
  children,
  ...props
}: GitHubRepoProps) {
  const contextValue = useMemo(() => ({ repo }), [repo]);

  return (
    <GitHubRepoContext.Provider value={contextValue}>
      <div
        className={cn(
          "rounded-lg border bg-background p-4 hover:border-primary/50 transition-colors",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <GitHubRepoHeader>
                  <GitHubRepoName />
                </GitHubRepoHeader>
                <GitHubRepoDescription />
              </div>
              <GitHubRepoActions />
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <GitHubRepoOwner />
              <GitHubRepoStats />
              <GitHubRepoLicense />
            </div>
            <GitHubRepoTopics />
          </>
        )}
      </div>
    </GitHubRepoContext.Provider>
  );
}

// Re-export for convenience
export { GitHubRepo as default };
