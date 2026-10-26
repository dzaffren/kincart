import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SamView } from "../../SamView";
import type { Receipt } from "../../ui";
import "../approve-and-pay/preview.css";

const batteries: Receipt = {
  item: { id: "aa-24", name: "Amazon Basics 24-Pack AA Alkaline Batteries", cents: 999 },
  paidAt: new Date("2026-10-19T15:42:00"),
  transactionId: "3VD91528KJ402714T",
};

const limit = { cents: 4000 };
const total = { cents: null };
const roseLink = "https://kincart.vercel.app/r/Qm7vT2kXp9Lw4NcR8sYb3A";

export default function NewLinksPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>New links: every screen</h1>
        <p>
          Each frame is Sam&apos;s real page with fixed data: a household started from Try KinCart, a $40 price limit,
          and the AA batteries Sam paid for on 2026-10-19. Share shows only in a browser with a share sheet, such as a
          phone; elsewhere Copy is the only button.
        </p>
      </header>

      <section className="preview-section">
        <h2>Sam: before and after</h2>
        <div className="frames">
          <Frame label="Your links, under the limits (scenario 1)">
            <SamView state={{ kind: "paid", receipt: batteries }} limit={limit} total={total} links={{ kind: "offer" }} />
          </Frame>
          <Frame label="Make new links? (scenarios 1 and 4)">
            <SamView state={{ kind: "paid", receipt: batteries }} links={{ kind: "confirm" }} />
          </Frame>
          <Frame label="New links made, on Sam's new page (scenarios 1 and 3)">
            <SamView
              state={{ kind: "paid", receipt: batteries }}
              limit={limit}
              total={total}
              links={{ kind: "made", roseLink }}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sam: no New links here</h2>
        <div className="frames">
          <Frame label="Household 1, or inside the home page's phones (scenario 5)">
            <SamView state={{ kind: "paid", receipt: batteries }} limit={limit} total={total} />
          </Frame>
          <Frame label="An ask waiting: OK and No only (scenario 5)">
            <SamView
              state={{
                kind: "request",
                item: { id: "isotoner", name: "Isotoner Women's Microterry Slip-On Slippers, Size 8", cents: 1999 },
                askedAt: new Date("2026-10-26T09:12:00"),
                found: {
                  shop: "macys.com",
                  url: "https://www.macys.com/",
                  reason: "There's no back to pull on, so your feet slide straight in.",
                  watch: "They run a little small, so check the size chart.",
                },
              }}
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
