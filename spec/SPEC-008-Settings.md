# SPEC-008: Settings & Theme Management Module

## 1. Module Overview

### 1.1 Purpose

Implement user settings management including theme (light/dark mode), AI model selection, and other preferences. This module integrates with the storage layer for persistence.

### 1.2 Scope

This module handles:
- Theme toggle (light/dark/system)
- Model selection
- Font size preferences
- Settings UI in sidebar
- Settings persistence via storage layer

This module does NOT handle:
- Layout structure (see SPEC-005)
- Storage implementation (see SPEC-007)
- Authentication (see SPEC-002)

---

## 2. Settings Structure

### 2.1 Settings Schema

```typescript
// src/types/settings.ts

interface AppSettings {
  // Appearance
  theme: Theme;
  fontSize: FontSize;
  
  // AI
  model: string;
  streamingEnabled: boolean;
  
  // Behavior
  sidebarExpanded: boolean;
  autoScroll: boolean;
  
  // Language
  language: string;
}

type Theme = "light" | "dark" | "system";
type FontSize = "sm" | "md" | "lg";
```

### 2.2 Default Values

```typescript
const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  fontSize: "md",
  model: "anthropic/claude-3.5-sonnet",
  streamingEnabled: true,
  sidebarExpanded: true,
  autoScroll: true,
  language: "en",
};
```

---

## 3. Theme Implementation

### 3.1 Theme Strategy

Use CSS variables for theming, managed via `class="dark"` on the `<html>` element.

**CSS Variables** (from globals.css):
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... more variables */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark variants */
}
```

### 3.2 Theme Hook

```typescript
// src/hooks/use-theme.ts

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  
  // Load theme from storage on mount
  useEffect(() => {
    const load = async () => {
      const settings = await settingsStorage.load();
      setThemeState(settings.theme);
      updateDocumentClass(settings.theme);
    };
    load();
  }, []);
  
  // Update document class and resolve theme
  function updateDocumentClass(theme: Theme) {
    const root = document.documentElement;
    
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
      setResolvedTheme(isDark ? "dark" : "light");
    } else {
      root.classList.toggle("dark", theme === "dark");
      setResolvedTheme(theme);
    }
  }
  
  // Set theme
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    updateDocumentClass(newTheme);
    await settingsStorage.set("theme", newTheme);
  }, []);
  
  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      updateDocumentClass("system");
    };
    
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);
  
  return { theme, resolvedTheme, setTheme };
}
```

### 3.3 Theme Toggle Component

```typescript
// src/components/settings/theme-toggle.tsx

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  const options = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "System", icon: MonitorIcon },
  ] as const;
  
  return (
    <div className="flex items-center gap-1 rounded-md bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            "flex items-center justify-center rounded-sm p-2 transition-colors",
            theme === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={option.label}
        >
          <option.icon className="size-4" />
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
```

---

## 4. Settings Panel

### 4.1 Settings Menu (Sidebar)

```typescript
// src/components/settings/settings-menu.tsx

export function SettingsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <SettingsIcon className="mr-2 size-4" />
          <span>Settings</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Theme */}
        <DropdownMenuLabel className="text-xs">Appearance</DropdownMenuLabel>
        <DropdownMenuItem>
          <ThemeToggle />
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Model */}
        <DropdownMenuLabel className="text-xs">AI Model</DropdownMenuLabel>
        <ModelSelector />
        
        <DropdownMenuSeparator />
        
        {/* About */}
        <DropdownMenuItem onClick={() => window.open("/about", "_blank")}>
          <InfoIcon className="mr-2 size-4" />
          <span>About</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Logout */}
        <DropdownMenuItem onClick={handleLogout}>
          <LogOutIcon className="mr-2 size-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 4.2 Expanded Settings View

For expanded sidebar, show inline settings:

```typescript
// src/components/settings/settings-section.tsx

export function SettingsSectionExpanded() {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Theme</Label>
        <ThemeToggle />
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Model</Label>
        <ModelSelector />
      </div>
      
      <Separator />
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-start"
        onClick={() => {/* Open about */}}
      >
        <InfoIcon className="mr-2 size-4" />
        About
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-start text-destructive"
        onClick={handleLogout}
      >
        <LogOutIcon className="mr-2 size-4" />
        Logout
      </Button>
    </div>
  );
}
```

---

## 5. Model Selection

### 5.1 Model Selector Component

```typescript
// src/components/settings/model-selector.tsx

const AVAILABLE_MODELS = [
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
];

export function ModelSelector() {
  const { settings, updateSettings } = useSettings();
  const currentModel = settings?.model ?? "anthropic/claude-3.5-sonnet";
  
  return (
    <Select
      value={currentModel}
      onValueChange={(value) => updateSettings({ model: value })}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## 6. State Management

### 6.1 Settings Store (Zustand)

```typescript
// src/stores/settings-store.ts

interface SettingsStore extends AppSettings {
  // Computed
  resolvedTheme: "light" | "dark";
  
