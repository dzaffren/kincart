import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
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
];
const nightLights: Option[] = [
  option("light-motion", "Motion Sensor Stick-On Night Light, Battery Powered", 1699, "amazon.com", "A light you stick on the wall.", "It lights up when you walk past.", "It needs 3 AAA batteries, which aren't included."),
  option("light-dimmer", "GE Plug-In LED Night Light with Dimmer", 899, "walmart.com", "A small light that plugs into a wall socket.", "You can turn it down so it doesn't keep you awake.", "It covers the socket it's plugged into."),
];
const chargers: Option[] = [
  option("charger-belkin", "Belkin 20W USB-C Wall Charger", 1999, "target.com", "A wall plug for charging a phone.", "It charges most phones quickly.", "No cable in the box."),
];

const lineOf = (thing: string, { id, name, cents, shop, url, why }: Option): Line => ({ id, name, cents, shop, url, reason: why, thing });
const basketLines = [
  lineOf("AA batteries", batteries[1]),
  lineOf("a night light", option("light-plug", "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack", 1249, "target.com", "", "", "")),
  lineOf("a phone charger", chargers[0]),
];
const basket = { id: "basket", name: "3 things", cents: 4247 };
const basketWords = "AA batteries, a night light and a phone charger";
const again: Group[] = [
  { thing: "AA batteries", options: batteries, tried: true },
  { thing: "a night light", options: nightLights, tried: true },
  { thing: "a phone charger", options: chargers, tried: true },
];

const trimmed: Receipt = {
  item: { id: "basket", name: "2 things", cents: 2998 },
  lines: [basketLines[0], basketLines[2]],
  leftOut: ["a night light"],
  paidAt: new Date("2026-10-23T10:16:00"),
  transactionId: "7KT20419UA331082M",
};

const limit = { cents: 5000 };

export default function SamFindsAnotherPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Sam finds another: every screen</h1>
        <p>
          Each frame is Sam&apos;s or Rose&apos;s real page with fixed data. The slippers come from find-another&apos;s
          e2e, with written explanations. Grey squares stand in for listing photos. A pressed Find another says
          &ldquo;Looking…&rdquo; with the spinner, as on Rose&apos;s page.
        </p>
      </header>

      <section className="preview-section">
        <h2>Sam: Find another after a No or an untick</h2>
        <div className="frames">
          <Frame label="After No to the slippers (scenario 1)">
            <SamView state={{ kind: "nothing", declined: refused, again: "offer" }} limit={limit} />
          </Frame>
          <Frame label="After No to a basket">
            <SamView state={{ kind: "nothing", declined: basket, lines: basketLines, again: "offer" }} limit={limit} />
          </Frame>
          <Frame label="The receipt, with the night light left out (scenario 1)">
            <SamView state={{ kind: "paid", receipt: trimmed, again: "offer" }} />
          </Frame>
          <Frame label="Stopped by the daily limit (scenario 5)">
            <SamView state={{ kind: "nothing", declined: refused, again: "offer", waitMinutes: 170 }} limit={limit} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam: after the search</h2>
        <div className="frames">
          <Frame label="New options for Rose, or Rose tapped first (scenarios 2 and 3)">
            <SamView state={{ kind: "nothing", declined: refused, again: "options" }} limit={limit} />
          </Frame>
          <Frame label="New options for the night light">
            <SamView state={{ kind: "paid", receipt: trimmed, again: "options" }} />
          </Frame>
          <Frame label="Found nothing (scenario 4)">
            <SamView
              state={{ kind: "nothing", declined: { id: "pillbox", name: "Talking Pill Box Reminder", cents: 1999 }, again: "nothing" }}
              limit={{ cents: 2000 }}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Rose: what Sam&apos;s tap found</h2>
        <div className="frames">
          <Frame label="New slippers, without the Dearfoams (scenario 1)">
            <RoseView
              state={{ kind: "options", limitCents: 5000, words: slipperWords, listings: slippers, tried: true, bySam: true }}
              items={[]}
            />
          </Frame>
          <Frame label="A basket again, after Sam's No">
            <RoseView
              state={{ kind: "basket", limitCents: 5000, words: basketWords, groups: again, tried: true, bySam: true }}
              items={[]}
            />
          </Frame>
          <Frame label="The night light again, after Sam left it out">
            <RoseView
              state={{
                kind: "options",
                limitCents: 5000,
                words: "a night light",
                listings: nightLights,
                tried: true,
                bySam: true,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Found nothing (scenario 4)">
            <RoseView
              state={{
                kind: "ask",
                limitCents: 2000,
                words: "a pill box that beeps",
                problem: "nothing found",
                tried: true,
                bySam: true,
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
