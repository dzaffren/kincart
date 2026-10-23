import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Group } from "../../lib/shop/find";
import { RoseView, type RoseState } from "./RoseView";

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

it("says the AI's words came from Rose's photos, and how many of them showed nothing to buy", () => {
  const one = renderToStaticMarkup(
    <RoseView
      state={{ kind: "options", limitCents: 2500, words: "CR2032 coin battery", fromPhoto: true, photos: 2, listings: [aa24, aa16, belkin] }}
      items={[]}
    />,
  );
  expect(one).toContain("For “CR2032 coin battery”, from your photos.");
  expect(one).not.toContain("showed nothing to buy");

  const list = renderToStaticMarkup(
    <RoseView
      state={{ kind: "basket", limitCents: 5000, words: "AA batteries, a phone charger", fromPhoto: true, photos: 3, blankPhotos: 1, groups }}
      items={[]}
    />,
  );
  expect(list).toContain("For “AA batteries, a phone charger”, from your photos. Pick one");
  expect(list).toMatch(/One of your photos showed nothing to buy\.<\/p><div class="heading"><h1>Which ones would you like\?/);

  const two = renderToStaticMarkup(
    <RoseView
      state={{ kind: "options", limitCents: 2500, words: "CR2032 coin battery", fromPhoto: true, photos: 3, blankPhotos: 2, listings: [aa24] }}
      items={[]}
    />,
  );
  expect(two).toContain("2 of your photos showed nothing to buy.");

  const nothing = renderToStaticMarkup(
    <RoseView state={{ kind: "ask", limitCents: 5000, words: "", photos: 2, problem: "nothing in photo" }} items={[]} />,
  );
  expect(nothing).toContain("Couldn&#x27;t tell what to buy from those photos. Try other photos, or type what you need.");
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
  const id = /<p tabindex="-1" class="field-error" id="([^"]+)">That file isn&#x27;t a photo\. Pick a photo, or type what you need\.<\/p>/.exec(html)?.[1];

  expect(id).toBeTruthy();
  expect(html).toContain(`aria-describedby="${id}">Take or pick a photo</button>`);
});

it("tells Rose when Find works again after the day's limit, in hours or minutes, with Rose's words in the box", () => {
  const stopped = (waitMinutes: number) =>
    renderToStaticMarkup(
      <RoseView
        state={{ kind: "ask", limitCents: 2500, words: "a night light", problem: "limit", waitMinutes }}
        items={[]}
      />,
    );

  expect(stopped(180)).toContain("That&#x27;s a lot of Finds from here today. Try again in 3 hours.");
  expect(stopped(180)).toContain(">a night light</textarea>");
  expect(stopped(61)).toContain("Try again in 2 hours.");
  expect(stopped(60)).toContain("Try again in 1 hour.");
  expect(stopped(25)).toContain("Try again in 25 minutes.");
  expect(stopped(1)).toContain("Try again in 1 minute.");
});

it("says on the receipt that the money went to KinCart's sandbox shop, not the shops", () => {
  const html = renderToStaticMarkup(
    <RoseView
      state={{
        kind: "paid",
        receipt: {
          item: { id: "prod_6Fm3gL", name: "Fancii 3X Large Magnifying Glass with Light", cents: 1699 },
          paidAt: new Date("2026-10-23T10:16:00Z"),
          transactionId: "3GX51882JM604122T",
        },
      }}
      items={[]}
    />,
  );

  expect(html).toContain("Paid to KinCart&#x27;s sandbox shop. In this demo, no order reaches the shops.");
});

const render = (state: RoseState) => renderToStaticMarkup(<RoseView state={state} items={[]} findAnother={async () => {}} />);
const findAnother = (hint: string) => new RegExp(`<button[^>]*>Find another</button><p class="small">${hint}</p>`);
const jar = "something to grip jar lids";
const lamp = "a lamp for reading in bed";

