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
