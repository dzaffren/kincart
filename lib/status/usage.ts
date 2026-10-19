// Channel3's free tier is about 1,000 searches a month (find-limits O6). From 800, /status shows the month in red.
export const SEARCHES_A_MONTH = 1000;
export const SEARCHES_RED = 800;

export type Counts = { finds: number; searches: number; stoppedFinds: number; stoppedHouseholds: number };

export type UsageResult =
  | { state: "ok"; today: Counts; month: Counts }
  | { state: "not configured" }
  | { state: "not reachable"; reason: string };
