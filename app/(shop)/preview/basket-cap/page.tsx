import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { SamView } from "../../SamView";
import type { Group, Option } from "../../../../lib/shop/find";
import "../approve-and-pay/preview.css";

// The photos are an empty image, so each shows the grey square a photo sits on while it loads.
const photo = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const words = "AA batteries, a night light and a phone charger";

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

const groups: Group[] = [
  {
    thing: "AA batteries",
    options: [
      option(
        "aa-24",
        "Amazon Basics 24-Pack AA Alkaline Batteries",
        999,
        "amazon.com",
        "A box of 24 AA batteries.",
        "Enough for the remotes and clocks for a long while.",
        "They aren't rechargeable.",
      ),
      option(
        "aa-16",
        "Energizer MAX AA Batteries, 16 Count",
        1449,
        "walmart.com",
        "16 AA batteries from a well-known brand.",
        "They last a long time in everyday things like remotes.",
        "Fewer in the pack than the first, for more money.",
      ),
    ],
  },
  {
    thing: "a night light",
    options: [
      option(
        "light-plug",
        "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack",
        1249,
        "target.com",
        "Two small lights that plug into a wall socket.",
        "They come on by themselves when it gets dark, so there's no switch to find at night.",
        "Each one covers the socket it's plugged into.",
      ),
    ],
  },
  {
    thing: "a phone charger",
    options: [
      option(
        "charger-belkin",
        "Belkin 25W USB-C Wall Charger with 6 ft Cable",
        2499,
        "bestbuy.com",
        "A wall plug with a long charging cable.",
        "The long cable reaches from the socket to a bedside table.",
        "Check that your phone takes a USB-C cable.",
      ),
    ],
  },
];

const lamps: Option[] = [
  option(
    "lamp-led",
    "LED Desk Lamp with Dimmer and USB Port",
    4499,
    "amazon.com",
    "A desk lamp you can make brighter or dimmer.",
    "A bright, even light for reading the paper at the table.",
    "The USB port charges a phone; it doesn't light anything.",
  ),
  option(
    "lamp-clip",
    "Clip-On Reading Light, Rechargeable",
    1899,
    "target.com",
    "A small light that clips onto a book or a table edge.",
    "It puts the light right on the page.",
    "It's small, so it lights the page and not the room.",
  ),
];

const limit = { cents: 5000 };

export default function BasketCapPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Basket cap: every screen</h1>
        <p>
          Each frame is the real component with fixed data. The listings are written examples. Grey squares stand in
          for listing photos.
        </p>
      </header>

      <section className="preview-section">
        <h2>Sam&apos;s phone</h2>
        <div className="frames">
          <Frame label="No total limit yet (O2)">
            <SamView state={{ kind: "nothing" }} limit={limit} total={{ cents: null }} />
          </Frame>
          <Frame label="Saved $40 (scenario 1)">
            <SamView state={{ kind: "nothing" }} limit={limit} total={{ cents: 4000, saved: true }} />
          </Frame>
          <Frame label="Cleared (scenario 1)">
            <SamView state={{ kind: "nothing" }} limit={limit} total={{ cents: null, saved: true }} />
          </Frame>
          <Frame label="Typed 12.50 (scenario 1)">
            <SamView state={{ kind: "nothing" }} limit={limit} total={{ cents: 4000, error: true }} />
          </Frame>
          <Frame label="Saving">
            <SamView state={{ kind: "nothing" }} limit={limit} total={{ cents: 4000, busy: true }} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Rose&apos;s phone</h2>
        <div className="frames">
          <Frame label="Asking, with a total limit (scenario 1)">
            <RoseView state={{ kind: "ask", limitCents: 5000, totalCents: 4000 }} items={[]} />
          </Frame>
          <Frame label="Asking, no total limit">
            <RoseView state={{ kind: "ask", limitCents: 5000 }} items={[]} />
          </Frame>
          <Frame label="Three picked, $47.47, before Ask Sam">
            <RoseView
              state={{
                kind: "basket",
                limitCents: 5000,
                totalCents: 4000,
                words,
                groups,
                picked: ["aa-24", "light-plug", "charger-belkin"],
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Over the limit, picks kept (scenario 2)">
            <RoseView
              state={{
                kind: "basket",
                limitCents: 5000,
                totalCents: 4000,
                words,
                groups,
                picked: ["aa-24", "light-plug", "charger-belkin"],
                overCents: 4747,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Night light left out, asking Sam for $34.98 (scenario 2)">
            <RoseView
              state={{
                kind: "basket",
                limitCents: 5000,
                totalCents: 4000,
                words,
                groups,
                picked: ["aa-24", "charger-belkin"],
                busy: true,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="One item over the limit (scenario 3)">
            <RoseView
              state={{
                kind: "options",
                limitCents: 5000,
                totalCents: 4000,
                words: "a desk lamp",
                listings: lamps,
                picked: "lamp-led",
                overCents: 4499,
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
