import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import type { Group, Option } from "../../../../lib/shop/find";
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

const caneWords = "a walking stick that stands up by itself";
const canes: Option[] = [
  option(
    "cane-four",
    "Four Point Cane",
    2024,
    "lowes.com",
    "A walking stick with four small feet at the bottom.",
    "The feet hold it upright when you let go of it.",
    "Check that the height adjusts to suit you.",
  ),
  option(
    "cane-quad",
    "Small Base Aluminum Quad Cane",
    2389,
    "staples.com",
    "A light metal walking stick on a small four-footed base.",
    "It stands up by itself, and the small base fits on a stair.",
    "The small base is steadier on flat floors than on grass.",
  ),
  option(
    "cane-walgreens",
    "Walgreens Quad Cane Small Base",
    2499,
    "walgreens.com",
    "A walking stick on a four-footed base.",
    "It stands by your chair, so you don't bend down for it.",
    "It's heavier than a plain walking stick.",
  ),
];

const chairWords = "AA batteries, a folding shower chair";
const batteries: Option[] = [
  option("aa-8", "Energizer MAX AA Batteries, 8 Pack", 947, "walmart.com", "8 AA batteries.", "Enough for a remote or two.", "Only 8 in the pack."),
  option("aa-24", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "amazon.com", "24 AA batteries.", "Enough for the remotes and clocks for a long while.", "They aren't rechargeable."),
];
const chair = option(
  "chair-bench",
  "Folding Bath Seat Bench Shower Chair",
  4499,
  "bestbuy.com",
  "A bench seat for the shower that folds flat.",
  "You can sit while you wash, and fold it away after.",
  "Measure your shower or tub before you buy.",
);
const overGroups: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: "a folding shower chair", options: [chair], problem: "over limit" },
];
const triedGroups: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: "a folding shower chair", options: [chair], problem: "over limit", tried: true },
];

const lineOf = (thing: string, { id, name, cents, shop, url, why, watch, imageUrl }: Option): Line => ({
  id,
  name,
  cents,
  shop,
  url,
  reason: why,
  watch,
  imageUrl,
  thing,
});
const lines = [lineOf("AA batteries", batteries[0]), lineOf("a folding shower chair", chair)];
const basket = { id: "basket", name: "2 things", cents: 5446 };
const askedAt = new Date("2026-10-23T10:12:00");

const cane = canes[1];
const caneSource = { shop: cane.shop, url: cane.url, reason: cane.why, watch: cane.watch, imageUrl: cane.imageUrl };
const limit = { cents: 2000 };

export default function AllowOverLimitPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Allow over limit: every screen</h1>
        <p>
          Each frame is Rose&apos;s or Sam&apos;s real page with fixed data. The canes and the shower chair are real
          Channel3 listings from 2026-10-23, with written explanations. Grey squares stand in for listing photos.
        </p>
      </header>

      <section className="preview-section">
        <h2>Rose: one thing over the limit</h2>
        <div className="frames">
          <Frame label="Nothing under $20, three canes over it (scenario 1)">
            <RoseView state={{ kind: "options", limitCents: 2000, words: caneWords, listings: canes }} items={[]} />
          </Frame>
          <Frame label="Ask Sam with nothing picked">
            <RoseView
              state={{ kind: "options", limitCents: 2000, words: caneWords, listings: canes, error: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Asking Sam for the $23.89 cane">
            <RoseView
              state={{ kind: "options", limitCents: 2000, words: caneWords, listings: canes, picked: "cane-quad", busy: true }}
              items={[]}
            />
          </Frame>
          <Frame label="After Find another, still over $20">
            <RoseView
              state={{ kind: "options", limitCents: 2000, words: caneWords, listings: canes, tried: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Sam raised the limit to $24 since">
            <RoseView state={{ kind: "options", limitCents: 2400, words: caneWords, listings: canes }} items={[]} />
          </Frame>
          <Frame label="Stopped by Sam's $20 total limit (scenario 5)">
            <RoseView
              state={{
                kind: "options",
                limitCents: 2000,
                totalCents: 2000,
                words: caneWords,
                listings: canes,
                picked: "cane-quad",
                overCents: 2389,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Nothing within $40, as today (scenario 4)">
            <RoseView
              state={{ kind: "ask", limitCents: 2000, words: "a folding shower chair", problem: "over limit" }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Rose: a basket with one thing over the limit</h2>
        <div className="frames">
          <Frame label="The shower chair is over $30 (scenario 3)">
            <RoseView
              state={{ kind: "basket", limitCents: 3000, words: chairWords, groups: overGroups, picked: ["aa-8"] }}
              items={[]}
            />
          </Frame>
          <Frame label="After its Find another, still over $30">
            <RoseView
              state={{
                kind: "basket",
                limitCents: 3000,
                words: chairWords,
                groups: triedGroups,
                picked: ["aa-8", "chair-bench"],
              }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam</h2>
        <div className="frames">
          <Frame label="The $23.89 cane, over the $20 limit (scenario 2)">
            <SamView
              state={{ kind: "request", item: cane, askedAt, found: caneSource, limitCents: 2000 }}
              limit={limit}
            />
          </Frame>
          <Frame label="Paying for the cane">
            <SamView
              state={{ kind: "request", item: cane, askedAt, found: caneSource, limitCents: 2000, busy: true }}
              limit={limit}
            />
          </Frame>
          <Frame label="A basket with the chair over $30 (scenario 3)">
            <SamView state={{ kind: "request", item: basket, askedAt, lines, limitCents: 3000 }} limit={{ cents: 3000 }} />
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
