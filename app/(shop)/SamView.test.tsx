import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PasskeySection, type PasskeyState } from "./Passkey";
import { SamView } from "./SamView";

const askedAt = new Date("2026-10-15T09:30:00Z");
const nightLight = {
  id: "prod_4Ms8nL",
  name: "Motion Sensor Stick-On Night Light, Battery Powered",
  cents: 1699,
  shop: "amazon.com",
  url: "https://www.amazon.com/dp/B08MSNL4K2",
  reason: "It comes on by itself when someone walks past at night.",
  watch: "It needs 3 AAA batteries, which aren't included.",
  imageUrl: "https://cdn.trychannel3.com/prod_4Ms8nL",
  thing: "a night light",
};
const batteries = {
  id: "prod_2Dc8aA",
  name: "Duracell Coppertop AA Batteries, 8 Pack",
  cents: 879,
  shop: "amazon.com",
  url: "https://www.amazon.com/dp/B000IZQO7U",
  reason: "Enough for the remote and the clock.",
  thing: "AA batteries",
};

const text = (html: string) => html.replace(/<[^>]*>/g, "").replaceAll("&#x27;", "'");
const photos = (html: string) => [...html.matchAll(/<img [^>]*src="([^"]*)"/g)].map(([, src]) => src);
const notes = (html: string) => text(html).split("Good to know:").length - 1;

it("shows Sam the photo, why it fits and the note for one thing", () => {
  const { id, name, cents, shop, url, reason, watch, imageUrl } = nightLight;
  const html = renderToStaticMarkup(
    <SamView state={{ kind: "request", item: { id, name, cents }, askedAt, found: { shop, url, reason, watch, imageUrl } }} />,
  );

  expect(photos(html)).toEqual(["https://cdn.trychannel3.com/prod_4Ms8nL"]);
  expect(text(html)).toContain("Why it fits: It comes on by itself when someone walks past at night.");
  expect(text(html)).toContain("Good to know: It needs 3 AAA batteries, which aren't included.");
});

it("shows no photo and no note for one thing without them, as for an ask from before", () => {
  const { id, name, cents, shop, url, reason } = batteries;
  const html = renderToStaticMarkup(
    <SamView state={{ kind: "request", item: { id, name, cents }, askedAt, found: { shop, url, reason } }} />,
  );

  expect(photos(html)).toEqual([]);
  expect(notes(html)).toBe(0);
  expect(text(html)).toContain("Why it fits: Enough for the remote and the clock.");
});

it("shows each line's photo and note only when the line has one", () => {
  const html = renderToStaticMarkup(
    <SamView
      state={{ kind: "request", item: { id: "basket", name: "2 things", cents: 2578 }, askedAt, lines: [batteries, nightLight] }}
    />,
  );

  expect(photos(html)).toEqual(["https://cdn.trychannel3.com/prod_4Ms8nL"]);
  expect(notes(html)).toBe(1);
  expect(text(html)).toContain("Good to know: It needs 3 AAA batteries, which aren't included.");
  expect(text(html).split("Why it fits:").length - 1).toBe(2);
});

it("tells Sam how far over Sam's limit one thing is, above the ask, and says nothing under it", () => {
  const cane = { id: "prod_2Sq8aQ", name: "Small Base Aluminum Quad Cane", cents: 2389 };
  const found = { shop: "staples.com", url: "https://www.staples.com/p/prod_2Sq8aQ", reason: "It stands up on its own." };
  const over = renderToStaticMarkup(<SamView state={{ kind: "request", item: cane, askedAt, found, limitCents: 2000 }} />);
  expect(over).toMatch(/^<div class="screen"><p class="notice"[^>]*>This is \$3\.89 over your \$20 limit\.<\/p><h1>Rose would like this<\/h1>/);
  expect(over).toMatch(/<button[^>]*>OK, pay \$23\.89<\/button>/);

  const under = renderToStaticMarkup(<SamView state={{ kind: "request", item: cane, askedAt, found, limitCents: 2500 }} />);
  expect(under).not.toContain("over your");
});

it("marks only the basket lines over Sam's limit, each with how far over it is", () => {
  const chair = {
    id: "prod_7Fb4sH",
    name: "Folding Bath Seat Bench Shower Chair",
    cents: 4499,
    shop: "bestbuy.com",
    url: "https://www.bestbuy.com/p/prod_7Fb4sH",
    reason: "It folds flat against the wall when nobody is using it.",
    thing: "a folding shower chair",
  };
  const html = renderToStaticMarkup(
    <SamView
      state={{
        kind: "request",
        item: { id: "basket", name: "2 things", cents: 5378 },
        askedAt,
        lines: [batteries, chair],
        limitCents: 3000,
      }}
    />,
  );

  expect(html.match(/ over your/g)).toHaveLength(1);
  expect(html).toMatch(/Folding Bath Seat Bench Shower Chair.*<span><strong>\$14\.99 over your \$30 limit\.<\/strong><\/span>/);
  expect(html).not.toMatch(/Duracell Coppertop AA Batteries, 8 Pack.*over your.*Folding Bath Seat/);
  expect(html).not.toContain("This is");
});

