import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import { PageHead, PhoneFrame } from "../../ui";
import type { Group, Option } from "../../../../lib/shop/find";
import type { Line } from "../../../../lib/shop/requests";
import "../approve-and-pay/preview.css";

// The photos are an empty image, so each shows the grey square a photo sits on while it loads.
const photo = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const words = "AA batteries and a night light";

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
    id: "aa-8",
    name: "Duracell Coppertop AA Batteries, 8 Pack",
    cents: 879,
    shop: "target.com",
    url: "https://www.target.com/",
    what: "8 AA batteries.",
    why: "The cheapest here, and enough for a remote or two.",
    watch: "Only 8, so you may need more soon.",
  },
];

const nightLights: Option[] = [
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
];

const groups: Group[] = [
  { thing: "AA batteries", options: batteries },
  { thing: "a night light", options: nightLights },
];

const lineOf = (thing: string, { id, name, cents, shop, url, imageUrl, why, watch }: Option): Line => ({
  id,
  name,
  cents,
  shop,
  url,
  imageUrl,
  reason: why,
  watch,
  thing,
});
const lines = [lineOf("AA batteries", batteries[1]), lineOf("a night light", nightLights[0])];
const before = lines.map(({ id, name, cents, shop, url, reason, thing }) => ({ id, name, cents, shop, url, reason, thing }));
const basket = { id: "basket", name: "2 things", cents: 2578 };
const [light] = nightLights;
const one = { id: light.id, name: light.name, cents: light.cents };
const found = { shop: light.shop, url: light.url, reason: light.why, watch: light.watch, imageUrl: light.imageUrl };
const askedAt = new Date("2026-10-20T10:15:00");
const limit = { cents: 3000 };
const total = { cents: null };

export default function ClearerPagesPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Clearer pages: every screen</h1>
        <p>
          Each frame is the real component with fixed data, under the header Rose&apos;s and Sam&apos;s pages now
          carry. Grey squares stand in for listing photos; the batteries from target.com have none.
        </p>
      </header>

      <section className="preview-section">
        <h2>Rose&apos;s phone</h2>
        <div className="frames">
          <Frame label="The header, asking (scenario 3)">
            <PageHead />
            <RoseView state={{ kind: "ask", limitCents: 3000 }} items={[]} />
          </Frame>
          <Frame label="128px photos (scenario 4)">
            <PageHead />
            <RoseView
              state={{ kind: "basket", limitCents: 3000, words, groups, picked: ["aa-8", "light-motion"] }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam&apos;s phone</h2>
        <div className="frames">
          <Frame label="The header, nothing to approve (scenario 3)">
            <PageHead />
            <SamView state={{ kind: "nothing" }} limit={limit} total={total} />
          </Frame>
          <Frame label="Rose asks for 2 things, one with no photo (scenarios 1 and 2)">
            <PageHead />
            <SamView state={{ kind: "request", item: basket, askedAt, lines }} />
          </Frame>
          <Frame label="Rose asks for one thing (scenario 1)">
            <PageHead />
            <SamView state={{ kind: "request", item: one, askedAt, found }} />
          </Frame>
          <Frame label="An ask from before this change (scenario 2)">
            <PageHead />
            <SamView state={{ kind: "request", item: basket, askedAt, lines: before }} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Inside the home page&apos;s phones (D55)</h2>
        <div className="frames">
          <PhoneFrame who="Rose">
            <PageHead />
            <RoseView state={{ kind: "ask", limitCents: 3000 }} items={[]} />
          </PhoneFrame>
          <PhoneFrame who="Sam">
            <PageHead />
            <SamView state={{ kind: "request", item: basket, askedAt, lines }} />
          </PhoneFrame>
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
