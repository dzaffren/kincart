import { beforeAll, expect, it } from "vitest";
import { migrate } from "../../scripts/migrate.mjs";
import { checkDatabase } from "./database";

const url = process.env.DATABASE_URL;

beforeAll(async () => {
  await migrate("up", url);
});

it("writes a fresh check on every call", async () => {
  const first = await checkDatabase(url);
  const second = await checkDatabase(url);

  expect(first.state).toBe("ok");
  expect(second.state).toBe("ok");
  if (first.state === "ok" && second.state === "ok") {
    expect(second.checkId).toBe(first.checkId + 1);
    expect(second.checkedAt.getTime()).toBeGreaterThanOrEqual(first.checkedAt.getTime());
  }
});

it("says not configured when there is no DATABASE_URL", async () => {
  expect(await checkDatabase("")).toEqual({ state: "not configured" });
});

it("says not reachable when the database refuses connections", async () => {
  expect(await checkDatabase("postgres://u:p@127.0.0.1:1/x")).toEqual({
    state: "not reachable",
    reason: "ECONNREFUSED",
  });
});
