"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitTimestampProps = HTMLAttributes<HTMLTimeElement> & {
  date: Date;
};

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function formatRelativeDate(date: Date) {
  const days = Math.round(
    (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return relativeTimeFormat.format(days, "day");
}

export function CommitTimestamp({
  date,
  className,
  children,
  ...props
}: CommitTimestampProps) {
  const [formatted, setFormatted] = useState("");

  const updateFormatted = useCallback(() => {
    setFormatted(formatRelativeDate(date));
  }, [date]);

  useEffect(() => {
    updateFormatted();
  }, [updateFormatted]);

  return (
    <time
      className={cn("text-xs", className)}
      dateTime={date.toISOString()}
      {...props}
    >
      {children ?? formatted}
    </time>
  );
}
