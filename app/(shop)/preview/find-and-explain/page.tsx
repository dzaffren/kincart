import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import type { Option } from "../../../../lib/shop/find";
import type { Receipt } from "../../ui";
import "../approve-and-pay/preview.css";

// The photos are an empty image, so each shows the grey square a photo sits on while it loads.
const photo = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const words = "warm slippers that are easy to put on, size 8";

const listings: Option[] = [
  {
    id: "clog",
    name: "Women's Memory Foam Slip-On Clog Slippers, Closed Toe",
    cents: 2499,
    shop: "walmart.com",
    url: "https://www.walmart.com/",
    imageUrl: photo,
    what: "Soft clog slippers with a fleece lining and a rubber sole.",
    why: "The open heel lets you step in without bending down, and size 8 is in stock.",
    watch: "They run about half a size small, so check the size chart.",
  },
  {
    id: "strap",
    name: "Adjustable Wide Slippers with Hook-and-Loop Strap",
    cents: 3250,
    shop: "amazon.com",
    url: "https://www.amazon.com/",
    imageUrl: photo,
    what: "Wide slippers that open across the top and close with a strap.",
    why: "You open them right up to put them on, then press the strap shut.",
    watch: "They're a wide fit, so they may feel loose on a narrow foot.",
  },
  {
    id: "moccasin",
    name: "Fleece-Lined Moccasin Slippers",
    cents: 1800,
    shop: "target.com",
    url: "https://www.target.com/",
    what: "Warm moccasin slippers lined with soft fleece.",
    why: "They're the warmest of the three and come in size 8.",
    watch: "You push your heel in, so they're harder to put on than the other two.",
  },
];

const [clog, strap] = listings;
const askedAt = new Date("2026-10-20T10:15:00");
const receipt: Receipt = { item: strap, paidAt: new Date("2026-10-20T10:16:00"), transactionId: "3HJ11850TY537110R" };
const limit = { cents: 5000 };

export default function FindAndExplainPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Find and explain: every screen</h1>
        <p>
          Each frame is the real component with fixed data. The listings are written examples until real search
          results replace them at /build. Grey squares stand in for listing photos; the third listing has none.
        </p>
      </header>

      <section className="preview-section">
        <h2>Rose&apos;s phone</h2>
        <div className="frames">
          <Frame label="Asking (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 5000 }} items={[]} />
          </Frame>
          <Frame label="Tapped Find with an empty box">
            <RoseView state={{ kind: "ask", limitCents: 5000, problem: "empty" }} items={[]} />
          </Frame>
          <Frame label="Looking (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 5000, words, busy: true }} items={[]} />
          </Frame>
          <Frame label="Three options (scenario 1)">
            <RoseView state={{ kind: "options", limitCents: 5000, words, listings }} items={[]} />
          </Frame>
          <Frame label="Second picked (scenario 2)">
            <RoseView state={{ kind: "options", limitCents: 5000, words, listings, picked: "strap" }} items={[]} />
          </Frame>
          <Frame label="Tapped Ask Sam without a pick">
            <RoseView state={{ kind: "options", limitCents: 5000, words, listings, error: true }} items={[]} />
          </Frame>
          <Frame label="Only two under the limit (O5)">
            <RoseView
              state={{ kind: "options", limitCents: 3000, words, listings: [clog, listings[2]] }}
              items={[]}
            />
          </Frame>
          <Frame label="Asking Sam (scenario 2)">
            <RoseView
              state={{ kind: "options", limitCents: 5000, words, listings, picked: "strap", busy: true }}
              items={[]}
            />
          </Frame>
          <Frame label="Nothing found (scenario 3)">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, words: "a left-handed teapot for a cat", problem: "nothing found" }}
              items={[]}
            />
          </Frame>
          <Frame label="A shopping list (scenario 3)">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, words: "milk, bread and eggs", problem: "several" }}
              items={[]}
            />
          </Frame>
          <Frame label="Nothing under $30 (scenario 4)">
            <RoseView
              state={{ kind: "ask", limitCents: 3000, words: "a tablet for video calls", problem: "over limit" }}
              items={[]}
            />
          </Frame>
          <Frame label="Waiting for Sam (scenario 2)">
            <RoseView state={{ kind: "waiting", item: strap, askedAt, shop: strap.shop }} items={[]} />
          </Frame>
          <Frame label="Paid (scenario 2)">
            <RoseView state={{ kind: "paid", receipt }} items={[]} />
          </Frame>
          <Frame label="Sam said no">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, outcome: { kind: "declined", item: strap } }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam&apos;s phone</h2>
        <div className="frames">
          <Frame label="Rose asks (scenario 2)">
            <SamView
              state={{ kind: "request", item: strap, askedAt, found: { shop: strap.shop, url: strap.url, reason: strap.why } }}
            />
          </Frame>
          <Frame label="Paying">
            <SamView
              state={{
                kind: "request",
                item: strap,
                askedAt,
                busy: true,
                found: { shop: strap.shop, url: strap.url, reason: strap.why },
              }}
            />
          </Frame>
          <Frame label="Nothing to approve, limit $50 (scenario 5)">
            <SamView state={{ kind: "nothing" }} limit={limit} />
          </Frame>
          <Frame label="Saving the limit">
            <SamView state={{ kind: "nothing" }} limit={{ cents: 3000, busy: true }} />
          </Frame>
          <Frame label="Limit saved at $30 (scenario 5)">
            <SamView state={{ kind: "nothing" }} limit={{ cents: 3000, saved: true }} />
          </Frame>
          <Frame label="Limit out of range">
            <SamView state={{ kind: "nothing" }} limit={{ cents: 300, error: true }} />
          </Frame>
          <Frame label="Paid, with the limit below">
            <SamView state={{ kind: "paid", receipt }} limit={limit} />
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
