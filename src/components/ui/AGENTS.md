# UI Components Overview

This directory contains shadcn/ui base components built on Radix UI primitives with Tailwind CSS styling.

## Component Reference

| Component | Description |
|-----------|-------------|
| **accordion** | Collapsible panels for FAQ sections, content organization |
| **alert** | Contextual feedback messages, warnings, errors, success notifications |
| **avatar** | User profile images with fallback initials support |
| **badge** | Small status indicators, labels, counts |
| **button** | Primary action trigger with multiple variants (default, outline, secondary, ghost, destructive, link) |
| **button-group** | Grouped buttons for related actions |
| **card** | Content container with header, content, footer sections |
| **carousel** | Touch-friendly image/content slider |
| **collapsible** | Expandable/collapsible content sections |
| **command** | Command palette dialog for quick actions (⌘K style) |
| **dialog** | Modal overlay for focused interactions |
| **dropdown-menu** | Pop-up menu for actions, context menus |
| **hover-card** | Preview cards that appear on hover |
| **input** | Text input field |
| **input-group** | Input with attached buttons/icons |
| **popover** | Floating content container anchored to trigger |
| **progress** | Linear progress indicator |
| **scroll-area** | Custom scrollbar container |
| **select** | Dropdown selection list |
| **separator** | Visual divider line |
| **spinner** | Loading indicator animation |
| **switch** | Toggle on/off control |
| **tabs** | Tabbed content navigation |
| **textarea** | Multi-line text input |
| **tooltip** | Floating text labels on hover |

## Architecture

- All components wrap Radix UI primitives
- Styled with Tailwind CSS v4
- Support `data-slot` pattern for polymorphism
- Use `cva` for variant management
- Use `cn()` utility for class merging

## File Naming

- Components: `kebab-case.tsx`
- Export: Named exports (e.g., `export function Button(...)`)

## Dependencies

- `radix-ui` - Unstyled UI primitives
- `class-variance-authority` - Variant props
- `tailwind-merge` - Class merging
- `lucide-react` - Icons

---

**Purpose**: These are low-level building blocks. Higher-level components in `src/components/ai-elements/` compose these for specific AI application features.