const slippers = { id: "prod_3Df7cS", name: "Dearfoams Women's Cozy Comfort Slippers", cents: 2499 };
const receipt = {
  item: { id: "basket", name: "1 thing", cents: 879 },
  paidAt: askedAt,
  transactionId: "7BM91101S1572292D",
  lines: [batteries],
  leftOut: ["a night light"],
};
const sam = (state: Parameters<typeof SamView>[0]["state"]) => text(renderToStaticMarkup(<SamView state={state} />));

it("offers Sam Find another under a No and a left-out thing, saying Rose picks from what it finds", () => {
  expect(sam({ kind: "nothing", declined: slippers, again: "offer" })).toContain(
    "You said no to Dearfoams Women's Cozy Comfort Slippers. Rose can see that.Find anotherKinCart looks again for Rose, without the one you said no to. Rose picks from what it finds.",
  );
  expect(sam({ kind: "nothing", declined: { id: "basket", name: "2 things", cents: 2578 }, lines: [batteries, nightLight], again: "offer" })).toContain(
    "KinCart looks again for each of Rose's things, without the ones you said no to. Rose picks from what it finds.",
  );
  expect(sam({ kind: "paid", receipt, again: "offer" })).toContain(
    "You left out a night light. Rose can ask for it again.Find anotherKinCart looks again for Rose, without the one you left out. Rose picks from what it finds.",
  );
  expect(sam({ kind: "paid", receipt: { ...receipt, leftOut: ["a night light", "a phone charger"] }, again: "offer" })).toContain(
    "without the ones you left out.",
  );
  expect(sam({ kind: "nothing", declined: slippers })).not.toContain("Find another");
  expect(sam({ kind: "paid", receipt })).not.toContain("Find another");
});

it("tells Sam how the search for Rose ended, with no second Find another", () => {
  const found = sam({ kind: "nothing", declined: slippers, again: "options" });
  expect(found).toContain("KinCart found new options for Rose. Rose picks one and asks you.");
  expect(found).not.toContain("Find another");
  expect(sam({ kind: "paid", receipt, again: "options" })).toContain("KinCart found new options for Rose.");
  const nothing = sam({ kind: "nothing", declined: slippers, again: "nothing" });
  expect(nothing).toContain("KinCart looked again and found nothing. Rose can try different words.");
  expect(nothing).not.toContain("Find another");
});

it("puts the day's limit notice on top of Sam's page, and keeps Find another under the No", () => {
  expect(sam({ kind: "nothing", declined: slippers, again: "offer", waitMinutes: 170 })).toMatch(
    /^That's a lot of Finds from here today\. Try again in 3 hours\.You said no to .*Find another/,
  );
  expect(sam({ kind: "nothing", declined: slippers, again: "offer" })).not.toContain("a lot of Finds");
});

const paidBatteries = {
  kind: "paid" as const,
  receipt: { item: { id: "prod_2Dc8aA", name: batteries.name, cents: 879 }, paidAt: askedAt, transactionId: "3VD91528KJ402714T" },
};

it("offers Sam new links under the limits, as a form that opens the confirm screen", () => {
  const html = renderToStaticMarkup(<SamView state={paidBatteries} limit={{ cents: 4000 }} links={{ kind: "offer" }} />);

  expect(text(html)).toContain("Your links");
  expect(text(html)).toContain("If someone else may have seen Rose's link or yours, make new ones.");
  const button = html.match(/<button[^>]*>Make new links<\/button>/)![0];
  expect(button).toContain('name="links"');
  expect(button).toContain('value="new"');
});

it("asks Sam before making new links, with Make new links and Keep these", () => {
  const html = renderToStaticMarkup(<SamView state={paidBatteries} links={{ kind: "confirm" }} />);

  expect(text(html)).toContain("Make new links?");
  expect(text(html)).toContain("Rose's old link stops working.");
  expect(text(html)).toContain("Notifications turn off on both phones");
  expect(text(html)).toContain("Keep these");
  expect(text(html)).not.toContain("Paid");
});

