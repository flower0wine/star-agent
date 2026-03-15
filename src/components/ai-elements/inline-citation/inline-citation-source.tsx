import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type InlineCitationSourceProps = ComponentProps<"div"> & {
  title?: string;
  url?: string;
  description?: string;
};

export function InlineCitationSource({
  title,
  url,
  description,
  className,
  children,
  ...props
}: InlineCitationSourceProps) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {title && (
        <h4 className="truncate font-medium text-sm leading-tight">{title}</h4>
      )}
      {url && (
        <p className="truncate break-all text-muted-foreground text-xs">{url}</p>
      )}
      {description && (
        <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
