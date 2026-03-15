"use client";

export function TokensWithCost({
  tokens,
  costText,
}: {
  tokens?: number;
  costText?: string;
}) {
  return (
    <span>
      {tokens === undefined
        ? "—"
        : new Intl.NumberFormat("en-US", {
            notation: "compact",
          }).format(tokens)}
      {costText ? (
        <span className="ml-2 text-muted-foreground">• {costText}</span>
      ) : null}
    </span>
  );
}
