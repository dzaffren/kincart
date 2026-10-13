"use client";

import { useSyncExternalStore } from "react";

const formats = {
  clock: { hour: "numeric", minute: "2-digit" },
  day: { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
} as const;

const noSubscription = () => () => {};

// The server runs in UTC, so the time is written once the phone's own time zone is known.
export function LocalTime({ at, format }: { at: Date; format: keyof typeof formats }) {
  const onPhone = useSyncExternalStore(noSubscription, () => true, () => false);
  return (
    <time dateTime={at.toISOString()}>{onPhone ? new Intl.DateTimeFormat("en-US", formats[format]).format(at) : ""}</time>
  );
}
