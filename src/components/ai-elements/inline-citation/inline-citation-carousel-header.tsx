import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type InlineCitationCarouselHeaderProps = ComponentProps<"div">;

export function InlineCitationCarouselHeader({
  className,
  ...props
}: InlineCitationCarouselHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2",
        className
      )}
      {...props}
    />
  );
}