  // Actions
  setTheme: (theme: Theme) => void;
  setModel: (model: string) => void;
  setFontSize: (size: FontSize) => void;
  setSidebarExpanded: (expanded: boolean) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state (will be hydrated from storage)
  theme: "system",
  fontSize: "md",
  model: "anthropic/claude-3.5-sonnet",
  streamingEnabled: true,
  sidebarExpanded: true,
  autoScroll: true,
  language: "en",
  resolvedTheme: "light",
  
  // Actions
  setTheme: async (theme) => {
    // Resolve system theme
    const resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    
    // Update document
    document.documentElement.classList.toggle("dark", resolved === "dark");
    
    set({ theme, resolvedTheme: resolved });
    await settingsStorage.set("theme", theme);
  },
  
  setModel: async (model) => {
    set({ model });
    await settingsStorage.set("model", model);
  },
  
  setFontSize: async (fontSize) => {
    set({ fontSize });
    await settingsStorage.set("fontSize", fontSize);
  },
  
  setSidebarExpanded: async (expanded) => {
    set({ sidebarExpanded: expanded });
    await settingsStorage.set("sidebarExpanded", expanded);
  },
  
  reset: async () => {
    set(DEFAULT_SETTINGS);
    await settingsStorage.reset();
  },
}));
```

---

## 7. Settings Persistence

### 7.1 Hydration on App Start

```typescript
// src/app/layout.tsx

export default function RootLayout({ children }) {
  const [hydrated, setHydrated] = useState(false);
  
  useEffect(() => {
    // Load settings from storage
    const hydrate = async () => {
      const settings = await settingsStorage.load();
      
      // Apply theme
      applyTheme(settings.theme);
      
      // Update store
      useSettingsStore.setState(settings);
      
      setHydrated(true);
    };
    
    hydrate();
  }, []);
  
  if (!hydrated) {
    return <LoadingScreen />;
  }
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
```

---

## 8. Accessibility

### 8.1 Keyboard Navigation

- `Tab` to navigate settings
- `Enter`/`Space` to activate
- `Escape` to close dropdowns

### 8.2 ARIA Attributes

```tsx
// Theme toggle
<ToggleGroup 
  aria-label="Theme"
  value={theme}
  onValueChange={(v) => setTheme(v as Theme)}
>
  <ToggleGroupItem value="light" aria-label="Light mode">
    <SunIcon />
  </ToggleGroupItem>
  {/* ... */}
</ToggleGroup>
```

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

- [ ] Theme toggles between light/dark/system
- [ ] System theme detection works
- [ ] Theme persists across page reloads
- [ ] Model selector works
- [ ] Settings accessible from sidebar
- [ ] Logout functionality works

### 9.2 UI Requirements

- [ ] Theme toggle shows current state
- [ ] Settings dropdown opens smoothly
- [ ] Theme transition is smooth (300ms)
- [ ] Icons clearly indicate options

### 9.3 Accessibility Requirements

- [ ] Keyboard navigable
- [ ] Screen reader announces changes
- [ ] Focus visible on all controls

---

## 10. File Checklist

```
src/
├── components/
│   └── settings/
│       ├── settings-menu.tsx       # Dropdown settings menu
│       ├── settings-section.tsx    # Inline settings (expanded)
│       ├── theme-toggle.tsx       # Theme switcher
│       ├── model-selector.tsx     # AI model picker
│       └── settings-button.tsx    # Settings button (collapsed)
│
├── hooks/
│   ├── use-theme.ts               # Theme hook
│   └── use-settings.ts            # Settings hook
│
├── stores/
│   └── settings-store.ts          # Zustand store
│
└── types/
    └── settings.ts                # Settings types
```

---

## 11. Theme Colors Reference

### 11.1 Shadcn Color Variables

Use these CSS variables (defined in globals.css):

| Variable | Light | Dark | Usage |
|----------|-------|------|-------|
| `--background` | oklch(1 0 0) | oklch(0.145 0 0) | Page background |
| `--foreground` | oklch(0.145 0 0) | oklch(0.985 0 0) | Primary text |
| `--primary` | oklch(0.205 0 0) | oklch(0.922 0 0) | Primary buttons |
| `--secondary` | oklch(0.97 0 0) | oklch(0.269 0 0) | Secondary elements |
| `--muted` | oklch(0.97 0 0) | oklch(0.269 0 0) | Muted backgrounds |
| `--accent` | oklch(0.97 0 0) | oklch(0.269 0 0) | Accent elements |
| `--border` | oklch(0.922 0 0) | oklch(1 0 0 / 10%) | Borders |

### 11.2 Usage in Components

```tsx
// Correct usage
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
  <div className="border-border">
    Content
  </div>
</div>

// Avoid hardcoded colors
// ❌ Don't use:
// className="bg-white dark:bg-black"
// className="text-gray-900"

// ✅ Do use:
// className="bg-background text-foreground"
```
