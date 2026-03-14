# SPEC-003-GitHub-Data.md 审查报告

## 一、错误汇总

### TypeScript 错误 (10 个)

| 行号 | 错误描述 | 严重程度 |
|------|----------|----------|
| 140 | 'GitHubApiError' cannot be used as a value because it was imported using 'import type' | 🔴 高 |
| 146 | 同上 | 🔴 高 |
| 151 | 同上 | 🔴 高 |
| 218 | 同上 | 🔴 高 |
| 222 | 同上 | 🔴 高 |
| 226 | 同上 | 🔴 高 |
| 279 | 同上 | 🔴 高 |
| 283 | 同上 | 🔴 高 |
| 300 | 同上 | 🔴 高 |
| 442 | 同上 | 🔴 高 |

### 错误文件
- `src/lib/services/github-api.ts`

---

## 二、致命问题分析

### 问题 1: GitHubApiError 类导入方式错误 (🔴 P0)

**问题描述**:  
在 `github-api.ts` 中使用 `import type { GitHubApiError }` 导入 Error 类，然后尝试将其作为构造函数使用 (`new GitHubApiError()`)，导致编译错误。

**错误代码**:
```typescript
// 第 1 行或其他位置
import type { GitHubApiError } from "./types"; // ❌ 使用 import type

// 第 140, 146, 151, 218, 222, 226, 279, 283, 300, 442 行
throw new GitHubApiError(...); // ❌ 运行时错误 - 无法构造
```

**影响**:
- 所有 GitHub API 错误处理都会在运行时失败
- 无法正确捕获和处理 API 错误
- 用户无法看到有意义的错误信息

**根本原因**:  
TypeScript 中 `import type` 只导入类型信息，不导入值，因此无法使用 `new` 构造一个仅通过 type 导入的类。

**修复建议**:
```typescript
// 改为 import (值导入)
import { GitHubApiError } from "./types"; // ✅

// 或者如果 GitHubApiError 是 Error 的子类，可以这样使用
throw new Error("message"); // 临时替代
```

---

### 问题 2: Rate Limit 处理不完整

**SPEC-003 文档描述**:
```typescript
interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
  used: number;
}
```

**实际情况**: 需验证实现是否完整

---

## 三、SPEC 文档一致性

### 3.1 文档 vs 实现对比

| SPEC-003 描述 | 实际实现 | 状态 |
|----------------|----------|------|
| Progressive Disclosure 策略 | 需验证 | ⚠️ |
| 分页获取 starred repos | 需验证 | ⚠️ |
| 缓存策略 (TTL) | 需验证 | ⚠️ |
| Rate Limit 处理 | 需验证 | ⚠️ |
| Error 处理类 | **导入错误** | ❌ |

### 3.2 缺失的实现

根据 SPEC-003，以下功能需要检查：

1. **README Base64 解码** - 需验证 GitHub 返回的 README 是 base64 编码
2. **语言统计** - `language_breakdown` 字段实现
3. **批量请求队列** - 接近限制时的请求队列

---

## 四、缓存策略审查

### 4.1 SPEC-003 要求的缓存 TTL

| 数据类型 | TTL |
|----------|-----|
| Starred list | 1 hour |
| Repo details | 24 hours |
| README content | 7 days |

**需验证**: 实现中的 TTL 是否与文档一致

### 4.2 缓存 key 命名

**SPEC-003 定义**:
```typescript
const CACHE_KEYS = {
  STARRED_REPOS: "github_starred_repos",
  REPO_PREFIX: "github_repo_",
  README_PREFIX: "github_readme_",
};
```

**需验证**: 实现是否使用相同的 key

---

## 五、总结

| 项目 | 状态 |
|------|------|
| API 基础功能 | ⚠️ 待验证 |
| 错误处理 | ❌ 导入错误 |
| TypeScript 类型 | ❌ 有错误 |
| 缓存策略 | ⚠️ 待验证 |

**致命程度**: 🔴 高 - 错误处理完全不可用，所有 API 错误都会导致运行时异常

**建议**: 立即修复 GitHubApiError 的导入方式，这是阻断性问题。
