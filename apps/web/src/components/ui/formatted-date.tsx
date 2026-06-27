"use client";

import { useFormatDate } from "@/hooks/use-format-date";

export function FormattedDate({ date }: { date: Date | string }) {
  const formatDate = useFormatDate();
  return <>{formatDate(date)}</>;
}
