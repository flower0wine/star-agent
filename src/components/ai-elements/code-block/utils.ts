import type { BundledLanguage, BundledTheme, HighlighterGeneric, ThemedToken } from "shiki";
import { createHighlighter } from "shiki";

import type { TokenizedCode } from "./types";

// Shiki uses bitflags for font styles: 1=italic, 2=bold, 4=underline
// oxlint-disable-next-line eslint(no-bitwise)
export const isItalic = (fontStyle: number | undefined) => fontStyle && fontStyle & 1;
// oxlint-disable-next-line eslint(no-bitwise)
export const isBold = (fontStyle: number | undefined) => fontStyle && fontStyle & 2;
export function isUnderline(fontStyle: number | undefined) {
  return fontStyle && fontStyle & 4;
}

// Transform tokens to include pre-computed keys to avoid noArrayIndexKey lint
export interface KeyedToken {
  token: ThemedToken;
  key: string;
}

export interface KeyedLine {
  tokens: KeyedToken[];
  key: string;
}

export function addKeysToTokens(lines: ThemedToken[][]): KeyedLine[] {
  return lines.map((line, lineIdx) => ({
    key: `line-${lineIdx}`,
    tokens: line.map((token, tokenIdx) => ({
      key: `line-${lineIdx}-${tokenIdx}`,
      token,
    })),
  }));
}

// Highlighter cache (singleton per language)
const highlighterCache = new Map<
  string,
  Promise<HighlighterGeneric<BundledLanguage, BundledTheme>>
>();

// Token cache
const tokensCache = new Map<string, TokenizedCode>();

// Subscribers for async token updates
const subscribers = new Map<string, Set<(result: TokenizedCode) => void>>();

export function getTokensCacheKey(code: string, language: BundledLanguage) {
  code = code ?? "";
  const start = code.slice(0, 100);
  const end = code.length > 100 ? code.slice(-100) : "";
  return `${language}:${code.length}:${start}:${end}`;
}

export async function getHighlighter(
  language: BundledLanguage
): Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> {
  const cached = highlighterCache.get(language);
  if (cached) {
    return cached;
  }

  const highlighterPromise = createHighlighter({
    langs: [language],
    themes: ["github-light", "github-dark"],
  });

  highlighterCache.set(language, highlighterPromise);
  return highlighterPromise;
}

// Create raw tokens for immediate display while highlighting loads
export function createRawTokens(code: string): TokenizedCode {
  const safeCode = code ?? "";
  return {
    bg: "transparent",
    fg: "inherit",
    tokens: safeCode.split("\n").map((line) =>
      line === ""
        ? []
        : [
            {
              color: "inherit",
              content: line,
            } as ThemedToken,
          ]
    ),
  };
}

// Synchronous highlight with callback for async results
export function highlightCode(
  code: string,
  language: BundledLanguage,
  // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-callbacks)
  callback?: (result: TokenizedCode) => void
): TokenizedCode | null {
  const tokensCacheKey = getTokensCacheKey(code, language);

  // Return cached result if available
  const cached = tokensCache.get(tokensCacheKey);
  if (cached) {
    return cached;
  }

  // Subscribe callback if provided
  if (callback) {
    if (!subscribers.has(tokensCacheKey)) {
      subscribers.set(tokensCacheKey, new Set());
    }
    subscribers.get(tokensCacheKey)?.add(callback);
  }

  // Start highlighting in background - fire-and-forget async pattern
  getHighlighter(language)
    // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-then)
    .then((highlighter) => {
      const availableLangs = highlighter.getLoadedLanguages();
      const langToUse = availableLangs.includes(language) ? language : "text";

      const result = highlighter.codeToTokens(code, {
        lang: langToUse,
        themes: {
          dark: "github-dark",
          light: "github-light",
        },
      });

      const tokenized: TokenizedCode = {
        bg: result.bg ?? "transparent",
        fg: result.fg ?? "inherit",
        tokens: result.tokens,
      };

      // Cache the result
      tokensCache.set(tokensCacheKey, tokenized);

      // Notify all subscribers
      const subs = subscribers.get(tokensCacheKey);
      if (subs) {
        for (const sub of subs) {
          sub(tokenized);
        }
        subscribers.delete(tokensCacheKey);
      }
    })
    // oxlint-disable-next-line eslint-plugin-promise(prefer-await-to-then), eslint-plugin-promise(prefer-await-to-callbacks)
    .catch((error) => {
      console.error("Failed to highlight code:", error);
      subscribers.delete(tokensCacheKey);
    });

  return null;
}
