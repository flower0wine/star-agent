import dayjs from "dayjs";

export function formatTokenNumber(value?: number) {
  if (!value && value !== 0) {
    return "-";
  }

  return value.toLocaleString("en-US");
}

export function formatUsdPerMillion(value?: number) {
  if (!value && value !== 0) {
    return "-";
  }

  return `$${value.toFixed(3)}/1M`;
}

export function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }

  return parsed.format("YYYY-MM-DD");
}
