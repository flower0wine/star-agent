import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ComponentProps } from "react";

export const CarouselApiContext = createContext<CarouselApi | undefined>(undefined);

export function useCarouselApi() {
  const context = useContext(CarouselApiContext);
  return context;
}

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>;

export function InlineCitationCarousel({
  className,
  children,
  ...props
}: InlineCitationCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <CarouselApiContext.Provider value={api}>
      <Carousel className={cn("w-full", className)} setApi={setApi} {...props}>
        {children}
      </Carousel>
    </CarouselApiContext.Provider>
  );
}

export type InlineCitationCarouselContentProps = ComponentProps<"div">;

export function InlineCitationCarouselContent(
  props: InlineCitationCarouselContentProps
) {
  return <CarouselContent {...props} />;
}

export type InlineCitationCarouselItemProps = ComponentProps<"div">;

export function InlineCitationCarouselItem({
  className,
  ...props
}: InlineCitationCarouselItemProps) {
  return (
    <CarouselItem
      className={cn("w-full space-y-2 p-4 pl-8", className)}
      {...props}
    />
  );
}

export type InlineCitationCarouselIndexProps = ComponentProps<"div">;

export function InlineCitationCarouselIndex({
  children,
  className,
  ...props
}: InlineCitationCarouselIndexProps) {
  const api = useCarouselApi();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const syncState = useCallback(() => {
    if (!api) {
      return;
    }
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
  }, [api]);

  useEffect(() => {
    if (!api) {
      return;
    }

    syncState();

    api.on("select", syncState);

    return () => {
      api.off("select", syncState);
    };
  }, [api, syncState]);

  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {children ?? `${current}/${count}`}
    </div>
  );
}