it("shows Sam's new page with Rose's new link to send, and Copy", () => {
  const roseLink = "https://kincart.vercel.app/r/Qm7vT2kXp9Lw4NcR8sYb3A";
  const html = renderToStaticMarkup(<SamView state={paidBatteries} links={{ kind: "made", roseLink }} />);

  expect(text(html)).toContain("New links made. This page is your new link");
  expect(text(html)).toContain("Send Rose this new link");
  expect(text(html)).toContain(roseLink);
  expect(text(html)).toContain("Copy");
  expect(text(html)).toContain("Your links");
});

it("shows no Your links without links, as for household 1 or inside the home page's phones", () => {
  const html = renderToStaticMarkup(<SamView state={paidBatteries} limit={{ cents: 4000 }} />);

  expect(text(html)).not.toContain("Your links");
  expect(text(html)).not.toContain("Make new links");
});

const askedBatteries = {
  kind: "request" as const,
  item: { id: batteries.id, name: batteries.name, cents: batteries.cents },
  askedAt,
  found: { shop: batteries.shop, url: batteries.url, reason: batteries.reason },
};

it("tells Sam an OK without the passkey paid nothing, for one thing and for a basket", () => {
  const notice = "Not paid. This OK needs your face or fingerprint, on the phone that turned it on.";
  expect(text(renderToStaticMarkup(<SamView state={askedBatteries} refused="ok" />))).toContain(notice);
  const basket = { kind: "request" as const, item: { id: "basket", name: "2 things", cents: 2578 }, askedAt, lines: [nightLight, batteries] };
  const html = renderToStaticMarkup(<SamView state={basket} refused="ok" />);
  expect(text(html)).toContain(notice);
  expect(text(html)).toContain("OK, pay $25.78");
  expect(text(renderToStaticMarkup(<SamView state={askedBatteries} />))).not.toContain("Not paid.");
});

it("tells Sam new links without the passkey made nothing, on the confirm screen", () => {
  const html = renderToStaticMarkup(<SamView state={paidBatteries} links={{ kind: "confirm" }} refused="links" />);
  expect(text(html)).toContain("No new links made. This needs your face or fingerprint, on the phone that turned it on.");
  expect(text(html)).toContain("Make new links?");
});

it("opens Sam's own page in a new tab for an OK inside the home page's phones", () => {
  const html = renderToStaticMarkup(<SamView state={askedBatteries} okInTab="/h/sam-link-b81d5e30" />);
  const ok = html.match(/<button[^>]*>OK, pay \$8.79<\/button>/)![0];
  expect(ok).toContain('formAction="/h/sam-link-b81d5e30"');
  expect(ok).toContain('formTarget="_blank"');
  expect(ok).not.toContain('name="answer"');
  expect(text(html)).toContain("OK opens your own page in a new tab, to ask for your face or fingerprint.");
});

it("shows Confirm each OK only where the page passes it", () => {
  const off = <PasskeySection state={{ kind: "off" }} />;
  const html = renderToStaticMarkup(<SamView state={paidBatteries} passkey={off} />);
  expect(text(html)).toContain("Confirm each OK");
  expect(text(html)).toContain("Then your link alone can't spend Rose's money.");
  expect(text(html)).toContain("If you lose this phone and its passkeys don't sync, you'd need to start a new KinCart.");
  expect(text(renderToStaticMarkup(<SamView state={paidBatteries} />))).not.toContain("Confirm each OK");
});

it("says what Turn on and Turn off did", () => {
  const says = (state: PasskeyState) => text(renderToStaticMarkup(<PasskeySection state={state} />));
  expect(says({ kind: "on", saved: true })).toContain("Turned on. Your next OK asks for your face or fingerprint.");
  expect(says({ kind: "on" })).toContain("Turn off");
  expect(says({ kind: "off", error: true })).toContain("Not turned on. Your phone didn't save a passkey.");
  expect(says({ kind: "on", refused: true })).toContain("Still on. Turning it off needs your face or fingerprint");
  expect(says({ kind: "off", saved: true })).toContain("Turned off. Each OK pays with one tap again.");
});

it("tells the server Sam's answer came from a home page phone", () => {
  const html = renderToStaticMarkup(<SamView state={askedBatteries} okInTab="/h/sam-link-b81d5e30" inPhone />);
  expect(html).toContain('<input type="hidden" name="in" value="phone"/>');
  const basket = { kind: "request" as const, item: { id: "basket", name: "2 things", cents: 2578 }, askedAt, lines: [nightLight, batteries] };
  expect(renderToStaticMarkup(<SamView state={basket} inPhone />)).toContain('name="in" value="phone"');
  expect(renderToStaticMarkup(<SamView state={askedBatteries} />)).not.toContain('name="in"');
});
