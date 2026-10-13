import { expect, it } from "vitest";
import { whoIs } from "./people";

const links = { rose: "rose-link-4f9c2a7e", sam: "sam-link-b81d5e30" };

it("knows Rose and Sam by their own links", () => {
  expect(whoIs("rose-link-4f9c2a7e", links)).toBe("rose");
  expect(whoIs("sam-link-b81d5e30", links)).toBe("sam");
});

it("knows nobody by a wrong, cut-off or empty link", () => {
  expect(whoIs("rose-link-4f9c2a7f", links)).toBeNull();
  expect(whoIs("rose-link-4f9c", links)).toBeNull();
  expect(whoIs("", links)).toBeNull();
});

it("knows nobody when the links aren't set", () => {
  expect(whoIs("", { rose: "", sam: "" })).toBeNull();
  expect(whoIs("rose-link-4f9c2a7e", { rose: undefined, sam: undefined })).toBeNull();
});
