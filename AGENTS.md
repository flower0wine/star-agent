# AGENTS.md - Agentic Coding Guidelines

This file provides context for AI agents operating in this repository.

## Project Overview

- **Framework**: Next.js 16.1.6 with React 19.2.3
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **AI Framework**: Vercel (AI SDK)
- **Package Manager**: bun

---

## Build / Lint / Test Commands

### Development
```bash
bun run dev        # Start development server (http://localhost:3000)
bun run lint       # Run ESLint
bun run lint:fix   # Auto-fix ESLint issues
```

**Important**: This project uses ESLint as the primary formatter. Prettier is disabled in VSCode settings. All formatting is handled via ESLint's auto-fix on save (`editor.codeActionsOnSave`).

### Testing
**No tests configured** - This project does not currently have a test framework set up.

---

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2017
- **Strict mode**: Enabled
- **JSX**: react-jsx
- **Module resolution**: bundler

### Import Conventions

**Path Aliases**:
- `@/*` maps to `./src/*`
- Example: `import { cn } from "@/lib/utils"`

**Import Order** (configured in .prettierrc):
1. Built-in Node modules (`<BUILTIN_MODULES>`)
2. Third-party modules (`<THIRD_PARTY_MODULES>`)
3. Alias imports (`^@(.*)$`)
4. Relative imports (`^[./]`)

**Group separation enabled** with sort specifiers.

### Naming Conventions

- **Components**: PascalCase (e.g., `Button`, `PromptInput`)
- **Files (components)**: kebab-case with component name (e.g., `prompt-input.tsx`)
- **Functions**: camelCase
- **Variables**: camelCase
- **Constants**: PascalCase or UPPER_SNAKE_CASE
- **Interfaces/Types**: PascalCase (with `I` prefix optional - prefer TypeScript native style)

### ESLint Configuration

The project uses `@antfu/eslint-config` with these stylistic settings:
```javascript
stylistic: {
  indent: 2,      // 2 spaces
  quotes: "double",
  semi: true,
}
```

**Notable relaxed rules**:
- `no-console`: Allowed (with warnings)
- Strict TypeScript rules relaxed (`no-unsafe-assignment`, `no-unsafe-member-access`, etc.)
- Import sorting disabled (perfectionist rules off)

### Formatting Rules (VSCode)

Configured in `.vscode/settings.json`:
- **Prettier disabled** - ESLint handles all formatting
- **Auto-fix on save**: Enabled for ESLint
- **Stylistic rules**: Silenced in IDE but auto-fixed on save

### Component Patterns

**UI Components** (shadcn/ui style):
- Use `cva` (class-variance-authority) for variant props
- Use `cn()` utility for class merging (from `@/lib/utils`)
- Follow `data-slot` pattern for polymorphic components

Example structure:
```tsx
import * as React from "react";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva("...", {
  variants: { variant: {...}, size: {...} },
  defaultVariants: { variant: "default", size: "default" },
});

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
export { buttonVariants };
```

### Error Handling

- Avoid empty catch blocks
- Use appropriate error types
- No strict enforcement (rules relaxed for prototyping)

### File Organization

```
src/
├── app/           # Next.js App Router pages
├── components/
│   ├── ui/       # shadcn/ui base components
│   └── ai-elements/  # AI-related UI components
├── lib/           # Utilities (utils.ts, etc.)
└── hooks/         # Custom React hooks
```

---

## IDE Recommendations

- **VS Code**: Uses settings in `.vscode/settings.json`
- ESLint extension required
- Auto-save formatting via ESLint (not Prettier)
- TypeScript strict mode warnings are informational

---

## Common Tasks

### Adding a new UI component
1. Use shadcn/ui CLI: `bunx shadcn@latest add [component-name]`
2. Component files go in `src/components/ui/`

### Adding a new AI element component
1. Create in `src/components/ai-elements/`
2. Follow naming: `kebab-case.tsx`

---

## Notes

- This is a prototype/starter project with relaxed linting rules
- Many strict TypeScript rules are disabled for faster development
- Console.log is allowed for debugging
- The bun tsc and bun lint commands must be requested for me to execute; otherwise, permission issues within the sandbox will lead to strange 'debug not found' errors and tsc errors.
