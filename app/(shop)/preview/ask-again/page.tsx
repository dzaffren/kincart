import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView, type Bought } from "../../RoseView";
import type { Group, Last, Option } from "../../../../lib/shop/find";
import type { Line } from "../../../../lib/shop/requests";
import "../approve-and-pay/preview.css";

// The photos are an empty image, so each shows the grey square a photo sits on while it loads.
const photo = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const option = (id: string, name: string, cents: number, shop: string, what: string, why: string, watch: string) => ({
  id,
  name,
  cents,
  shop,
  url: `https://www.${shop}/`,
  imageUrl: photo,
  what,
  why,
  watch,
});

const energizerName = "Energizer MAX AA Batteries, 8 Pack";
const energizer = (cents: number, shop: string): Option =>
  option("energizer-aa-8", energizerName, cents, shop, "8 AA batteries.", "Enough for a remote or two.", "Only 8 in the pack.");
const basics24 = option(
  "basics-aa-24",
  "Amazon Basics 24-Pack AA Alkaline Batteries",
  999,
  "amazon.com",
  "24 AA batteries.",
  "Enough for the remotes and clocks for a long while.",
  "They aren't rechargeable.",
);
const duracell16 = option(
  "duracell-aa-16",
  "Duracell Coppertop AA Batteries, 16 Pack",
  1449,
  "target.com",
  "16 AA batteries.",
  "They last a long time in everyday things.",
  "Fewer in the pack than the Amazon Basics, for more money.",
);
const basics8 = option(
  "basics-aa-8",
  "Amazon Basics AA Alkaline Batteries, 8 Pack",
  549,
  "amazon.com",
  "8 AA batteries.",
  "A plain pack for remotes and clocks.",
  "They aren't rechargeable.",
);
const rayovac8 = option(
  "rayovac-aa-8",
  "Rayovac High Energy AA Batteries, 8 Pack",
  649,
  "walmart.com",
  "8 AA batteries.",
  "Good for things that use power fast, such as a game controller.",
  "Only 8 in the pack.",
);
const duracell4 = option(
  "duracell-aa-4",
  "Duracell Coppertop AA Batteries, 4 Pack",
  579,
  "target.com",
  "4 AA batteries.",
  "Enough for one remote.",
  "Only 4 in the pack.",
);

const belkin = option(
  "belkin-20w",
  "Belkin 20W USB-C Wall Charger",
  1999,
  "target.com",
  "A wall plug for charging a phone.",
  "It charges most phones quickly.",
  "No cable in the box.",
);
const basicsCharger = option(
  "basics-20w",
  "Amazon Basics 20W USB-C Wall Charger",
  999,
  "amazon.com",
  "A small wall plug for charging a phone.",
  "It is small, so it leaves room at the socket next to it.",
  "No cable in the box.",
);

const lastEnergizer: Last = { id: "energizer-aa-8", cents: 899, shop: "walmart.com" };
const lastAnker: Last = { id: "anker-312-20w", cents: 1599, shop: "amazon.com" };

const line = (thing: string, id: string, name: string, cents: number, shop: string): Line => ({
  id,
  name,
  cents,
  shop,
  url: `https://www.${shop}/`,
  reason: "",
  thing,
});

const bought: Bought[] = [
  { id: 41, item: { id: "energizer-aa-8", name: energizerName, cents: 899 }, paidAt: new Date("2026-10-22T10:16:00") },
  {
    id: 38,
    item: { id: "basket", name: "2 things", cents: 2498 },
    lines: [
      line("AA batteries", "energizer-aa-8", energizerName, 899, "walmart.com"),
      line("a phone charger", "anker-312-20w", "Anker 312 USB C Charger, 20W", 1599, "amazon.com"),
    ],
    paidAt: new Date("2026-10-21T16:02:00"),
  },
  {
    id: 35,
    item: { id: "ge-night-light-2", name: "GE Plug-In LED Night Light, 2 Pack", cents: 798 },
    paidAt: new Date("2026-10-18T09:40:00"),
  },
];

const words = "AA batteries";
const rebuyBasket: Group[] = [
  { thing: "AA batteries", options: [energizer(899, "walmart.com"), basics24, duracell16], last: lastEnergizer },
  { thing: "a phone charger", options: [basicsCharger, belkin], last: lastAnker },
];

export default function AskAgainPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Ask again: every screen</h1>
        <p>
          Each frame is Rose&apos;s real page with fixed data. The listings are written examples. Grey squares stand in
          for listing photos. Sam&apos;s page doesn&apos;t change.
        </p>
      </header>

      <section className="preview-section">
        <h2>Bought before, on What do you need?</h2>
        <div className="frames">
          <Frame label="Three paid asks, newest first (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 2000, bought }} items={[]} />
          </Frame>
          <Frame label="Nothing paid yet: no Bought before (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 2000 }} items={[]} />
          </Frame>
          <Frame label="Stopped by the daily limit (scenario 5)">
            <RoseView
              state={{ kind: "ask", limitCents: 2000, problem: "limit", waitMinutes: 170, bought }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Ask again on one thing, limit $20</h2>
        <div className="frames">
          <Frame label="Same price (scenario 2)">
            <RoseView
              state={{
                kind: "options",
                limitCents: 2000,
                words,
                listings: [energizer(899, "walmart.com"), basics24, duracell16],
                last: lastEnergizer,
                picked: "energizer-aa-8",
              }}
              items={[]}
            />
          </Frame>
          <Frame label="A new price (scenario 2)">
            <RoseView
              state={{
                kind: "options",
                limitCents: 2000,
                words,
                listings: [energizer(949, "walmart.com"), basics24, duracell16],
                last: lastEnergizer,
                picked: "energizer-aa-8",
              }}
              items={[]}
            />
          </Frame>
          <Frame label="A new shop (scenario 2)">
            <RoseView
              state={{
                kind: "options",
                limitCents: 2000,
                words,
                listings: [energizer(899, "target.com"), basics24, duracell16],
                last: lastEnergizer,
                picked: "energizer-aa-8",
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Over Sam's limit now, limit $8 (scenario 3)">
            <RoseView
              state={{
                kind: "options",
                limitCents: 800,
                words,
                listings: [basics8, rayovac8, duracell4],
                last: { ...lastEnergizer, nowCents: 949 },
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Not in today's search (scenario 3)">
            <RoseView
              state={{
                kind: "options",
                limitCents: 2000,
                words,
                listings: [basics24, duracell16, rayovac8],
                last: lastEnergizer,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Today's search found nothing (scenario 3)">
            <RoseView
              state={{ kind: "ask", limitCents: 2000, words, problem: "nothing found", bought }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Ask again on a basket, limit $20</h2>
        <div className="frames">
          <Frame label="Only the 2 things Sam paid for (scenario 4)">
            <RoseView
              state={{
                kind: "basket",
                limitCents: 2000,
                words: "AA batteries and a phone charger",
                groups: rebuyBasket,
                picked: ["energizer-aa-8", undefined],
              }}
              items={[]}
            />
          </Frame>
        </div>
      </section>
    </main>
  );
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="frame">
      <figcaption>{label}</figcaption>
      {children}
    </figure>
  );
}
