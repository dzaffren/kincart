import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BasketAnswer } from "../../BasketAnswer";
import { RoseView, type Group } from "../../RoseView";
import { SamView } from "../../SamView";
import type { Option } from "../../../../lib/shop/find";
import type { Line, Receipt } from "../../ui";
import "../approve-and-pay/preview.css";

// The photos are an empty image, so each shows the grey square a photo sits on while it loads.
const photo = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const words = "AA batteries, a night light and a phone charger";

const batteries: Option[] = [
  {
    id: "aa-24",
    name: "Amazon Basics 24-Pack AA Alkaline Batteries",
    cents: 999,
    shop: "amazon.com",
    url: "https://www.amazon.com/",
    imageUrl: photo,
    what: "A box of 24 AA batteries.",
    why: "Enough for the remotes and clocks for a long while.",
    watch: "They aren't rechargeable.",
  },
  {
    id: "aa-16",
    name: "Energizer MAX AA Batteries, 16 Count",
    cents: 1449,
    shop: "walmart.com",
    url: "https://www.walmart.com/",
    imageUrl: photo,
    what: "16 AA batteries from a well-known brand.",
    why: "They last a long time in everyday things like remotes.",
    watch: "Fewer in the pack than the first, for more money.",
  },
  {
    id: "aa-8",
    name: "Duracell Coppertop AA Batteries, 8 Pack",
    cents: 879,
    shop: "target.com",
    url: "https://www.target.com/",
    what: "8 AA batteries.",
    why: "The cheapest of the three, and enough for a remote or two.",
    watch: "Only 8, so you may need more soon.",
  },
];

const nightLights: Option[] = [
  {
    id: "light-plug",
    name: "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack",
    cents: 1249,
    shop: "target.com",
    url: "https://www.target.com/",
    imageUrl: photo,
    what: "Two small lights that plug into a wall socket.",
    why: "They come on by themselves when it gets dark, so there's no switch to find at night.",
    watch: "Each one covers the socket it's plugged into.",
  },
  {
    id: "light-motion",
    name: "Motion Sensor Stick-On Night Light, Battery Powered",
    cents: 1699,
    shop: "amazon.com",
    url: "https://www.amazon.com/",
    imageUrl: photo,
    what: "A light you stick on the wall that runs on batteries.",
    why: "It lights up when you walk past, which helps on the way to the bathroom.",
    watch: "It needs 3 AAA batteries, which aren't included.",
  },
];

const chargers: Option[] = [
  {
    id: "charger-anker",
    name: "Anker USB-C Wall Charger with 6 ft Cable",
    cents: 1599,
    shop: "amazon.com",
    url: "https://www.amazon.com/",
    imageUrl: photo,
    what: "A wall plug with a long charging cable.",
    why: "The long cable reaches from the socket to a bedside table.",
    watch: "Check that your phone takes a USB-C cable.",
  },
  {
    id: "charger-apple",
    name: "Apple 20W USB-C Power Adapter",
    cents: 1900,
    shop: "walmart.com",
    url: "https://www.walmart.com/",
    imageUrl: photo,
    what: "A wall plug for charging an iPhone.",
    why: "It charges an iPhone quickly.",
    watch: "No cable in the box; it needs a USB-C cable.",
  },
];

const groups: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: "a night light", options: nightLights },
  { thing: "a phone charger", options: chargers },
];

const mixedWords = "AA batteries, a tablet for video calls and a left-handed teapot for a cat";
const mixed: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: "a tablet for video calls", options: [], problem: "over limit" },
  { thing: "a left-handed teapot for a cat", options: [], problem: "nothing found" },
];

const lineOf = (thing: string, { id, name, cents, shop, url, why }: Option): Line => ({
  id,
  name,
  cents,
  shop,
  url,
  reason: why,
  thing,
});
const lines = [lineOf("AA batteries", batteries[0]), lineOf("a night light", nightLights[0])];
const basket = { id: "basket", name: "2 things", cents: 2248 };
const askedAt = new Date("2026-10-20T10:15:00");
const receipt: Receipt = {
  item: basket,
  lines,
  paidAt: new Date("2026-10-20T10:16:00"),
  transactionId: "7KT20419UA331082M",
};
const trimmed: Receipt = { ...receipt, item: { ...basket, cents: 999 }, lines: [lines[0]], leftOut: ["a night light"] };
const limit = { cents: 5000 };

