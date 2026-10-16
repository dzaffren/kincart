import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Group } from "../../lib/shop/find";
import { RoseView } from "./RoseView";

const listing = (id: string, name: string, cents: number) => ({
  id,
  name,
  cents,
  shop: "amazon.com",
  url: "https://www.amazon.com/",
  what: `${name}.`,
  why: "It is what Rose asked for.",
  watch: "Check the pack size.",
});
const aa24 = listing("prod_3Ba7aA", "Amazon Basics 24-Pack AA Alkaline Batteries", 999);
const aa16 = listing("prod_8En1rG", "Energizer MAX AA Batteries, 16 Count", 1449);
const belkin = listing("prod_7Bk2wC", "Belkin 25W USB-C Wall Charger with 6 ft Cable", 2499);
const groups: Group[] = [
  { thing: "AA batteries", options: [aa24, aa16] },
  { thing: "batteries for the remote", options: [aa24] },
  { thing: "a phone charger", options: [belkin] },
];

function ticked(picked: string[]) {
  const html = renderToStaticMarkup(
    <RoseView
      state={{ kind: "basket", limitCents: 5000, totalCents: 3000, words: "batteries", groups, picked, overCents: 4947 }}
      items={[]}
    />,
  );
  return [...html.matchAll(/<input[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => tag.includes('checked=""'))
    .map((tag) => `${/name="([^"]*)"/.exec(tag)?.[1]}=${/value="([^"]*)"/.exec(tag)?.[1]}`);
}

it("ticks each group's own pick, also when one listing sits in two groups", () => {
  expect(ticked(["prod_8En1rG", "prod_3Ba7aA", "prod_7Bk2wC"])).toEqual([
    "pick-0=prod_8En1rG",
    "pick-1=prod_3Ba7aA",
    "pick-2=prod_7Bk2wC",
  ]);
  expect(ticked(["prod_8En1rG", "", "prod_7Bk2wC"])).toEqual(["pick-0=prod_8En1rG", "pick-1=", "pick-2=prod_7Bk2wC"]);
});

const login = { email: "sb-rose7d2k91@personal.example.com", password: "kincart-rose-1" };

it("starts at Link PayPal, with the demo login and a Skip button", () => {
  const html = renderToStaticMarkup(<RoseView state={{ kind: "not linked" }} items={[]} login={login} />);

  expect(html).toContain("<h1>Link your PayPal to start</h1>");
  expect(html).toContain("Sign in on PayPal with this demo login");
  expect(html).toContain("<dd><span>sb-rose7d2k91</span><wbr/><span>@personal.example.com</span></dd>");
  expect(html).toContain("<dd>kincart-rose-1</dd>");
  expect(html).toMatch(/<button[^>]*>Link PayPal<\/button>/);
  expect(html).toMatch(/<button[^>]*>Skip: use the demo PayPal<\/button>/);
  expect(html).not.toContain("opens in a new tab");
  expect(html).not.toContain('name="in"');
});

it("leaves the login out when none is set, and keeps both buttons after a cancel", () => {
  const html = renderToStaticMarkup(<RoseView state={{ kind: "not linked", cancelled: true }} items={[]} />);

  expect(html).toContain("<h1>PayPal isn&#x27;t linked yet</h1>");
  expect(html).not.toContain("demo login");
  expect(html).toMatch(/<button[^>]*>Link PayPal<\/button>/);
  expect(html).toMatch(/<button[^>]*>Skip: use the demo PayPal<\/button>/);
});

it("in a home page phone, posts Link PayPal to its route in a new tab, and says so", () => {
  const html = renderToStaticMarkup(
    <RoseView state={{ kind: "not linked" }} items={[]} login={login} framedLink="/r/rose-link-4f9c2a7e/link" />,
  );

  expect(html).toMatch(
    /<form [^>]*action="\/r\/rose-link-4f9c2a7e\/link" method="post" target="_blank">.*Link PayPal<\/button>/,
  );
  expect(html).toContain("PayPal opens in a new tab. Come back here when you&#x27;re done.");
  expect(html).toMatch(/<form[^>]*><input type="hidden" name="in" value="phone"\/><button[^>]*>Skip: use the demo PayPal/);
});

it("says PayPal is linked above What do you need?, once Rose is back from PayPal", () => {
  const html = renderToStaticMarkup(<RoseView state={{ kind: "ask", linked: true, limitCents: 5000 }} items={[]} />);

  expect(html).toMatch(/Your PayPal is linked\. You won&#x27;t need to do this again\.<\/p>.*<h1[^>]*>What do you need\?<\/h1>/);
  expect(renderToStaticMarkup(<RoseView state={{ kind: "ask", limitCents: 5000 }} items={[]} />)).not.toContain(
    "PayPal is linked",
  );
});

it("says the AI's words came from Rose's photo, on one thing and on a list", () => {
  const one = renderToStaticMarkup(
    <RoseView
      state={{ kind: "options", limitCents: 2500, words: "CR2032 coin battery", fromPhoto: true, listings: [aa24, aa16, belkin] }}
      items={[]}
    />,
  );
  expect(one).toContain("For “CR2032 coin battery”, from your photo.");

  const list = renderToStaticMarkup(
    <RoseView
      state={{ kind: "basket", limitCents: 5000, words: "AA batteries, a phone charger", fromPhoto: true, groups }}
      items={[]}
    />,
  );
  expect(list).toContain("For “AA batteries, a phone charger”, from your photo. Pick one");

  const typed = renderToStaticMarkup(
    <RoseView state={{ kind: "options", limitCents: 2500, words: "CR2032", listings: [aa24, aa16, belkin] }} items={[]} />,
  );
  expect(typed).not.toContain("from your photo");
});

it("offers a photo under the box, and says when a photo showed nothing to buy or the box and photo were both empty", () => {
  const ask = renderToStaticMarkup(<RoseView state={{ kind: "ask", limitCents: 5000 }} items={[]} />);
  expect(ask).toMatch(/<textarea[^>]*name="words"[^>]*><\/textarea><\/div><div class="stack"><input type="file" accept="image\/\*" multiple="" hidden="" name="photo"\/>/);
  expect(ask).toMatch(/<button type="button"[^>]*>Take or pick a photo<\/button><p class="small">A photo of the thing, or of your written list\.<\/p>/);

  const nothing = renderToStaticMarkup(
    <RoseView state={{ kind: "ask", limitCents: 5000, words: "size 8", problem: "nothing in photo" }} items={[]} />,
  );
  expect(nothing).toContain("Couldn&#x27;t tell what to buy from that photo. Try another photo, or type what you need.");
  expect(nothing).toMatch(/<textarea[^>]*>size 8<\/textarea>/);

  const empty = renderToStaticMarkup(<RoseView state={{ kind: "ask", limitCents: 5000, problem: "empty" }} items={[]} />);
  expect(empty).toContain("Type what you need, or add a photo, first.");
});

it("points the photo button at the not-a-photo error under it", () => {
  const html = renderToStaticMarkup(<RoseView state={{ kind: "ask", limitCents: 5000, problem: "not a photo" }} items={[]} />);
  const id = /<p class="field-error" id="([^"]+)">That file isn&#x27;t a photo\. Pick a photo, or type what you need\.<\/p>/.exec(html)?.[1];

  expect(id).toBeTruthy();
  expect(html).toContain(`aria-describedby="${id}">Take or pick a photo</button>`);
});
