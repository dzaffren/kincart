import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import type { Group, Option } from "../../../../lib/shop/find";
import type { Line } from "../../../../lib/shop/requests";
import type { Receipt } from "../../ui";
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

const jarWords = "something to grip jar lids";
const jarOpeners: Option[] = [
  option(
    "jar-oxo",
    "OXO Good Grips Jar Opener with Base Pad",
    999,
    "amazon.com",
    "A rubber grip that fits over a lid, with a pad that holds the jar still.",
    "It takes the twist out of your hands, so tight lids come off with less effort.",
    "It works on round lids only.",
  ),
  option(
    "jar-pads",
    "Rubber Jar Gripper Pads, Set of 6",
    749,
    "target.com",
    "Six thin rubber circles you hold over a lid.",
    "They give your fingers a better hold on a slippery lid.",
    "You still turn the lid by hand.",
  ),
  option(
    "jar-mount",
    "Zulay Kitchen Under-Cabinet Jar Opener",
    1499,
    "walmart.com",
    "A grip that screws under a kitchen cabinet.",
    "You hold the jar with both hands and turn it, and the opener holds the lid.",
    "It needs two screws in the cabinet.",
  ),
];

const slipperWords = "warm slippers that are easy to put on, size 8";
const refused = { id: "dearfoams", name: "Dearfoams Women's Cozy Comfort Slippers", cents: 2499 };
const slippers: Option[] = [
  option(
    "isotoner",
    "Isotoner Women's Microterry Slip-On Slippers, Size 8",
    1999,
    "macys.com",
    "Soft slip-on slippers with a padded sole.",
    "There's no back to pull on, so your feet slide straight in.",
    "They run a little small, so check the size chart.",
  ),
  option(
    "rockdove",
    "RockDove Women's Memory Foam Clog Slippers",
    2299,
    "amazon.com",
    "Clog slippers with a warm lining.",
    "The open back makes them easy to step into.",
    "The sole is soft, so they're for indoors.",
  ),
  option(
    "vionic",
    "Vionic Women's Gemma Slipper",
    4495,
    "zappos.com",
    "Slip-on slippers with arch support.",
    "They're warm, and the shaped sole helps with sore feet.",
    "The dearest of the three.",
  ),
];

const batteries: Option[] = [
  option("aa-8", "Energizer MAX AA Batteries, 8 Pack", 879, "target.com", "8 AA batteries.", "Enough for a remote or two.", "Only 8 in the pack."),
  option("aa-24", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "amazon.com", "24 AA batteries.", "Enough for the remotes and clocks for a long while.", "They aren't rechargeable."),
  option("aa-16", "Duracell Coppertop AA Batteries, 16 Pack", 1449, "walmart.com", "16 AA batteries.", "They last a long time in everyday things.", "Fewer in the pack than the second, for more money."),
];
const nightLights: Option[] = [
  option("light-motion", "Motion Sensor Stick-On Night Light, Battery Powered", 1699, "amazon.com", "A light you stick on the wall.", "It lights up when you walk past.", "It needs 3 AAA batteries, which aren't included."),
  option("light-dimmer", "GE Plug-In LED Night Light with Dimmer", 899, "walmart.com", "A small light that plugs into a wall socket.", "You can turn it down so it doesn't keep you awake.", "It covers the socket it's plugged into."),
];
const chargers: Option[] = [
  option("charger-belkin", "Belkin 20W USB-C Wall Charger", 1999, "target.com", "A wall plug for charging a phone.", "It charges most phones quickly.", "No cable in the box."),
  option("charger-anker", "Anker USB-C Wall Charger with 6 ft Cable", 1599, "amazon.com", "A wall plug with a long cable.", "The long cable reaches a bedside table.", "Check that your phone takes a USB-C cable."),
];

