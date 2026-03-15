import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useCallback, useContext } from "react";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { CarouselApiContext } from "./inline-citation-carousel";

export type InlineCitationCarouselPrevProps = ComponentProps<"button">;

export function InlineCitationCarouselPrev({
  className,
  ...props
}: InlineCitationCarouselPrevProps) {
  const api = useContext(CarouselApiContext);

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollPrev();
    }
  }, [api]);

  return (
    <button
      aria-label="Previous"
      className={cn("shrink-0", className)}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ArrowLeftIcon className="size-4 text-muted-foreground" />
    </button>
  );
}

export type InlineCitationCarouselNextProps = ComponentProps<"button">;

export function InlineCitationCarouselNext({
  className,
  ...props
}: InlineCitationCarouselNextProps) {
  const api = useContext(CarouselApiContext);

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollNext();
    }
  }, [api]);

  return (
    <button
      aria-label="Next"
      className={cn("shrink-0", className)}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ArrowRightIcon className="size-4 text-muted-foreground" />
    </button>
  );
}
