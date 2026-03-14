# SPEC-005: UI Layout Module

## 1. Module Overview

### 1.1 Purpose

Define the overall page layout structure including the collapsible sidebar and main content area. This specification covers the structural components that wrap the chat functionality.

### 1.2 Scope

This module handles:
- Main application layout wrapper
- Collapsible sidebar (left)
- Main content area (right)
- Header (optional)
- Responsive behavior
- Animation/transition

This module does NOT handle:
- Chat UI components (see SPEC-006)
- Authentication UI (see SPEC-002)
- Settings panel (see SPEC-008)

---

## 2. Layout Structure

### 2.1 Overall Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Container                           │
│  ┌──────────────┬────────────────────────────────────────────┐ │
│  │              │                                            │ │
│  │   Sidebar    │            Main Content                    │ │
│  │  (280px/64px)│           (flex-1)                          │ │
│  │              │                                            │ │
│  │  ┌─────────┐ │  ┌──────────────────────────────────────┐  │ │
│  │  │ New     │ │  │                                      │  │ │
│  │  │ Chat    │ │  │         Chat Panel /               │  │ │
│  │  ├─────────┤ │  │         Login Screen               │  │ │
│  │  │ History │ │  │                                      │  │ │
│  │  │ List    │ │  │                                      │  │ │
│  │  │         │ │  │                                      │  │ │
│  │  ├─────────┤ │  │                                      │  │ │
│  │  │ Settings│ │  │                                      │  │ │
│  │  │  Menu   │ │  └──────────────────────────────────────┘  │ │
│  │  └─────────┘ │                                            │ │
│  └──────────────┴────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Layout Dimensions

| State | Sidebar Width | Main Content | Total Min Width |
|-------|---------------|--------------|-----------------|
| Expanded | 280px | calc(100% - 280px) | 800px |
| Collapsed | 64px | calc(100% - 64px) | 584px |
| Mobile | 0px (overlay) | 100% | 320px |

### 2.3 Breakpoints

