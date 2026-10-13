import { expect, it } from "vitest";
import { ping } from "./pings";

const slippers = { id: "fireside", name: "Dearfoams Women's Fireside Slipper", cents: 2499 };

it("tells Sam what Rose would like and what it costs", () => {
  expect(ping("asked", slippers)).toEqual({
    to: "sam",
    title: "Rose would like something",
    body: "Dearfoams Women's Fireside Slipper, $24.99. Tap to see it and say OK or No.",
  });
});

it("tells Rose whether Sam's answer paid, said no, or the payment failed", () => {
  expect(ping("paid", slippers)).toEqual({
    to: "rose",
    title: "Sam said OK",
    body: "Dearfoams Women's Fireside Slipper is paid: $24.99. Tap to see the receipt.",
  });
  expect(ping("declined", slippers)).toEqual({
    to: "rose",
    title: "Sam said no",
    body: "Sam said no to Dearfoams Women's Fireside Slipper. Nothing was taken.",
  });
  expect(ping("failed", slippers)).toEqual({
    to: "rose",
    title: "Payment didn't go through",
    body: "Sam said OK, but the payment didn't go through. Nothing was taken.",
  });
});
