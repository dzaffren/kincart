import type { ReactNode } from "react";
import { BrokenLinkView } from "../../BrokenLinkView";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import type { Item, Receipt } from "../../ui";
import "./preview.css";

const glasses: Item = { id: "glasses", name: "Reading glasses, +2.00", cents: 1899 };
const pills: Item = { id: "pills", name: "Weekly pill organiser", cents: 1250 };
const batteries: Item = { id: "batteries", name: "AA batteries, pack of 8", cents: 999 };
const items = [glasses, pills, batteries];

const askedAt = new Date("2026-10-20T10:15:00");
const receipt: Receipt = {
  item: glasses,
  paidAt: new Date("2026-10-20T10:16:00"),
  transactionId: "7BM91101S1572292D",
};

export default function ApproveAndPayPreview() {
  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Approve and pay: every screen</h1>
        <p>
          Each frame is the real component with fixed data. Switch your system to dark mode to see the dark
          theme.
        </p>
      </header>

      <section className="preview-section">
        <h2>Rose&apos;s phone</h2>
        <div className="frames">
          <Frame label="Not linked (scenario 1)">
            <RoseView state={{ kind: "not linked" }} items={items} />
          </Frame>
          <Frame label="Opening PayPal">
            <RoseView state={{ kind: "not linked", busy: true }} items={items} />
          </Frame>
          <Frame label="Cancelled at PayPal (scenario 1)">
            <RoseView state={{ kind: "not linked", cancelled: true }} items={items} />
          </Frame>
          <Frame label="Linked, nothing picked">
            <RoseView state={{ kind: "pick" }} items={items} />
          </Frame>
          <Frame label="Tapped Ask without a pick">
            <RoseView state={{ kind: "pick", error: true }} items={items} />
          </Frame>
          <Frame label="Glasses picked, asking (scenario 2)">
            <RoseView state={{ kind: "pick", picked: "glasses", busy: true }} items={items} />
          </Frame>
          <Frame label="Waiting for Sam (scenario 2)">
            <RoseView state={{ kind: "waiting", item: glasses, askedAt }} items={items} />
          </Frame>
          <Frame label="Paid (scenario 2)">
            <RoseView state={{ kind: "paid", receipt }} items={items} />
          </Frame>
          <Frame label="Sam said no (scenario 3)">
            <RoseView state={{ kind: "pick", outcome: { kind: "declined", item: batteries } }} items={items} />
          </Frame>
          <Frame label="Payment failed (scenario 4)">
            <RoseView state={{ kind: "pick", outcome: { kind: "failed", item: pills } }} items={items} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam&apos;s phone</h2>
        <div className="frames">
          <Frame label="Nothing to approve">
            <SamView state={{ kind: "nothing" }} />
          </Frame>
          <Frame label="Rose asks (scenario 2)">
            <SamView state={{ kind: "request", item: glasses, askedAt }} />
          </Frame>
          <Frame label="Paying">
            <SamView state={{ kind: "request", item: glasses, askedAt, busy: true }} />
          </Frame>
          <Frame label="Paid (scenarios 2 and 5)">
            <SamView state={{ kind: "paid", receipt }} />
          </Frame>
          <Frame label="Said no (scenario 3)">
            <SamView state={{ kind: "nothing", declined: batteries }} />
          </Frame>
          <Frame label="Payment failed (scenario 4)">
            <SamView state={{ kind: "failed", item: pills }} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Either phone</h2>
        <div className="frames">
          <Frame label="Wrong or cut-off link">
            <BrokenLinkView />
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
