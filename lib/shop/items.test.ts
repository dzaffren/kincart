import { expect, it } from "vitest";
import { findItem } from "./items";

it("finds an item and its price by id", () => {
  expect(findItem("glasses")).toEqual({ id: "glasses", name: "Reading glasses, +2.00", cents: 1899 });
});

it("finds nothing for an id that isn't on the list", () => {
  expect(findItem("caviar")).toBeUndefined();
  expect(findItem(null)).toBeUndefined();
});
