import { expect, it } from "vitest";
import { ping } from "./pings";

const slippers = { id: "fireside", name: "Dearfoams Women's Fireside Slipper", cents: 2499 };

it("tells Sam what Rose would like and what it costs", () => {
  expect(ping("asked", { item: slippers })).toEqual({
    to: "sam",
    title: "Rose would like something",
    body: "Dearfoams Women's Fireside Slipper, $24.99. Tap to see it and say OK or No.",
  });
});

it("tells Rose whether Sam's answer paid, said no, or the payment failed", () => {
  expect(ping("paid", { item: slippers })).toEqual({
    to: "rose",
    title: "Sam said OK",
    body: "Dearfoams Women's Fireside Slipper is paid: $24.99. Tap to see the receipt.",
  });
  expect(ping("declined", { item: slippers })).toEqual({
    to: "rose",
    title: "Sam said no",
    body: "Sam said no to Dearfoams Women's Fireside Slipper. Nothing was taken.",
  });
  expect(ping("failed", { item: slippers })).toEqual({
    to: "rose",
    title: "Payment didn't go through",
    body: "Sam said OK, but the payment didn't go through. Nothing was taken.",
  });
});

const line = (id: string, name: string, cents: number, thing: string) => ({
  id,
  name,
  cents,
  shop: "amazon.com",
  url: `https://www.amazon.com/dp/${id}`,
  reason: "It fits.",
  thing,
});
const aa = line("B00MNV8E0C", "Amazon Basics 24-Pack AA Alkaline Batteries", 999, "AA batteries");
const light = line("B07QJ1RT1G", "Plug-In LED Night Light, 2 Pack", 1249, "a night light");
const basket = { id: "basket", name: "2 things", cents: 2248 };

it("tells Sam how many things Rose would like and the total", () => {
  expect(ping("asked", { item: basket, lines: [aa, light] })).toEqual({
    to: "sam",
    title: "Rose would like 2 things",
    body: "$22.48 in total. Tap to see them and say OK or No.",
  });
});

it("tells Rose a basket was paid, what Sam left out, or that Sam said no", () => {
  expect(ping("paid", { item: basket, lines: [aa, light], leftOut: null })).toEqual({
    to: "rose",
    title: "Sam said OK",
    body: "Your 2 things are paid: $22.48. Tap to see the receipt.",
  });
  expect(ping("paid", { item: { ...basket, name: "1 thing", cents: 999 }, lines: [aa], leftOut: ["a night light"] })).toEqual({
    to: "rose",
    title: "Sam said OK",
    body: "Sam paid $9.99 for 1 thing and left out a night light. Tap to see the receipt.",
  });
  expect(ping("declined", { item: basket, lines: [aa, light] })).toEqual({
    to: "rose",
    title: "Sam said no",
    body: "Sam said no to your 2 things. Nothing was taken.",
  });
  expect(ping("failed", { item: basket, lines: [aa, light] }).body).toBe(
    "Sam said OK, but the payment didn't go through. Nothing was taken.",
  );
});