export default function BasketPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Basket: every screen</h1>
        <p>
          Each frame is the real component with fixed data. The listings are written examples until real search
          results replace them at /build. Grey squares stand in for listing photos; some listings have none.
        </p>
      </header>

      <section className="preview-section">
        <h2>Rose&apos;s phone</h2>
        <div className="frames">
          <Frame label="Asking, with the new hint">
            <RoseView state={{ kind: "ask", limitCents: 5000 }} items={[]} />
          </Frame>
          <Frame label="Looking (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 5000, words, busy: true }} items={[]} />
          </Frame>
          <Frame label="Three groups (scenario 1)">
            <RoseView state={{ kind: "basket", limitCents: 5000, words, groups }} items={[]} />
          </Frame>
          <Frame label="Two picked, the charger left out (scenario 2)">
            <RoseView
              state={{ kind: "basket", limitCents: 5000, words, groups, picked: ["aa-24", "light-plug"] }}
              items={[]}
            />
          </Frame>
          <Frame label="Tapped Ask Sam with no pick (O2)">
            <RoseView state={{ kind: "basket", limitCents: 5000, words, groups, error: true }} items={[]} />
          </Frame>
          <Frame label="Asking Sam (scenario 2)">
            <RoseView
              state={{ kind: "basket", limitCents: 5000, words, groups, picked: ["aa-24", "light-plug"], busy: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Some can't be shown, limit $30 (scenario 3)">
            <RoseView state={{ kind: "basket", limitCents: 3000, words: mixedWords, groups: mixed }} items={[]} />
          </Frame>
          <Frame label="More than five things (scenario 4)">
            <RoseView
              state={{
                kind: "ask",
                limitCents: 5000,
                words: "batteries, a night light, a phone charger, a doormat, a kettle and a flashlight",
                problem: "too many",
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Waiting for Sam (scenario 2)">
            <RoseView state={{ kind: "waiting", item: basket, askedAt, lines }} items={[]} />
          </Frame>
          <Frame label="Paid for all (scenario 5)">
            <RoseView state={{ kind: "paid", receipt }} items={[]} />
          </Frame>
          <Frame label="Paid, the night light left out (scenario 2)">
            <RoseView state={{ kind: "paid", receipt: trimmed }} items={[]} />
          </Frame>
          <Frame label="Ask for something else: the night light is back (scenario 2)">
            <RoseView state={{ kind: "ask", limitCents: 5000, words: "a night light" }} items={[]} />
          </Frame>
          <Frame label="Sam said no (scenario 5)">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, outcome: { kind: "declined", item: basket, lines } }}
              items={[]}
            />
          </Frame>
          <Frame label="Payment didn't go through">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, outcome: { kind: "failed", item: basket, lines } }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam&apos;s phone</h2>
        <div className="frames">
          <Frame label="Rose asks for 2 things, both ticked (scenario 2)">
            <SamView state={{ kind: "request", item: basket, askedAt, lines }} />
          </Frame>
          <Frame label="Night light unticked (scenario 2)">
            <div className="screen">
              <BasketAnswer lines={lines} askedAt={askedAt} unticked={["light-plug"]} />
            </div>
          </Frame>
          <Frame label="Both unticked (O11)">
            <div className="screen">
              <BasketAnswer lines={lines} askedAt={askedAt} unticked={["aa-24", "light-plug"]} />
            </div>
          </Frame>
          <Frame label="Paying for the batteries">
            <div className="screen">
              <BasketAnswer lines={lines} askedAt={askedAt} unticked={["light-plug"]} busy />
            </div>
          </Frame>
          <Frame label="Paid for all (scenario 5)">
            <SamView state={{ kind: "paid", receipt }} limit={limit} />
          </Frame>
          <Frame label="Paid, the night light left out (scenario 2)">
            <SamView state={{ kind: "paid", receipt: trimmed }} limit={limit} />
          </Frame>
          <Frame label="Said no (scenario 5)">
            <SamView state={{ kind: "nothing", declined: basket, lines }} limit={limit} />
          </Frame>
          <Frame label="Payment didn't go through">
            <SamView state={{ kind: "failed", item: basket, lines }} limit={limit} />
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
