import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { Completion, CompletionContext } from "@codemirror/autocomplete";
import { autocompletion } from "@codemirror/autocomplete";
import { Decoration, EditorView, MatchDecorator, ViewPlugin, placeholder as cmPlaceholder } from "@codemirror/view";
import { BracesIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables?: string[];
  rows?: number;
  placeholder?: string;
  showVariableHint?: boolean;
}

function toPlaceholder(variable: string): string {
  return `{{${variable}}}`;
}

function createCompletionOption(variable: string): Completion {
  return {
    label: variable,
    detail: toPlaceholder(variable),
    type: "variable",
    apply: (view, _completion, from, to) => {
      const token = toPlaceholder(variable);
      view.dispatch({
        changes: { from, to, insert: token },
        selection: { anchor: from + token.length },
      });
    },
  };
}

function createTemplateCompletionSource(completionOptions: Completion[]) {
  return (context: CompletionContext) => {
    if (completionOptions.length === 0) {
      return null;
    }

    const match = context.matchBefore(/\{\{\s*[\w.-]*/);
    if (!match) {
      return null;
    }
    if (match.from === match.to && !context.explicit) {
      return null;
    }

    const query = match.text.replace(/^\{\{\s*/, "").toLowerCase();
    const filtered = query
      ? completionOptions.filter(option => option.label.toLowerCase().includes(query))
      : completionOptions;

    return {
      from: match.from,
      to: match.to,
      options: filtered,
      filter: false,
    };
  };
}

const templateVariableMatcher = new MatchDecorator({
  regexp: /\{\{\s*[\w.-]+\s*\}\}/g,
  decoration: Decoration.mark({ class: "cm-template-variable" }),
});

const templateVariableHighlight = ViewPlugin.fromClass(
  class {
    decorations;

    constructor(view: EditorView) {
      this.decorations = templateVariableMatcher.createDeco(view);
    }

    update(update: Parameters<typeof templateVariableMatcher.updateDeco>[0]) {
      this.decorations = templateVariableMatcher.updateDeco(update, this.decorations);
    }
  },
  {
    decorations: instance => instance.decorations,
  }
);

export function TemplateEditor({
  value,
  onChange,
  variables = [],
  rows = 4,
  placeholder,
  showVariableHint = true,
}: TemplateEditorProps) {
  const { resolvedTheme } = useTheme();
  const sortedVars = useMemo(() => [...new Set(variables)].sort(), [variables]);
  const completionOptions = useMemo(() => sortedVars.map(createCompletionOption), [sortedVars]);
  const editorExtensions = useMemo(
    () => [
      EditorView.lineWrapping,
      cmPlaceholder(placeholder || ""),
      autocompletion({
        activateOnTyping: true,
        closeOnBlur: true,
        icons: false,
        override: [createTemplateCompletionSource(completionOptions)],
      }),
      EditorView.theme({
        "&": {
          fontSize: "0.875rem",
          minHeight: `${Math.max(rows, 3) * 1.5}rem`,
          backgroundColor: "var(--background)!important",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          transition: "border-color .2s, box-shadow .2s",
        },
        "&.cm-focused": {
          outline: "none",
          borderColor: "var(--ring)",
          boxShadow: "0 0 0 1px var(--ring)",
        },
        ".cm-scroller": {
          fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          lineHeight: "1.6",
          backgroundColor: "var(--background)!important",
          borderRadius: "inherit",
        },
        ".cm-gutters": {
          backgroundColor: "var(--background)!important",
          borderRight: "none",
          borderRadius: "inherit",
        },
        ".cm-content": {
          padding: "0.625rem 0.75rem",
          caretColor: "var(--foreground)",
        },
        ".cm-tooltip": {
          zIndex: "60",
        },
        ".cm-tooltip.cm-tooltip-autocomplete": {
          border: "1px solid var(--border)",
          backgroundColor: "var(--popover)!important",
          color: "var(--popover-foreground)",
          borderRadius: "0.5rem",
          boxShadow: "0 12px 32px -16px color-mix(in oklch, var(--foreground) 30%, transparent)",
          overflow: "hidden",
          padding: "0.25rem",
        },
        ".cm-tooltip.cm-tooltip-autocomplete > ul": {
          padding: "0",
          margin: "0",
        },
        ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
          borderRadius: "0.375rem",
        },
        ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
          backgroundColor: "var(--accent)!important",
          color: "var(--accent-foreground)",
        },
        ".cm-template-variable": {
          color: "var(--primary)",
          fontWeight: "600",
          backgroundColor: "color-mix(in oklch, var(--primary) 14%, transparent)",
          borderRadius: "0.25rem",
          padding: "0 0.125rem",
        },
      }),
      templateVariableHighlight,
    ],
    [completionOptions, placeholder, rows]
  );

  return (
    <div className="space-y-2">
      {showVariableHint && sortedVars.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BracesIcon className="size-3.5" />
          输入 <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{`{{`}</span> 触发变量建议
        </div>
      )}
      <div className={cn("overflow-visible rounded-lg bg-background")}>
        <CodeMirror
          value={value}
          onChange={nextValue => onChange(nextValue)}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          extensions={editorExtensions}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
            highlightActiveLineGutter: false,
          }}
        />
      </div>
    </div>
  );
}

