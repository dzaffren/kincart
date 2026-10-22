import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import type { Line } from "../../../../lib/shop/requests";
import type { Receipt } from "../../ui";
import "../approve-and-pay/preview.css";

const line = (id: string, thing: string, name: string, cents: number, shop: string): Line => ({
  id,
  thing,
  name,
  cents,
  shop,
  url: `https://www.${shop}/`,
  reason: "",
});

const batteries = line("aa-8", "AA batteries", "Energizer MAX AA Batteries, 8 Pack", 947, "walmart.com");
const nightLight = line(
  "light-plug",
  "a night light",
  "LED Plug-in Night Light, Dusk to Dawn Sensor, 2 Pack",
  1299,
  "amazon.com",
);
const lines = [batteries, nightLight];
const basket = { id: "basket", name: "2 things", cents: 2246 };
const paidAt = new Date("2026-10-23T10:16:00");

const twoOfThree: Receipt = {
  item: basket,
  lines,
  leftOut: ["a phone charger"],
  paidAt,
  transactionId: "7KT20419UA331082M",
};
const oneThing: Receipt = {
  item: { id: "magnifier", name: "Fancii 3X Large Magnifying Glass with Light", cents: 1699 },
  paidAt,
  transactionId: "3GX51882JM604122T",
};
const longName: Receipt = {
  item: {
    id: "pill-box",
    name: "Weekly Pill Organizer 2 Times a Day, Large AM PM Pill Box with 14 Compartments, Easy Open Push Button Design for Arthritis Hands, BPA Free, Rainbow Colors",
    cents: 899,
  },
  paidAt,
  transactionId: "9RD60337WC118905B",
};
const limit = { cents: 5000 };

export default function ItemizedReceiptPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Itemized receipt: every screen</h1>
        <p>
          Each frame is the real component with fixed data. The receipt gains one line: who got the money. The PayPal
          side of this slice has no screen of its own.
        </p>
      </header>

      <section className="preview-section">
        <h2>Rose&apos;s phone</h2>
        <div className="frames">
          <Frame label="Paid for 2 of 3 (scenario 1)">
            <RoseView state={{ kind: "paid", receipt: twoOfThree }} items={[]} />
          </Frame>
          <Frame label="Paid for one thing (scenario 2)">
            <RoseView state={{ kind: "paid", receipt: oneThing }} items={[]} />
          </Frame>
          <Frame label="A long name, kept in full (scenario 3)">
            <RoseView state={{ kind: "paid", receipt: longName }} items={[]} />
          </Frame>
          <Frame label="PayPal refused, as today (scenario 4)">
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
          <Frame label="Paid for 2 of 3 (scenario 1)">
            <SamView state={{ kind: "paid", receipt: twoOfThree }} limit={limit} />
          </Frame>
          <Frame label="Paid for one thing (scenario 2)">
            <SamView state={{ kind: "paid", receipt: oneThing }} limit={limit} />
          </Frame>
          <Frame label="PayPal refused, as today (scenario 4)">
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
