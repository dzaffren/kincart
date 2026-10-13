import { expect, it } from "vitest";
import { buildLabel } from "./build";

it("shows the first 7 characters of the deployed commit", () => {
  expect(buildLabel("e4f5a6b9c0d1e2f3")).toBe("e4f5a6b");
});

it("shows local when no commit is set", () => {
  expect(buildLabel("")).toBe("local");
});
