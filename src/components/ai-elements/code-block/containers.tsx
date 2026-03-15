import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function CodeBlockContainer({
  className,
  language,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { language: string }) {
  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
        className
      )}
      data-language={language}
      style={{
        containIntrinsicSize: "auto 200px",
        contentVisibility: "auto",
        ...style,
      }}
      {...props}
    />
  );
}

export function CodeBlockHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b bg-muted/80 px-3 py-2 text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CodeBlockTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export function CodeBlockFilename({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("font-mono", className)} {...props}>
      {children}
    </span>
  );
}

export function CodeBlockActions({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-my-1 -mr-1 flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
