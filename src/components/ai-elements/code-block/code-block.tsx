import { useMemo } from "react";

import { CodeBlockContent } from "./code-block-content";
import { CodeBlockContainer } from "./containers";
import { CodeBlockContext } from "./code-block-copy-button";
import type { CodeBlockProps } from "./types";

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const contextValue = useMemo(() => ({ code }), [code]);

  return (
    <CodeBlockContext.Provider value={contextValue}>
      <CodeBlockContainer className={className} language={language} {...props}>
        {children}
        <CodeBlockContent
          code={code}
          language={language}
          showLineNumbers={showLineNumbers}
        />
      </CodeBlockContainer>
    </CodeBlockContext.Provider>
  );
}