it("offers Find another under an empty Find's notice, then says Still and offers none once it ran", () => {
  const empty = render({ kind: "ask", limitCents: 5000, words: jar, problem: "nothing found" });
  expect(empty).toContain("Couldn&#x27;t find that. Try different words.");
  expect(empty).toMatch(findAnother("KinCart tries other words for you."));

  const over = render({ kind: "ask", limitCents: 2000, words: lamp, problem: "over limit" });
  expect(over).toContain("Nothing under $20 for that. Try different words, or ask Sam to raise the limit.");
  expect(over).toMatch(findAnother("KinCart tries other words for you."));

  const still = render({ kind: "ask", limitCents: 5000, words: jar, problem: "nothing found", tried: true });
  expect(still).toContain("Still couldn&#x27;t find that. Try different words.");
  expect(still).not.toContain("Find another");

  const stillOver = render({ kind: "ask", limitCents: 2000, words: lamp, problem: "over limit", tried: true });
  expect(stillOver).toContain("Still nothing under $20 for that. Try different words, or ask Sam to raise the limit.");
  expect(stillOver).not.toContain("Find another");
  expect(stillOver).toContain(`>${lamp}</textarea>`);

  expect(render({ kind: "ask", limitCents: 5000, words: jar, problem: "too many" })).not.toContain("Find another");
  expect(render({ kind: "ask", limitCents: 5000 })).not.toContain("Find another");
});

const dearfoams = { id: "prod_2Df7cZ", name: "Dearfoams Women's Cozy Comfort Slippers", cents: 2499 };
const line = (thing: string, { id, name, cents }: typeof aa24) => ({ id, name, cents, shop: "amazon.com", url: "https://www.amazon.com/", reason: "", thing });

it("offers Find another under Sam's No, for one thing and for a basket, and not after a failed charge", () => {
  const one = render({ kind: "ask", limitCents: 5000, outcome: { kind: "declined", item: dearfoams } });
  expect(one).toContain("Sam said no to Dearfoams Women&#x27;s Cozy Comfort Slippers.");
  expect(one).toMatch(findAnother("KinCart looks again with other words, without the one Sam said no to."));

  const lines = [line("AA batteries", aa24), line("a phone charger", belkin)];
  const basket = render({ kind: "ask", limitCents: 5000, outcome: { kind: "declined", item: dearfoams, lines } });
  expect(basket).toContain("Sam said no to your 2 things. Nothing was taken.");
  expect(basket).toMatch(findAnother("KinCart looks again for each thing, without the ones Sam said no to."));

  expect(render({ kind: "ask", limitCents: 5000, outcome: { kind: "failed", item: dearfoams } })).not.toContain("Find another");
});

const trimmed = {
  item: { id: "basket", name: "1 thing", cents: 999 },
  paidAt: new Date("2026-10-22T10:16:00Z"),
  transactionId: "7KT20419UA331082M",
  lines: [line("AA batteries", aa24)],
};

it("offers Find another on the receipt for what Sam left out, above Ask for something else", () => {
  const one = render({ kind: "paid", receipt: { ...trimmed, leftOut: ["a night light"] } });
  expect(one).toContain("Sam left out a night light.");
  expect(one).toMatch(
    /<button[^>]*>Find another<\/button><p class="small">KinCart looks again with other words, without the one Sam left out.<\/p><\/form><a [^>]*>Ask for something else<\/a>/,
  );

  const two = render({ kind: "paid", receipt: { ...trimmed, leftOut: ["a night light", "a phone charger"] } });
  expect(two).toMatch(findAnother("KinCart looks again with other words, without the ones Sam left out."));

  expect(render({ kind: "paid", receipt: trimmed })).not.toContain("Find another");
});

it("offers Find another in a basket group that found nothing, sent with the Ask Sam form and named by its group", () => {
  const html = render({
    kind: "basket",
    limitCents: 5000,
    words: `AA batteries, ${jar}, ${lamp}`,
    groups: [
      { thing: "AA batteries", options: [aa24] },
      { thing: jar, options: [], problem: "nothing found" },
      { thing: lamp, options: [], problem: "over limit", tried: true },
    ],
  });

  const [form] = html.match(/<form[^>]*>.*<\/form>/)!;
  const [another] = form.match(/<button[^>]*>Find another<\/button>/)!;
  expect(another).toContain('name="another"');
  expect(another).toContain('value="1"');
  expect(another).not.toContain("formAction");
  const [askSam] = form.match(/<button[^>]*>Ask Sam<\/button>/)!;
  expect(askSam).toContain('name="ask"');
  expect(askSam).toContain('value="sam"');
  expect(form).toContain("Couldn&#x27;t find this one.");
  expect(form).toContain('<p class="small">KinCart tries other words for this one.</p>');
  expect(form).toContain("Still nothing under $50 for this one.");
  expect(form.match(/>Find another</g)).toHaveLength(1);
});

