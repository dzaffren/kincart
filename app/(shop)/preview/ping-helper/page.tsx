import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Item } from "../../../../lib/shop/items";
import { NotifySection, type NotifyState } from "../../Notify";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import "../approve-and-pay/preview.css";

const slippers: Item = { id: "fireside", name: "Dearfoams Women's Fireside Slipper", cents: 2499 };
const askedAt = new Date("2026-10-20T10:15:00");
const limit = { cents: 5000 };

const sam = (state: NotifyState) => <NotifySection who="sam" state={state} />;
const rose = (state: NotifyState) => <NotifySection who="rose" state={state} />;

export default function PingHelperPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Ping helper: every screen</h1>
        <p>
          Each frame is the real component with fixed data. The Notifications section sits under a divider on
          Sam&apos;s resting screens and on Rose&apos;s asking and waiting screens. The notifications themselves are
          drawn by the phone; their words are in the spec.
        </p>
      </header>

      <section className="preview-section">
        <h2>Sam&apos;s phone</h2>
        <div className="frames">
          <Frame label="Off, Android (scenario 1)">
            <SamView state={{ kind: "nothing" }} limit={limit} notify={sam({ kind: "off" })} />
          </Frame>
          <Frame label="Turning on, the phone is asking">
            <SamView state={{ kind: "nothing" }} limit={limit} notify={sam({ kind: "off", busy: true })} />
          </Frame>
          <Frame label="On (scenario 1)">
            <SamView state={{ kind: "nothing" }} limit={limit} notify={sam({ kind: "on" })} />
          </Frame>
          <Frame label="Blocked (scenario 1)">
            <SamView state={{ kind: "nothing" }} limit={limit} notify={sam({ kind: "blocked" })} />
          </Frame>
          <Frame label="Couldn't turn on">
            <SamView state={{ kind: "nothing" }} limit={limit} notify={sam({ kind: "off", error: true })} />
          </Frame>
          <Frame label="Opened from the notification (scenario 3)">
            <SamView state={{ kind: "request", item: slippers, askedAt }} notify={sam({ kind: "on" })} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Rose&apos;s phone</h2>
        <div className="frames">
          <Frame label="iPhone in Safari (scenario 1)">
            <RoseView
              state={{ kind: "waiting", item: slippers, askedAt }}
              items={[]}
              notify={rose({ kind: "home screen first" })}
            />
          </Frame>
          <Frame label="Opened from the Home Screen, off (scenario 2)">
            <RoseView state={{ kind: "waiting", item: slippers, askedAt }} items={[]} notify={rose({ kind: "off" })} />
          </Frame>
          <Frame label="On (scenario 2)">
            <RoseView state={{ kind: "waiting", item: slippers, askedAt }} items={[]} notify={rose({ kind: "on" })} />
          </Frame>
          <Frame label="Browser without notifications (scenario 1)">
            <RoseView
              state={{ kind: "waiting", item: slippers, askedAt }}
              items={[]}
              notify={rose({ kind: "not supported" })}
            />
          </Frame>
          <Frame label="Asking, on">
            <RoseView state={{ kind: "ask", limitCents: 5000 }} items={[]} notify={rose({ kind: "on" })} />
          </Frame>
          <Frame label="Sam said no, from the notification (scenario 4)">
            <RoseView
              state={{ kind: "ask", limitCents: 5000, outcome: { kind: "declined", item: slippers } }}
              items={[]}
              notify={rose({ kind: "on" })}
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
