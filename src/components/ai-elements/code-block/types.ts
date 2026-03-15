import type { HTMLAttributes } from "react";

import type { BundledLanguage, BundledTheme, ThemedToken } from "shiki";

// Types
export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

export interface TokenizedCode {
  tokens: ThemedToken[][];
  fg: string;
  bg: string;
}

export interface CodeBlockContextType {
  code: string;
}
