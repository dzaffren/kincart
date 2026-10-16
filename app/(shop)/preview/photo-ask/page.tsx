import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RoseView } from "../../RoseView";
import { PageHead, PhoneFrame } from "../../ui";
import type { Group, Option } from "../../../../lib/shop/find";
import "../approve-and-pay/preview.css";

// The photos are an empty image, so each shows the grey square a photo sits on while it loads.
const photo = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

const coinCells: Option[] = [
  {
    id: "cr2032-4",
    name: "Energizer CR2032 Lithium Coin Battery, 4 Pack",
    cents: 697,
    shop: "walmart.com",
    url: "https://www.walmart.com/",
    imageUrl: photo,
    what: "Four CR2032 coin batteries.",
    why: "The same size as the battery in your photo.",
    watch: "Keep the spares away from small children. They're dangerous if swallowed.",
  },
  {
    id: "cr2032-2",
    name: "Duracell 2032 Lithium Coin Battery, 2 Pack",
    cents: 549,
    shop: "target.com",
    url: "https://www.target.com/",
    imageUrl: photo,
    what: "Two 2032 coin batteries.",
    why: "A 2032 is the same battery as the CR2032 in your photo.",
    watch: "The child-proof pack needs scissors to open.",
  },
];

const groups: Group[] = [
  {
    thing: "AA batteries",
    options: [
      {
        id: "aa-8",
        name: "Duracell Coppertop AA Batteries, 8 Pack",
        cents: 879,
        shop: "target.com",
        url: "https://www.target.com/",
        imageUrl: photo,
        what: "8 AA batteries.",
        why: "Enough for a remote or two.",
        watch: "Only 8, so you may need more soon.",
      },
    ],
  },
  {
    thing: "a night light",
    options: [
      {
        id: "light-plug",
        name: "Plug-In LED Night Light with Dusk-to-Dawn Sensor, 2 Pack",
        cents: 1249,
        shop: "target.com",
        url: "https://www.target.com/",
        imageUrl: photo,
        what: "Two small lights that plug into a wall socket.",
        why: "They come on by themselves when it gets dark.",
        watch: "Each one covers the socket it's plugged into.",
      },
    ],
  },
  {
    thing: "a phone charger",
    options: [
      {
        id: "charger-usbc",
        name: "Anker 20W USB-C Wall Charger with 5 ft Cable",
        cents: 1599,
        shop: "amazon.com",
        url: "https://www.amazon.com/",
        imageUrl: photo,
        what: "A wall plug and a USB-C cable.",
        why: "It charges most phones made since 2019.",
        watch: "Older iPhones need a Lightning cable instead.",
      },
    ],
  },
];

const ask = { kind: "ask", limitCents: 2500 } as const;

export default function PhotoAskPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Photo ask: every screen</h1>
        <p>
          Each frame is the real component with fixed data. Grey squares stand in for Rose&apos;s photo and the listing
          photos. Take or pick a photo works in the first frame: pick any image, then a PDF.
        </p>
      </header>

      <section className="preview-section">
        <h2>Asking with a photo</h2>
        <div className="frames">
          <Frame label="What do you need?, with the photo button (scenario 1)">
            <PageHead />
            <RoseView state={ask} items={[]} />
          </Frame>
          <Frame label="A photo picked, with words (scenario 2)">
            <PageHead />
            <RoseView state={{ ...ask, words: "size 8", previews: [photo] }} items={[]} />
          </Frame>
          <Frame label="Find pressed with a photo">
            <PageHead />
            <RoseView state={{ ...ask, previews: [photo], busy: true }} items={[]} />
          </Frame>
          <Frame label="A PDF picked on a laptop (scenario 4)">
            <PageHead />
            <RoseView state={{ ...ask, problem: "not a photo" }} items={[]} />
          </Frame>
          <Frame label="A photo with nothing to buy (scenario 4)">
            <PageHead />
            <RoseView state={{ ...ask, problem: "nothing in photo" }} items={[]} />
          </Frame>
          <Frame label="Neither words nor a photo">
            <PageHead />
            <RoseView state={{ ...ask, problem: "empty" }} items={[]} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>What a photo finds</h2>
        <div className="frames">
          <Frame label="One thing from a photo (scenario 1)">
            <PageHead />
            <RoseView
              state={{
                kind: "options",
                limitCents: 2500,
                words: "CR2032 coin battery",
                fromPhoto: true,
                listings: coinCells,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="A written list from a photo (scenario 3)">
            <PageHead />
            <RoseView
              state={{
                kind: "basket",
                limitCents: 2500,
                words: "AA batteries, a night light and a phone charger",
                fromPhoto: true,
                groups,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Try other words after a photo (scenario 5)">
            <PageHead />
            <RoseView state={{ ...ask, words: "CR2032 coin battery" }} items={[]} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Inside the home page&apos;s phones</h2>
        <div className="frames">
          <PhoneFrame who="Rose">
            <PageHead />
            <RoseView state={ask} items={[]} />
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