it("says Find another looked again with other words, on its options, its basket, or the one group it searched", () => {
  const listings = [aa24, aa16, belkin];
  expect(render({ kind: "options", limitCents: 5000, words: jar, listings, tried: true })).toContain(
    "For “something to grip jar lids”. Looked again with other words.</p>",
  );
  expect(render({ kind: "options", limitCents: 5000, words: jar, listings })).not.toContain("Looked again");

  const again = groups.map((group) => ({ ...group, tried: true }));
  const basket = render({ kind: "basket", limitCents: 5000, words: "batteries", groups: again, tried: true });
  expect(basket).toContain("For “batteries”. Looked again with other words. Pick one for each thing you want.");
  expect(basket.match(/Looked again/g)).toHaveLength(1);

  const one = render({
    kind: "basket",
    limitCents: 5000,
    words: `AA batteries, ${jar}`,
    groups: [groups[0], { thing: jar, options: [aa16], tried: true }],
  });
  expect(one).toMatch(/<h2[^>]*>something to grip jar lids<\/h2><p class="small">Looked again with other words.<\/p>/);
  expect(one.match(/Looked again/g)).toHaveLength(1);
});

it("puts the day's limit notice on the basket and the receipt, and keeps an empty search's Find another under it", () => {
  const notice = "That&#x27;s a lot of Finds from here today. Try again in 3 hours.";
  expect(render({ kind: "basket", limitCents: 5000, words: "batteries", groups, waitMinutes: 170 })).toContain(notice);
  expect(render({ kind: "basket", limitCents: 5000, words: "batteries", groups })).not.toContain("a lot of Finds");
  expect(render({ kind: "paid", receipt: { ...trimmed, leftOut: ["a night light"] }, waitMinutes: 170 })).toMatch(
    new RegExp(`${notice}.*Find another`),
  );

  const empty = render({ kind: "ask", limitCents: 5000, words: jar, problem: "nothing found", waitMinutes: 170 });
  expect(empty).toContain("Couldn&#x27;t find that. Try different words.");
  expect(empty).toContain(notice);
  expect(empty).toMatch(findAnother("KinCart tries other words for you."));

  const declined = render({
    kind: "ask",
    limitCents: 5000,
    outcome: { kind: "declined", item: dearfoams },
    problem: "limit",
    waitMinutes: 170,
  });
  expect(declined).toContain(notice);
  expect(declined).toMatch(findAnother("KinCart looks again with other words, without the one Sam said no to."));
  expect(declined.match(/a lot of Finds/g)).toHaveLength(1);
});

const energizer = { ...listing("prod_4En8aA", "Energizer MAX AA Batteries, 8 Pack", 899), shop: "walmart.com" };
const anker = listing("prod_2Ak5cH", "Anker 312 USB C Charger, 20W", 1599);
const bought = [
  { id: 41, item: energizer, paidAt: new Date("2026-10-22T10:16:00Z") },
  {
    id: 38,
    item: { id: "basket", name: "2 things", cents: 2498 },
    lines: [line("AA batteries", energizer), line("a phone charger", anker)],
    paidAt: new Date("2026-10-21T16:02:00Z"),
  },
];
const withRebuy = (state: RoseState) =>
  renderToStaticMarkup(<RoseView state={state} items={[]} findAnother={async () => {}} rebuy={async () => {}} />);

it("lists Bought before under Find, each paid ask in a card of its own with its own Ask again, and none before a paid ask", () => {
  const html = withRebuy({ kind: "ask", limitCents: 2000, bought });

  expect(html).toMatch(/Nothing is paid until Sam says OK\.<\/p><section class="stack"[^>]*><div class="heading"><h2[^>]*>Bought before<\/h2>/);
  expect(html).toContain("Ask again looks for the same things at today&#x27;s prices.");
  const forms = [...html.matchAll(/<form class="stack"[^>]*><input type="hidden" name="request" value="(\d+)"\/>(.*?)<\/form>/g)];
  expect(forms.map(([, id]) => id)).toEqual(["41", "38"]);
  expect(forms[0][2]).toMatch(/<li><span>Energizer MAX AA Batteries, 8 Pack<\/span><span class="line-price">\$8\.99<\/span><\/li>/);
  expect(forms[0][2]).not.toContain("summary-title");
  expect(forms[1][2]).toContain('<p class="summary-title">2 things</p>');
  expect(forms[1][2]).toContain("Anker 312 USB C Charger, 20W");
  expect(forms.every(([, , card]) => /Paid <time[^>]*><\/time>.*<button[^>]*>Ask again<\/button>/.test(card))).toBe(true);

  expect(withRebuy({ kind: "ask", limitCents: 2000 })).not.toContain("Bought before");
});

