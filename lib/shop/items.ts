export type Item = { id: string; name: string; cents: number };

export const ITEMS: Item[] = [
  { id: "glasses", name: "Reading glasses, +2.00", cents: 1899 },
  { id: "pills", name: "Weekly pill organiser", cents: 1250 },
  { id: "batteries", name: "AA batteries, pack of 8", cents: 999 },
];

export function findItem(id: unknown): Item | undefined {
  return ITEMS.find((item) => item.id === id);
}

export function things(count: number): string {
  return `${count} ${count === 1 ? "thing" : "things"}`;
}
