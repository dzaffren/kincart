import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
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
