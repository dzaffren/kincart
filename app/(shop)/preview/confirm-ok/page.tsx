import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PasskeySection } from "../../Passkey";
import { SamView, type SamState } from "../../SamView";
import type { Receipt } from "../../ui";
import "../approve-and-pay/preview.css";

const batteries: Receipt = {
  item: { id: "aa-24", name: "Amazon Basics 24-Pack AA Alkaline Batteries", cents: 1299 },
  paidAt: new Date("2026-10-26T15:42:00"),
  transactionId: "3VD91528KJ402714T",
};

const asked: SamState = {
  kind: "request",
  item: batteries.item,
  askedAt: new Date("2026-10-26T15:38:00"),
  found: {
    shop: "amazon.com",
    url: "https://www.amazon.com/",
    reason: "A big pack of the AA size your clock and remote take, so you won't run out soon.",
  },
};

const basket: SamState = {
  kind: "request",
  item: { id: "basket", name: "2 things", cents: 2298 },
  askedAt: new Date("2026-10-26T15:38:00"),
  lines: [
    {
      id: "aa-24",
      thing: "AA batteries",
      name: "Amazon Basics 24-Pack AA Alkaline Batteries",
      cents: 1299,
      shop: "amazon.com",
      url: "https://www.amazon.com/",
      reason: "The AA size your clock and remote take.",
    },
    {
      id: "isotoner",
      thing: "slippers",
      name: "Isotoner Women's Microterry Slip-On Slippers, Size 8",
      cents: 999,
      shop: "macys.com",
      url: "https://www.macys.com/",
      reason: "There's no back to pull on, so your feet slide straight in.",
    },
  ],
};

const limit = { cents: 4000 };
const total = { cents: null };
const paid: SamState = { kind: "paid", receipt: batteries };

export default function ConfirmOkPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Confirm OK: every screen</h1>
        <p>
          Each frame is Sam&apos;s real page with fixed data: a household started from Try KinCart, a $40 price limit,
          and Rose&apos;s ask for AA batteries at $12.99 on 2026-10-26. The face or fingerprint prompt itself is the
          phone&apos;s own, so it isn&apos;t drawn here.
        </p>
      </header>

      <section className="preview-section">
        <h2>Sam: Confirm each OK, under the limits</h2>
        <div className="frames">
          <Frame label="Off, the default (scenario 1)">
            <SamView state={paid} limit={limit} total={total} passkey={<PasskeySection state={{ kind: "off" }} />} links={{ kind: "offer" }} />
          </Frame>
          <Frame label="Turn on, waiting for the face or fingerprint (scenario 1)">
            <SamView state={paid} limit={limit} total={total} passkey={<PasskeySection state={{ kind: "off", busy: true }} />} />
          </Frame>
          <Frame label="Turned on (scenario 1)">
            <SamView state={paid} limit={limit} total={total} passkey={<PasskeySection state={{ kind: "on", saved: true }} />} links={{ kind: "offer" }} />
          </Frame>
          <Frame label="Turn on cancelled (scenario 1)">
            <SamView state={paid} passkey={<PasskeySection state={{ kind: "off", error: true }} />} />
          </Frame>
          <Frame label="Turn off without the passkey (scenario 4)">
            <SamView state={paid} passkey={<PasskeySection state={{ kind: "on", refused: true }} />} />
          </Frame>
          <Frame label="Turned off (scenario 4)">
            <SamView state={paid} passkey={<PasskeySection state={{ kind: "off", saved: true }} />} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam: an OK with the passkey on</h2>
        <div className="frames">
          <Frame label="One thing, refused without the passkey (scenario 2)">
            <SamView state={asked} refused="ok" />
          </Frame>
          <Frame label="A basket, after Cancel on the prompt (scenario 3)">
            <SamView state={basket} refused="ok" />
          </Frame>
          <Frame label="Make new links, refused without the passkey (scenario 4)">
            <SamView state={paid} links={{ kind: "confirm" }} refused="links" />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Inside the home page&apos;s phones, passkey on</h2>
        <div className="frames">
          <Frame label="One thing: OK opens Sam's page in a new tab (scenario 5)">
            <SamView state={asked} okInTab="/h/preview" />
          </Frame>
          <Frame label="A basket: OK opens Sam's page in a new tab (scenario 5)">
            <SamView state={basket} okInTab="/h/preview" />
          </Frame>
          <Frame label="No Confirm each OK here, nor for household 1 or a browser without passkeys (scenario 5)">
            <SamView state={paid} limit={limit} total={total} />
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
