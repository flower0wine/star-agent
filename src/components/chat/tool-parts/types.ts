export interface RepoToolData {
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
  watchers_count: number;
  visibility: string;
}

export interface DisplayRepositoriesOutput {
  state: "loading" | "partial" | "complete";
  repos?: RepoToolData[];
  loaded?: number;
  total?: number;
  message?: string;
  __duration?: number;
}

export interface PatentPerson {
  name?: string;
}

export interface PatentItem {
  patentId?: string;
  title?: string;
  abstract?: string;
  patentDate?: string;
  applicationDate?: string;
  assignees?: PatentPerson[];
  inventors?: PatentPerson[];
  sourceUrl?: string;
}

export interface SearchPatentsTimeRange {
  fromDate?: string;
  toDate?: string;
}

export interface SearchPatentsOutput {
  provider?: string;
  count?: number;
  totalHits?: number;
  timeRange?: SearchPatentsTimeRange;
  patents?: PatentItem[];
}
