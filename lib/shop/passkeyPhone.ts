import { createHash, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";

// A phone with a passkey, for tests: it answers Turn on and signs a challenge the way a real phone would.
export const origin = "https://kincart.vercel.app";

export function phone(host = "kincart.vercel.app") {
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

export function created(key: ReturnType<typeof phone>, challenge: string, flags = 0x45) {
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

export function signed(key: { credentialId: string; privateKey: KeyObject; rpHash: Buffer }, challenge: string, flags = 0x05, from = origin) {
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
