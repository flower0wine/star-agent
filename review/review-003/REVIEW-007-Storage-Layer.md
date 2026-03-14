# SPEC-007-Storage-Layer.md 审查报告

## 一、错误汇总

### TypeScript 错误 (1 个)

| 行号 | 错误描述 | 严重程度 |
|------|----------|----------|
| 14 | No exported member 'createStorageRepository' | 🔴 高 |

### 错误文件
- `src/lib/storage/index.ts`

---

## 二、致命问题分析

### 问题 1: 导出接口不匹配 (🔴 P0)

**问题描述**:  
`src/lib/storage/index.ts` 尝试导出 `createStorageRepository`，但实际模块只导出 `StorageRepository` 类。

**当前代码** (`src/lib/storage/index.ts`):
```typescript
// 第 14 行
export { StorageRepository, createStorageRepository } from "./storage"; // ❌
```

**实际导出** (`src/lib/storage/storage.ts`):
```typescript
// 只有这些导出
export interface StorageRepository<T> { ... }
export class LocalStorageRepository<T> implements StorageRepository<T> { ... }
```

**SPEC-007 文档定义**:
```typescript
// 文档中提到的工厂函数
export function createStorageRepository<T>(): StorageRepository<T> {
  return new LocalStorageRepository<T>();
}
```

**影响**: 
- 所有导入 `createStorageRepository` 的代码都会失败
- Storage 模块无法正常使用

**修复建议**:
```typescript
// src/lib/storage/index.ts
import { StorageRepository, LocalStorageRepository } from "./storage";

// 添加工厂函数或直接导出类
export function createStorageRepository<T>(): StorageRepository<T> {
  return new LocalStorageRepository<T>();
}

export { StorageRepository, LocalStorageRepository };
```

---

## 三、存储实现审查

### 3.1 实现的存储类

| 类 | 状态 | 描述 |
|------|------|------|
| `LocalStorageRepository` | ✅ 存在 | 基础存储实现 |
| `ConversationStorage` | ✅ 存在 | 对话存储 |
| `SettingsStorage` | ✅ 存在 | 设置存储 |
| `GitHubCache` | ✅ 存在 | GitHub 数据缓存 |

### 3.2 存储 key 审查

SPEC-007 定义的 key:

```typescript
const STORAGE_KEYS = {
  GITHUB_TOKEN: "github_access_token",
  GITHUB_USER: "github_user",
  CONVERSATIONS: "conversations",
  CONVERSATION_PREFIX: "conversation_",
  SETTINGS: "app_settings",
  STARRED_REPOS: "github_starred_repos",
  LAYOUT: "app_layout",
};
```

**需验证**: 实现中使用的 key 是否一致

---

## 四、数据类型审查

### 4.1 SPEC-007 定义的数据结构

| 类型 | 定义 | 状态 |
|------|------|------|
| `AppSettings` | theme, model, fontSize 等 | ✅ |
| `Conversation` | id, title, messages 等 | ✅ |
| `Message` | id, role, content 等 | ✅ |
| `CachedRepo` | data, cachedAt, expiresAt | ✅ |

### 4.2 TTL 配置

SPEC-007 要求的 TTL:

| 数据类型 | TTL |
|----------|-----|
| Starred repos | 1 hour |
| Repo details | 24 hours |
| README | 7 days |

**需验证**: 实现中 TTL 是否正确

---

## 五、错误处理审查

### 5.1 错误类型

SPEC-007 定义:
- `QUOTA_EXCEEDED` - 存储空间超限
- `NOT_AVAILABLE` - 存储不可用
- `PARSE_ERROR` - 数据解析错误

**需验证**: 实现是否包含这些错误处理

### 5.2 恢复机制

SPEC-007 提到:
- 数据备份和恢复
- 损坏数据处理

**需验证**: 实现是否完整

---

## 六、总结

| 项目 | 状态 |
|------|------|
| TypeScript 错误 | ❌ 1 个 (阻断性) |
| 存储实现 | ✅ 大部分完成 |
| 错误处理 | ⚠️ 待验证 |
| 数据一致性 | ⚠️ 待验证 |

**致命程度**: 🔴 高 - `createStorageRepository` 导出缺失导致模块无法使用

**建议**: 
1. 立即在 `src/lib/storage/index.ts` 添加 `createStorageRepository` 工厂函数
2. 验证所有存储 key 与 SPEC-007 定义一致
3. 验证 TTL 配置正确
