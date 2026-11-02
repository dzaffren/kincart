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

it("saves a passkey made with Sam's face or fingerprint, with the challenge it signed", async () => {
  const key = phone();
  expect(await checkCreate(created(key, "turn-on"), origin)).toEqual({
    credentialId: key.credentialId,
    publicKey: new Uint8Array(key.cose),
    challenge: "turn-on",
  });
  expect(await checkCreate(created(key, "turn-on", 0x41), origin)).toBeNull();
  expect(await checkCreate("not json at all", origin)).toBeNull();
});

it("passes only Sam's own signature, for this site and a face or fingerprint, and gives the challenge it signed", async () => {
  const key = phone();
  const stored = { credentialId: key.credentialId, publicKey: new Uint8Array(key.cose) };

  expect(await checkGet(signed(key, "pay-1299"), stored, origin)).toBe("pay-1299");
  expect(await checkGet(signed(key, "pay-1299", 0x01), stored, origin)).toBeNull();
  expect(await checkGet(signed(key, "pay-1299", 0x05, "https://kincart.example"), stored, origin)).toBeNull();

  const leaker = phone();
  expect(await checkGet(signed({ ...leaker, credentialId: key.credentialId }, "pay-1299"), stored, origin)).toBeNull();
  expect(await checkGet(signed(phone("kincart.example"), "pay-1299"), stored, origin)).toBeNull();
  expect(await checkGet("", stored, origin)).toBeNull();
});