```css
/* Tailwind breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

**Responsive Behavior**:
- **Mobile (<768px)**: Sidebar as overlay drawer
- **Tablet (768-1024px)**: Collapsible sidebar
- **Desktop (>1024px)**: Expanded sidebar default

---

## 3. Sidebar Specification

### 3.1 Sidebar Structure

```
┌────────────────────────┐
│  Sidebar Header        │
│  ┌──────────────────┐  │
│  │ Logo + Title    │  │
│  │ Collapse Button │  │
│  └──────────────────┘  │
├────────────────────────┤
│                        │
│  Conversation Section  │
│  ┌──────────────────┐  │
│  │ New Chat Button  │  │
│  ├──────────────────┤  │
│  │ Conversation 1   │  │
│  │ Conversation 2   │  │
│  │ Conversation 3   │  │
│  │ ...              │  │
│  └──────────────────┘  │
│                        │
├────────────────────────┤
│                        │
│  Settings Section      │
│  ┌──────────────────┐  │
│  │ Theme Toggle     │  │
│  ├──────────────────┤  │
│  │ About            │  │
│  ├──────────────────┤  │
│  │ Logout           │  │
│  └──────────────────┘  │
└────────────────────────┘
```

### 3.2 Expanded State

**Width**: 280px
**Padding**: 16px
**Background**: `var(--sidebar)` (CSS variable)

**Components**:
1. **Sidebar Header**
   - App icon/logo (24x24)
   - App title: "Star Finder"
   - Collapse button (right-aligned)

2. **New Chat Button**
   - Full width
   - Icon: `PlusIcon` or `MessageSquarePlusIcon`
   - Text: "New Chat"
   - Variant: `default` or `outline`

3. **Conversation List**
   - Scrollable area
   - Each item shows:
     - Title (truncated to 1 line)
     - Last message preview (truncated)
     - Timestamp (relative, e.g., "2h ago")
   - Hover: Show delete action
   - Active: Highlighted background

4. **Settings Section**
   - Divider (Separator component)
   - Theme toggle (sun/moon icons)
   - About link
   - Logout button (if authenticated)

### 3.3 Collapsed State

**Width**: 64px
**Padding**: 12px

**Behavior**:
- Only show icons (no text)
- Tooltips on hover
- Smooth width transition (300ms)

**Tooltips**:
| Item | Tooltip Text |
|------|--------------|
| Collapse button | "Expand sidebar" |
| New Chat | "New Chat" |
| Conversation item | "{title}" |
| Theme toggle | "Toggle theme" |
| About | "About" |
| Logout | "Logout" |

### 3.4 Animation

```css
/* Sidebar transition */
.sidebar {
  transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Content margin transition */
.main-content {
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 4. Main Content Area

### 4.1 Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    Chat Header                          │  │
│   │   [Model Selector]  [Clear Chat]  [Download]           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                   Message Area                          │  │
│   │              (Scrollable, auto-scroll)                 │  │
│   │                                                         │  │
│   │   ┌─────────────────────────────────────────────────┐   │  │
│   │   │ User Message                                     │   │  │
│   │   └─────────────────────────────────────────────────┘   │  │
│   │                                                         │  │
│   │   ┌─────────────────────────────────────────────────┐   │  │
│   │   │ AI Message (with streaming)                    │   │  │
│   │   └─────────────────────────────────────────────────┘   │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                   Input Area                            │  │
│   │   ┌───────────────────────────────────────────────┐     │  │
│   │   │  [TextInput]                        [Send]    │     │  │
│   │   └───────────────────────────────────────────────┘     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Dimensions

- **Max Width**: 900px (centered)
- **Min Height**: 100vh
- **Padding**: 0 (edge-to-edge)
- **Message Area Padding**: 16px horizontal

### 4.3 Responsive Behavior

| Screen Size | Layout |
|-------------|--------|
| < 768px | Full width, no sidebar |
| >= 768px | Sidebar + main content |

---

## 5. Component Specifications

### 5.1 Main Layout Component

```typescript
// src/components/layout/main-layout.tsx

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function MainLayout({ children, sidebar }: MainLayoutProps) {
  // Use existing UI components
  // - ScrollArea from src/components/ui/scroll-area.tsx
  
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="sidebar">
        {sidebar}
      </aside>
      
      {/* Main Content */}
      <main className="main-content flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
```

### 5.2 Sidebar Component

```typescript
// src/components/layout/sidebar/sidebar.tsx

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-sidebar transition-all duration-300",
        isExpanded ? "w-[280px]" : "w-16"
      )}
    >
      <SidebarHeader isExpanded={isExpanded} onToggle={onToggle} />
      
      <ScrollArea className="flex-1">
        <SidebarConversations isExpanded={isExpanded} />
      </ScrollArea>
      
      <SidebarFooter isExpanded={isExpanded} />
    </aside>
  );
}
```

### 5.3 Sidebar Sections

```typescript
// Header
interface SidebarHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Conversations List
interface SidebarConversationsProps {
  isExpanded: boolean;
}

// Footer (Settings)
interface SidebarFooterProps {
  isExpanded: boolean;
}
```

---

## 6. State Management

### 6.1 Layout State

```typescript
// src/stores/layout-store.ts

interface LayoutStore {
  // Sidebar state
  sidebarExpanded: boolean;
  sidebarOpen: boolean;  // For mobile (drawer)
  
  // Actions
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}
```

### 6.2 Persistence

- Sidebar state saved to localStorage
- Key: `app_layout`
- Default: Expanded on desktop, collapsed on mobile

---

## 7. Accessibility

### 7.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + \` | Toggle sidebar |
| `Escape` | Close mobile sidebar |
| `Tab` | Navigate between items |
| `Enter` | Select item |

### 7.2 ARIA Attributes

```tsx
// Sidebar
<aside
  aria-label="Sidebar"
  aria-expanded={isExpanded}
  role="navigation"
>

// Toggle button
<button
  aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
  aria-controls="sidebar-content"
>
```

### 7.3 Focus Management

- Focus trap in mobile sidebar when open
- Return focus to trigger when closing
- Visible focus indicators

---

## 8. Animation Specifications

### 8.1 Transitions

| Property | Duration | Easing |
|----------|----------|--------|
| Sidebar width | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Sidebar transform | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Opacity fade | 200ms | ease-out |
| Hover states | 150ms | ease-in-out |

### 8.2 Motion Library

Use `motion` library from `motion` package (already installed):

```typescript
import { motion, AnimatePresence } from "motion/react";

// Sidebar animation
<motion.aside
  animate={{ width: isExpanded ? 280 : 64 }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
>
```

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

- [ ] Sidebar expands/collapses smoothly
- [ ] Sidebar state persists across page reloads
- [ ] Mobile: Sidebar opens as overlay drawer
- [ ] Keyboard shortcut toggles sidebar
- [ ] All sections (conversations, settings) visible when expanded

### 9.2 Visual Requirements

- [ ] Generous whitespace in expanded state
- [ ] Icons only in collapsed state
- [ ] Smooth 300ms transitions
- [ ] No layout shift during animation
- [ ] Consistent with shadcn/ui design

### 9.3 Responsive Requirements

- [ ] Mobile (<768px): Drawer overlay
- [ ] Tablet (768-1024px): Collapsible
- [ ] Desktop (>1024px): Expanded by default

### 9.4 Accessibility Requirements

- [ ] Keyboard navigable
- [ ] ARIA labels present
- [ ] Focus indicators visible
- [ ] Screen reader compatible

---

## 10. File Checklist

```
src/
├── components/
│   └── layout/
│       ├── main-layout.tsx        # Main layout wrapper
│       └── sidebar/
│           ├── sidebar.tsx        # Main sidebar component
│           ├── sidebar-header.tsx  # Header with logo & toggle
│           ├── sidebar-conversations.tsx  # Conversation list
│           ├── sidebar-conversation-item.tsx  # Single item
│           ├── sidebar-footer.tsx  # Settings section
│           └── sidebar-toggle.tsx  # Toggle button
│
├── hooks/
│   └── use-layout.ts              # Layout state hook
│
├── stores/
│   └── layout-store.ts            # Zustand layout store
│
└── app/
    └── page.tsx                   # Main page using layout
```

---

## 11. Dependencies

### 11.1 Existing Components to Use

From `src/components/ui/`:
- `button.tsx` - Buttons
- `scroll-area.tsx` - Scrollable areas
- `separator.tsx` - Section dividers
- `tooltip.tsx` - Hover tooltips
- `dropdown-menu.tsx` - Dropdown menus

From `src/components/ai-elements/`:
- `conversation.tsx` - For conversation display patterns

### 11.2 Icons

From `lucide-react`:
- `MenuIcon` - Mobile menu
- `PanelLeftCloseIcon` - Collapse
- `PanelLeftIcon` - Expand
- `PlusIcon` - New chat
- `SunIcon` - Light mode
- `MoonIcon` - Dark mode
- `InfoIcon` - About
- `LogOutIcon` - Logout
- `TrashIcon` - Delete
- `MessageSquarePlusIcon` - New chat
