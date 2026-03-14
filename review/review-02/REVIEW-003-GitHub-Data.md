# REVIEW-003: GitHub Data 模块分析

**规范参考**: SPEC-003  
**完成度**: 90% ✅  
**状态**: 优秀

---

## 1. 规范要求回顾

### 1.1 渐进式数据披露

| Level | 数据类型 | 实现状态 |
|-------|----------|----------|
| Level 1 | 基础信息 (name, description, topics, stars) | ✅ |
| Level 2 | 扩展元数据 (license, issues, branch) | ✅ |
| Level 3 | 内容 (README, package.json) | ✅ |

### 1.2 技术要求

- [x] 分页获取 starred repos
- [x] localStorage 缓存
- [x] 速率限制检测
- [x] 语言/星数过滤（部分）

---

## 2. 已实现文件

| 文件 | 路径 | 状态 |
|------|------|------|
| API 服务 | `src/lib/services/github-api.ts` | ✅ |
| React Hook | `src/hooks/use-github-api.tsx` | ✅ |
| 类型定义 | `src/types/github.ts` | ✅ |

---

## 3. 核心实现分析

### 3.1 分页获取 ✅

```typescript
// github-api.ts
async getStarredRepos(options: GetStarredReposOptions = {}): Promise<StarredResponse> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.github.com/user/starred?per_page=${perPage}&page=${page}`,
      { headers: this.getHeaders() }
    );
    
    // 使用 Link header 检测下一页
    hasMore = linkHeader?.includes('rel="next"') ?? false;
    page++;
  }
}
```

### 3.2 缓存策略 ✅

```typescript
// 缓存 TTL 设置
const CACHE_TTL = {
  STARRED_LIST: 60 * 60 * 1000,      // 1 小时
  REPO_DETAILS: 24 * 60 * 60 * 1000, // 24 小时
  README: 7 * 24 * 60 * 60 * 1000,   // 7 天
};
```

### 3.3 渐进式披露 ✅

| 方法 | Level | 用途 |
|------|-------|------|
| `getStarredRepos()` | 1 | 获取所有 starred repos 基础信息 |
| `getRepoDetails()` | 2 | 获取单个 repo 扩展信息 |
| `getReadme()` | 3 | 获取 README 内容 |

---

## 4. 🔴 关键问题：登录后未自动加载数据

### 4.1 问题描述

当前实现缺失：**用户登录后未自动获取其 starred repositories**

```typescript
// 问题: 登录成功后，没有触发 GitHub 数据加载
// github-auth.ts 中 login 成功后的回调
const handleCallback = async (code: string) => {
  // ... token 交换成功
  
  // ❌ 缺失: 获取 starred repos
  // await githubApi.getStarredRepos();
  
  // 应该跳转到首页或创建对话
  router.push("/");
};
```

### 4.2 影响

- 用户登录后无法立即使用 AI 搜索功能
- 需要手动触发数据加载
- 影响用户体验

### 4.3 建议修复

```typescript
// 在登录成功后添加数据加载
const handleCallback = async (code: string) => {
  // ... token 交换成功
  
  // 添加: 获取 starred repos 并缓存
  const githubApi = new GitHubApiService(token);
  const repos = await githubApi.getStarredRepos();
  
  // 保存到缓存
  const cache = new GitHubCache();
  await cache.setStarredRepos(repos);
  
  router.push("/");
};
```

---

## 5. 发现的其他问题

### 5.1 ⚠️ 搜索过滤参数部分实现

```typescript
// GitHub API Service - searchRepos 方法
async searchRepos(query: string, limit = 10): Promise<GitHubRepo[]> {
  const { data: repos } = await this.getStarredRepos();
  
  // 实现了基本文本搜索
  // 缺失: language 过滤
  // 缺失: minStars 过滤
  return repos
    .filter((repo) => {
      const nameMatch = repo.name.toLowerCase().includes(lowerQuery);
      // ...
    })
    .slice(0, limit);
}
```

**影响**: Agent 工具无法按语言/星数过滤仓库

### 5.2 缓存键命名 ✅

| SPEC 要求的键 | 实际使用的键 |
|---------------|--------------|
| `github_starred_repos` | `github_starred_repos` ✅ |
| `github_repo_{owner}_{repo}` | `github_repo_${owner}_${repo}` ✅ |
| `github_readme_{owner}_{repo}` | `github_readme_${owner}_${repo}` ✅ |

---

## 6. 错误处理

### 6.1 实现的错误类型 ✅

```typescript
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public code: "RATE_LIMITED" | "REPO_NOT_FOUND" | "README_TOO_LARGE" | "NETWORK_ERROR" | "AUTH_ERROR" | "UNKNOWN",
    public statusCode?: number
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}
```

### 6.2 速率限制处理 ✅

```typescript
if (response.status === 403) {
  const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
  if (rateLimitRemaining === "0") {
    throw new GitHubApiError("Rate limit exceeded", "RATE_LIMITED", 403);
  }
}
```

---

## 7. 总结

| 指标 | 评估 |
|------|------|
| 功能完整性 | 90% |
| 代码质量 | 95% |
| 缓存策略 | 95% |
| 渐进式披露 | 100% |
| 总体评分 | ✅ 优秀 |

**结论**: GitHub Data 模块实现优秀。唯一阻断性问题是登录后未自动加载数据，需要修复。

---

## 8. 优先级

| # | 问题 | 严重程度 | 优先级 |
|---|------|----------|--------|
| 1 | 登录后未自动加载 starred repos | 🔴 高 | P0 |
| 2 | searchRepos 缺少语言/星数过滤 | 🟡 中 | P1 |

---

*相关文件: [SPEC-003](../spec/SPEC-003-GitHub-Data.md)*
