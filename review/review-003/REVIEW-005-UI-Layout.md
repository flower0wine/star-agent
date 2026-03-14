# SPEC-005-UI-Layout.md 审查报告

## 一、错误汇总

### TypeScript 错误 (2 个)

| 行号 | 错误描述 | 严重程度 |
|------|----------|----------|
| 36 | Cannot find name 'useLayoutStore' | 🟠 中 |
| 70 | Cannot find name 'useLayoutStore' | 🟠 中 |

### 错误文件
- `src/components/layout/main-layout.tsx`

---

## 二、问题分析

### 问题 1: useLayoutStore 缺失 (🟠 P1)

**问题描述**:  
`main-layout.tsx` 组件引用了 `useLayoutStore`，但该 store 在项目中不存在。

**当前代码**:
```typescript
// src/components/layout/main-layout.tsx
const isExpanded = useLayoutStore((state) => state.isExpanded); // ❌
const toggleSidebar = useLayoutStore((state) => state.toggleSidebar); // ❌
```

**SPEC-005 文档要求**:  
SPEC-005 在 "State Management" 部分定义了 LayoutStore 接口：

```typescript
interface LayoutStore {
  sidebarExpanded: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}
```

**实际项目状态**:  
- `src/stores/layout-store.ts` 文件存在
- 需要检查是否正确定义和导出 `useLayoutStore`

**修复建议**:

```typescript
// src/stores/layout-store.ts
import { create } from "zustand";

interface LayoutStore {
  sidebarExpanded: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  sidebarExpanded: true,
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
```

---

## 三、SPEC 文档一致性

### 3.1 文档 vs 实现对比

| SPEC-005 描述 | 实际实现 | 状态 |
|----------------|----------|------|
| 侧边栏展开/折叠 | 需验证 | ⚠️ |
| 状态持久化 | 需验证 | ⚠️ |
| 动画过渡 (300ms) | 需验证 | ⚠️ |
| 响应式断点 | 需验证 | ⚠️ |
| Keyboard 快捷键 | 需验证 | ⚠️ |
| useLayoutStore | **未正确定义** | ❌ |

### 3.2 组件文件检查

SPEC-005 要求的组件文件：

| 文件 | 状态 |
|------|------|
| `src/components/layout/main-layout.tsx` | ⚠️ 有错误 |
| `src/components/layout/sidebar/sidebar.tsx` | ✅ 存在 |
| `src/components/layout/sidebar/sidebar-header.tsx` | ✅ 存在 |
| `src/components/layout/sidebar/sidebar-conversations.tsx` | ✅ 存在 |
| `src/components/layout/sidebar/sidebar-footer.tsx` | ✅ 存在 |
| `src/stores/layout-store.ts` | ⚠️ 可能有问题 |

---

## 四、功能审查

### 4.1 侧边栏功能

| 功能 | 描述 | 状态 |
|------|------|------|
| 展开/折叠 | 280px / 64px 切换 | ⚠️ Store 错误 |
| 状态持久化 | 保存到 localStorage | 需验证 |
| 折叠按钮 | 点击切换 | 需验证 |
| 移动端抽屉 | overlay 模式 | 需验证 |

### 4.2 动画和过渡

SPEC-005 要求:
- 过渡时长: 300ms
- 缓动函数: cubic-bezier(0.4, 0, 0.2, 1)

**需验证**: 实现是否使用 motion 库或 CSS 过渡

---

## 五、总结

| 项目 | 状态 |
|------|------|
| 组件文件 | ✅ 大部分存在 |
| Layout Store | ❌ useLayoutStore 未正确定义 |
| TypeScript | ❌ 有错误 |
| 功能实现 | ⚠️ 待验证 |

**致命程度**: 🟠 中 - 侧边栏功能无法工作

**建议**: 检查并修复 `src/stores/layout-store.ts` 的定义，确保正确导出 `useLayoutStore` hook。
