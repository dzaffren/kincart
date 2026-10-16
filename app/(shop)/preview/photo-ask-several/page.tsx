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

const slippers: Option = {
  id: "slippers-8",
  name: "Women's Memory Foam Slippers, Grey, Size 8",
  cents: 1899,
  shop: "target.com",
  url: "https://www.target.com/",
  imageUrl: photo,
  what: "Soft grey slippers with a rubber sole.",
  why: "Grey like your old pair, in size 8.",
  watch: "They run a little small, so check the size chart.",
};

const fromList: Group[] = [
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
    thing: "night light",
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
    thing: "phone charger",
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

const coinGroup: Group = { thing: "CR2032 coin battery", options: coinCells };

const ask = { kind: "ask", limitCents: 2500 } as const;

export default function PhotoAskSeveralPreview() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="preview">
      <header className="preview-header">
        <h1>Photo ask, several: every screen</h1>
        <p>
          Each frame is the real component with fixed data. Grey squares stand in for Rose&apos;s photos and the listing
          photos. Take or pick a photo works in the first frame: pick several images at once, then Add another photo,
          then tick more than will fit, then a PDF with a photo.
        </p>
      </header>

      <section className="preview-section">
        <h2>Adding photos</h2>
        <div className="frames">
          <Frame label="What do you need?, live: pick photos here (scenarios 4, 5)">
            <PageHead />
            <RoseView state={ask} items={[]} />
          </Frame>
          <Frame label="Two photos, with words (scenarios 1, 2)">
            <PageHead />
            <RoseView state={{ ...ask, words: "size 8", previews: [photo, photo] }} items={[]} />
          </Frame>
          <Frame label="Five photos: Add another photo goes (scenario 4)">
            <PageHead />
            <RoseView state={{ ...ask, previews: [photo, photo, photo, photo, photo] }} items={[]} />
          </Frame>
          <Frame label="A PDF ticked with a photo (scenario 5)">
            <PageHead />
            <RoseView state={{ ...ask, previews: [photo, photo], problem: "not a photo" }} items={[]} />
          </Frame>
          <Frame label="Find pressed with three photos">
            <PageHead />
            <RoseView state={{ ...ask, previews: [photo, photo, photo], busy: true }} items={[]} />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>What the photos find</h2>
        <div className="frames">
          <Frame label="Four things from two photos (scenario 1)">
            <PageHead />
            <RoseView
              state={{
                kind: "basket",
                limitCents: 2500,
                words: "CR2032 coin battery, AA batteries, night light, phone charger",
                fromPhoto: true,
                photos: 2,
                groups: [coinGroup, ...fromList],
              }}
              items={[]}
            />
          </Frame>
          <Frame label="One of three photos showed nothing (scenario 3)">
            <PageHead />
            <RoseView
              state={{
                kind: "basket",
                limitCents: 2500,
                words: "CR2032 coin battery, grey slippers in size 8",
                fromPhoto: true,
                photos: 3,
                blankPhotos: 1,
                groups: [coinGroup, { thing: "grey slippers in size 8", options: [slippers] }],
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Two photos of one pack (scenario 3)">
            <PageHead />
            <RoseView
              state={{
                kind: "options",
                limitCents: 2500,
                words: "CR2032 coin battery",
                fromPhoto: true,
                photos: 2,
                listings: coinCells,
              }}
              items={[]}
            />
          </Frame>
          <Frame label="Nothing in either photo (scenario 3)">
            <PageHead />
            <RoseView state={{ ...ask, problem: "nothing in photo", photos: 2 }} items={[]} />
          </Frame>
          <Frame label="More than 5 things in the photos (scenario 3)">
            <PageHead />
            <RoseView
              state={{
                ...ask,
                problem: "too many",
                words: "AA batteries, night light, phone charger, tea bags, dish soap, CR2032 coin battery",
              }}
              items={[]}
            />
          </Frame>
        </div>
      </section>

      <section className="preview-section">
        <h2>Inside the home page&apos;s phones</h2>
        <div className="frames">
          <PhoneFrame who="Rose">
            <PageHead />
            <RoseView state={{ ...ask, previews: [photo, photo, photo] }} items={[]} />
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
