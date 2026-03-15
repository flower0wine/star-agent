import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import type { ThemedToken } from "shiki";

import { isBold, isItalic, isUnderline } from "./utils";
import type { KeyedLine, KeyedToken } from "./utils";

// Token rendering component
export function TokenSpan({ token }: { token: ThemedToken }) {
  return (
    <span
      className="dark:!bg-[var(--shiki-dark-bg)] dark:!text-[var(--shiki-dark)]"
      style={
        {
          backgroundColor: token.bgColor,
          color: token.color,
          fontStyle: isItalic(token.fontStyle) ? "italic" : undefined,
          fontWeight: isBold(token.fontStyle) ? "bold" : undefined,
          textDecoration: isUnderline(token.fontStyle) ? "underline" : undefined,
          ...token.htmlStyle,
        } as CSSProperties
      }
    >
      {token.content}
    </span>
  );
}

// Line number styles using CSS counters
const LINE_NUMBER_CLASSES = cn(
  "block",
  "before:content-[counter(line)]",
  "before:inline-block",
  "before:[counter-increment:line]",
  "before:w-8",
  "before:mr-4",
  "before:text-right",
  "before:text-muted-foreground/50",
  "before:font-mono",
  "before:select-none"
);

// Line rendering component
export function LineSpan({
  keyedLine,
  showLineNumbers,
}: {
  keyedLine: KeyedLine;
  showLineNumbers: boolean;
}) {
  return (
    <span className={showLineNumbers ? LINE_NUMBER_CLASSES : "block"}>
      {keyedLine.tokens.length === 0
        ? "\n"
        : keyedLine.tokens.map(({ token, key }: KeyedToken) => (
            <TokenSpan key={key} token={token} />
          ))}
    </span>
  );
}