const lineOf = (thing: string, { id, name, cents, shop, url, why }: Option): Line => ({ id, name, cents, shop, url, reason: why, thing });
const basketLines = [
  lineOf("AA batteries", batteries[1]),
  lineOf("a night light", option("light-plug", "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack", 1249, "target.com", "", "", "")),
  lineOf("a phone charger", chargers[1]),
];
const basket = { id: "basket", name: "3 things", cents: 3847 };
const basketWords = "AA batteries, a night light and a phone charger";
const again: Group[] = [
  { thing: "AA batteries", options: batteries, tried: true },
  { thing: "a night light", options: nightLights, tried: true },
  { thing: "a phone charger", options: [chargers[0]], tried: true },
];

const trimmed: Receipt = {
  item: { id: "basket", name: "2 things", cents: 2598 },
  lines: [basketLines[0], basketLines[2]],
  leftOut: ["a night light"],
  paidAt: new Date("2026-10-22T10:16:00"),
  transactionId: "7KT20419UA331082M",
};

const mixedWords = "AA batteries, something to grip jar lids";
const jarEmpty: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: jarWords, options: [], problem: "nothing found" },
];
const jarFound: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: jarWords, options: jarOpeners, tried: true },
];
const jarStill: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: jarWords, options: [], problem: "nothing found", tried: true },
];

const lampWords = "a lamp for reading in bed";

export default function FindAnotherPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Find another: every screen</h1>
        <p>
          Each frame is Rose&apos;s real page with fixed data. The listings are written examples until real search
          results replace them at /build. Grey squares stand in for listing photos. Sam&apos;s page doesn&apos;t change.
        </p>
      </header>

      <section className="preview-section">
        <h2>After an empty Find</h2>
        <div className="frames">
          <Frame label="Couldn't find that, limit $50 (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 5000, words: jarWords, problem: "nothing found" }} items={[]} />
          </Frame>
          <Frame label="Nothing under $20 (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 2000, words: lampWords, problem: "over limit" }} items={[]} />
          </Frame>
          <Frame label="Find another found three (scenario 1)">
            <RoseView
              state={{ kind: "options", limitCents: 5000, words: jarWords, listings: jarOpeners, tried: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Find another found nothing under $20 (scenario 4)">
            <RoseView
              state={{ kind: "ask", limitCents: 2000, words: lampWords, problem: "over limit", tried: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Find another found nothing (scenario 4)">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, words: jarWords, problem: "nothing found", tried: true }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>After Sam&apos;s No, or a thing left out</h2>
        <div className="frames">
          <Frame label="Sam said no to the slippers (scenario 2)">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, outcome: { kind: "declined", item: refused } }}
              items={[]}
            />
          </Frame>
          <Frame label="Three others, no Dearfoams (scenario 2)">
            <RoseView
              state={{ kind: "options", limitCents: 5000, words: slipperWords, listings: slippers, tried: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Sam said no to 3 things (scenario 2)">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, outcome: { kind: "declined", item: basket, lines: basketLines } }}
              items={[]}
            />
          </Frame>
          <Frame label="All 3 again, without the refused ones (scenario 2)">
            <RoseView
              state={{ kind: "basket", limitCents: 5000, words: basketWords, groups: again, tried: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Paid, the night light left out (scenario 2)">
            <RoseView state={{ kind: "paid", receipt: trimmed }} items={[]} />
          </Frame>
          <Frame label="Stopped by the daily limit (scenario 5)">
            <RoseView
              state={{
                kind: "ask",
                limitCents: 5000,
                outcome: { kind: "declined", item: refused },
                problem: "limit",
                waitMinutes: 170,
              }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>One empty thing in a basket</h2>
        <div className="frames">
          <Frame label="The jar group found nothing, AA picked (scenario 3)">
            <RoseView
              state={{ kind: "basket", limitCents: 5000, words: mixedWords, groups: jarEmpty, picked: ["aa-8"] }}
              items={[]}
            />
          </Frame>
          <Frame label="Find another found three, AA still picked (scenario 3)">
            <RoseView
              state={{ kind: "basket", limitCents: 5000, words: mixedWords, groups: jarFound, picked: ["aa-8"] }}
              items={[]}
            />
          </Frame>
          <Frame label="Find another found nothing for it (scenario 4)">
            <RoseView
              state={{ kind: "basket", limitCents: 5000, words: mixedWords, groups: jarStill, picked: ["aa-8"] }}
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
