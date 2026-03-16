"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  StarIcon,
  GitForkIcon,
  ExternalLinkIcon,
  CalendarIcon,
  CodeIcon,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);

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
  license: { spdx_id: string } | null;
}

interface RepoCardProps {
  repo: GitHubRepoData;
  index?: number;
  className?: string;
}

const languageColors: Record<string, string> = {
  "JavaScript": "bg-yellow-400",
  "TypeScript": "bg-blue-400",
  "Python": "bg-green-400",
  "Java": "bg-orange-400",
  "Go": "bg-cyan-400",
  "Rust": "bg-red-400",
  "Ruby": "bg-red-500",
  "PHP": "bg-purple-400",
  "C++": "bg-pink-400",
  "C": "bg-gray-400",
  "Swift": "bg-orange-500",
  "Kotlin": "bg-purple-500",
  "Scala": "bg-red-600",
  "Shell": "bg-green-500",
  "HTML": "bg-orange-500",
  "CSS": "bg-blue-500",
  "Vue": "bg-green-600",
  "Dart": "bg-cyan-500",
};

function getLanguageColor(language: string | null): string {
  if (!language)
    return "bg-gray-400";
  return languageColors[language] || "bg-gray-400";
}

export function RepoCard({ repo, index = 0, className }: RepoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card className={cn("overflow-hidden transition-colors hover:bg-muted/50", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="size-6 flex-shrink-0">
                <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
                <AvatarFallback className="text-xs">
                  {repo.owner.login.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-base font-semibold truncate">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {repo.full_name}
                </a>
              </CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="size-8 flex-shrink-0" asChild>
              <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {repo.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {repo.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <StarIcon className="size-4 text-yellow-500" />
              <span>{repo.stargazers_count.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitForkIcon className="size-4" />
              <span>{repo.forks_count.toLocaleString()}</span>
            </div>
            {repo.language && (
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "size-3 rounded-full",
                    getLanguageColor(repo.language)
                  )}
                />
                <span>{repo.language}</span>
              </div>
            )}
          </div>

          {repo.topics.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-1">
                {repo.topics.slice(0, 8).map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
                {repo.topics.length > 8 && (
                  <Badge variant="secondary" className="text-xs">
                    +{repo.topics.length - 8}
                  </Badge>
                )}
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              <span>{dayjs(repo.updated_at).fromNow()}</span>
            </div>
            {repo.license && (
              <span className="truncate">{repo.license.spdx_id}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface RepoCardListProps {
  repos: GitHubRepoData[];
  className?: string;
}

export function RepoCardList({ repos, className }: RepoCardListProps) {
  if (repos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CodeIcon className="mx-auto size-8 mb-2 opacity-50" />
        <p>No repositories found</p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4", className)}>
      {repos.map((repo, index) => (
        <RepoCard key={repo.id} repo={repo} index={index} />
      ))}
    </div>
  );
}
