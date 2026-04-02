import { useEffect, useMemo, useRef, useState } from "react";
import type { BundledLanguage } from "shiki";

import { CodeBlockBody } from "./code-block-body";
import {
  createRawTokens,
  highlightCode

} from "./utils";
import type { TokenizedCode } from "./types";

export function CodeBlockContent({
  code,
  language,
  showLineNumbers = false,
}: {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
}) {
  // Memoized raw tokens for immediate display
  const rawTokens = useMemo(() => createRawTokens(code), [code]);

  // Synchronous cache lookup — avoids setState in effect for cached results
  const syncTokens = useMemo(
    () => highlightCode(code, language) ?? rawTokens,
    [code, language, rawTokens]
  );

  // Async highlighting result (populated after shiki loads)
  const [asyncTokens, setAsyncTokens] = useState<TokenizedCode | null>(null);
  const asyncKeyRef = useRef({ code, language });

  useEffect(() => {
    if (
      asyncKeyRef.current.code !== code
      || asyncKeyRef.current.language !== language
    ) {
      asyncKeyRef.current = { code, language };
    }

    setAsyncTokens(null);

    let cancelled = false;

    highlightCode(code, language, (result) => {
      if (!cancelled) {
        setAsyncTokens(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code, language]);

  const tokenized = asyncTokens ?? syncTokens;

  return (
    <div className="relative overflow-auto">
      <CodeBlockBody showLineNumbers={showLineNumbers} tokenized={tokenized} />
    </div>
  );
}
