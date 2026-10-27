import { expect, it } from "vitest";
import { checkCreate, checkGet, createOptions, getOptions } from "./passkey";
import { created, origin, phone, signed } from "./passkeyPhone";

it("asks for a passkey that needs Sam's face or fingerprint, on KinCart's host", async () => {
  const options = await createOptions(origin);
  expect(options.rp.id).toBe("kincart.vercel.app");
  expect(options.authenticatorSelection?.userVerification).toBe("required");

  const get = await getOptions(origin, "BwcHBw");
  expect(get.rpId).toBe("kincart.vercel.app");
  expect(get.userVerification).toBe("required");
  expect(get.allowCredentials).toEqual([{ id: "BwcHBw", type: "public-key" }]);
});

it("saves a passkey made for this challenge with Sam's face or fingerprint", async () => {
  const key = phone();
  expect(await checkCreate(created(key, "turn-on"), "turn-on", origin)).toEqual({
    credentialId: key.credentialId,
    publicKey: new Uint8Array(key.cose),
  });
  expect(await checkCreate(created(key, "old"), "turn-on", origin)).toBeNull();
  expect(await checkCreate(created(key, "turn-on", 0x41), "turn-on", origin)).toBeNull();
  expect(await checkCreate("not json at all", "turn-on", origin)).toBeNull();
});

it("passes only Sam's own signature, for this challenge, this site and a face or fingerprint", async () => {
  const key = phone();
  const stored = { credentialId: key.credentialId, publicKey: new Uint8Array(key.cose) };

  expect(await checkGet(signed(key, "pay-1299"), stored, "pay-1299", origin)).toBe(true);
  expect(await checkGet(signed(key, "an-old-one"), stored, "pay-1299", origin)).toBe(false);
  expect(await checkGet(signed(key, "pay-1299", 0x01), stored, "pay-1299", origin)).toBe(false);
  expect(await checkGet(signed(key, "pay-1299", 0x05, "https://kincart.example"), stored, "pay-1299", origin)).toBe(false);

  const leaker = phone();
  expect(await checkGet(signed({ ...leaker, credentialId: key.credentialId }, "pay-1299"), stored, "pay-1299", origin)).toBe(false);
  expect(await checkGet(signed(phone("kincart.example"), "pay-1299"), stored, "pay-1299", origin)).toBe(false);
  expect(await checkGet("", stored, "pay-1299", origin)).toBe(false);
});
