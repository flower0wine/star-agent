import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>;

export function InlineCitationCard(props: InlineCitationCardProps) {
  return <HoverCard closeDelay={0} openDelay={0} {...props} />;
}

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
};

export function InlineCitationCardTrigger({
  sources,
  className,
  ...props
}: InlineCitationCardTriggerProps) {
  return (
    <HoverCardTrigger asChild>
      <Badge
        className={cn("ml-1 rounded-full", className)}
        variant="secondary"
        {...props}
      >
        {sources[0] ? (
          <>
            {new URL(sources[0]).hostname}{" "}
            {sources.length > 1 && `+${sources.length - 1}`}
          </>
        ) : (
          "unknown"
        )}
      </Badge>
    </HoverCardTrigger>
  );
}

export type InlineCitationCardBodyProps = ComponentProps<"div">;

export function InlineCitationCardBody({
  className,
  ...props
}: InlineCitationCardBodyProps) {
  return (
    <HoverCardContent className={cn("relative w-80 p-0", className)} {...props} />
  );
}
