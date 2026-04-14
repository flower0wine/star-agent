# UI Components Overview

This directory contains shadcn/ui base components built on Radix UI primitives with Tailwind CSS styling.

## Component Reference

| Component | Description |
|-----------|-------------|
| **accordion** | Collapsible panels for FAQ sections, content organization |
| **alert** | Contextual feedback messages, warnings, errors, success notifications |
| **alert-dialog** | Modal confirmation dialog for destructive actions |
| **aspect-ratio** | Maintains element aspect ratio for images/videos |
| **avatar** | User profile images with fallback initials support |
| **badge** | Small status indicators, labels, counts |
| **breadcrumb** | Navigation trail showing current location |
| **button** | Primary action trigger with multiple variants (default, outline, secondary, ghost, destructive, link) |
| **button-group** | Grouped buttons for related actions |
| **calendar** | Date picker calendar component |
| **card** | Content container with header, content, footer sections |
| **carousel** | Touch-friendly image/content slider |
| **chart** | Data visualization charts (line, bar, area, pie, etc.) |
| **checkbox** | Binary choice selection control |
| **collapsible** | Expandable/collapsible content sections |
| **combobox** | Autocomplete dropdown with search functionality |
| **command** | Command palette dialog for quick actions (⌘K style) |
| **context-menu** | Right-click context menu |
| **dialog** | Modal overlay for focused interactions |
| **direction** | RTL/LTR direction provider |
| **drawer** | Slide-out panel (mobile-friendly alternative to sheet) |
| **dropdown-menu** | Pop-up menu for actions, context menus |
| **empty** | Empty state placeholder |
| **field** | Form field wrapper with label, description, errors |
| **hover-card** | Preview cards that appear on hover |
| **input** | Text input field |
| **input-group** | Input with attached buttons/icons |
| **input-otp** | One-time password input with auto-complete |
| **item** | Reusable list item component |
| **kbd** | Keyboard key visual indicator |
| **label** | Form field label |
| **menubar** | Windows-style menu bar |
| **navigation-menu** | Full-featured navigation menu |
| **native-select** | Native browser select dropdown |
| **pagination** | Page navigation controls |
| **popover** | Floating content container anchored to trigger |
| **progress** | Linear progress indicator |
| **radio-group** | Single selection from multiple options |
| **resizable** | Resizable panel layout |
| **scroll-area** | Custom scrollbar container |
| **select** | Dropdown selection list |
| **separator** | Visual divider line |
| **sheet** | Slide-out side panel |
| **sidebar** | Collapsible navigation sidebar |
| **skeleton** | Loading placeholder with pulse animation |
| **slider** | Range slider control |
| **sonner** | Toast notifications (Sonner) |
| **spinner** | Loading indicator animation |
| **switch** | Toggle on/off control |
| **table** | Data table with rows and columns |
| **tabs** | Tabbed content navigation |
| **textarea** | Multi-line text input |
| **toggle** | Binary toggle button |
| **toggle-group** | Grouped toggle buttons |
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
- `recharts` - Chart components
- `sonner` - Toast notifications
- `date-fns` - Date manipulation (calendar)

---

**Purpose**: These are low-level building blocks. Higher-level components in `src/components/ai-elements/` compose these for specific AI application features.
