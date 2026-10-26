import { createHash, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";
import { expect, it } from "vitest";
import { checkCreate, checkGet, createOptions, getOptions } from "./passkey";

const origin = "https://kincart.vercel.app";

// A phone's passkey, made here: an ES256 key, its COSE form, and the answers a phone would send.
function phone(host = "kincart.vercel.app") {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = publicKey.export({ format: "jwk" });
  const cose = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, isoBase64URL.toBuffer(jwk.x!)],
      [-3, isoBase64URL.toBuffer(jwk.y!)],
    ]),
  );
  const id = new Uint8Array([7, 7, 7, 7]);
  const rpHash = createHash("sha256").update(host).digest();
  return { cose, id, privateKey, rpHash, credentialId: isoBase64URL.fromBuffer(id) };
}

function clientData(type: string, challenge: string, from = origin) {
  return Buffer.from(JSON.stringify({ type, challenge, origin: from }));
}

function created(key: ReturnType<typeof phone>, challenge: string, flags = 0x45) {
  const authData = Buffer.concat([
    key.rpHash,
    Buffer.from([flags]),
    Buffer.alloc(4),
    Buffer.alloc(16),
    Buffer.from([0, key.id.length]),
    key.id,
    key.cose,
  ]);
  const attestationObject = isoCBOR.encode(new Map<string, unknown>([["fmt", "none"], ["attStmt", new Map()], ["authData", authData]]) as never);
  return {
    id: key.credentialId,
    rawId: key.credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON: isoBase64URL.fromBuffer(clientData("webauthn.create", challenge)),
      attestationObject: isoBase64URL.fromBuffer(attestationObject),
    },
  };
}

function signed(key: { credentialId: string; privateKey: KeyObject; rpHash: Buffer }, challenge: string, flags = 0x05, from = origin) {
  const authData = Buffer.concat([key.rpHash, Buffer.from([flags]), Buffer.alloc(4)]);
  const data = clientData("webauthn.get", challenge, from);
  const signature = sign("sha256", Buffer.concat([authData, createHash("sha256").update(data).digest()]), key.privateKey);
  return {
    id: key.credentialId,
    rawId: key.credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON: isoBase64URL.fromBuffer(data),
      authenticatorData: isoBase64URL.fromBuffer(authData),
      signature: isoBase64URL.fromBuffer(signature),
    },
  };
}

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