it("marks last time's listing, and says the price, the shop or both changed, or that neither did", () => {
  const options = (cents: number, shop: string) =>
    withRebuy({
      kind: "options",
      limitCents: 2000,
      words: "AA batteries",
      listings: [{ ...energizer, cents, shop }, aa24, aa16],
      picked: energizer.id,
      last: { id: energizer.id, cents: 899, shop: "walmart.com" },
    });
  const mark = (change: string) => `<span><strong>You bought this last time.</strong> ${change}</span>`;

  expect(options(899, "walmart.com")).toContain(mark("Same price as last time."));
  expect(options(949, "walmart.com")).toContain(mark("Now $9.49. It was $8.99."));
  expect(options(899, "target.com")).toContain(mark("Now from target.com. It was from walmart.com."));
  expect(options(949, "target.com")).toContain(mark("Now $9.49 from target.com. It was $8.99 from walmart.com."));
  expect(options(899, "walmart.com")).toContain("For “AA batteries”. Today&#x27;s prices for what you bought before.</p>");
  expect(options(899, "walmart.com").match(/You bought this last time/g)).toHaveLength(1);
  expect(withRebuy({ kind: "options", limitCents: 2000, words: "AA batteries", listings: [aa24] })).not.toMatch(
    /last time|what you bought before/,
  );
});

it("says when last time's listing is over Sam's limit now, or wasn't found today, and not for a group that found nothing", () => {
  const options = (nowCents?: number) =>
    withRebuy({
      kind: "options",
      limitCents: 800,
      words: "AA batteries",
      listings: [aa24],
      last: { id: energizer.id, cents: 899, shop: "walmart.com", nowCents },
    });
  expect(options(949)).toMatch(/^<div class="screen"><p class="notice"[^>]*>The one you bought last time is \$9\.49 now, over Sam&#x27;s \$8 limit\.<\/p>/);
  expect(options()).toMatch(/^<div class="screen"><p class="notice"[^>]*>Couldn&#x27;t find the one you bought last time today\.<\/p>/);
  expect(options()).not.toContain("<strong>You bought this last time.</strong>");
  // Sam raised the limit after the Ask again ran, so $9.49 is no longer over it.
  const raised = withRebuy({
    kind: "options",
    limitCents: 2000,
    words: "AA batteries",
    listings: [aa24],
    last: { id: energizer.id, cents: 899, shop: "walmart.com", nowCents: 949 },
  });
  expect(raised).toMatch(/^<div class="screen"><p class="notice"[^>]*>The one you bought last time is \$9\.49 now\.<\/p>/);
  expect(raised).not.toContain("over Sam");

  const basket = withRebuy({
    kind: "basket",
    limitCents: 2000,
    words: "AA batteries and a phone charger",
    groups: [
      { thing: "AA batteries", options: [energizer, aa24], last: { id: energizer.id, cents: 899, shop: "walmart.com" } },
      { thing: "a phone charger", options: [belkin], last: { id: anker.id, cents: 1599, shop: "amazon.com" } },
      { thing: "a night light", options: [], problem: "nothing found", last: { id: "prod_6Nl2tL", cents: 1249, shop: "target.com" } },
    ],
    picked: [energizer.id, undefined, undefined],
  });
  expect(basket).toContain("For “AA batteries and a phone charger”. Today&#x27;s prices for what you bought before. Pick one for each");
  expect(basket).toMatch(/<h2[^>]*>a phone charger<\/h2><p class="notice"[^>]*>Couldn&#x27;t find the one you bought last time today\.<\/p>/);
  expect(basket.match(/Couldn&#x27;t find the one you bought last time today/g)).toHaveLength(1);
  expect(basket.match(/<strong>You bought this last time\.<\/strong> Same price as last time\./g)).toHaveLength(1);
});
