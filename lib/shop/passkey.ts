import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

export type Passkey = { credentialId: string; publicKey: Uint8Array<ArrayBuffer> };

// Every passkey needs Sam's face or fingerprint, not only a tap (D122), and belongs to KinCart's own host.
export async function createOptions(origin: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpName: "KinCart",
    rpID: new URL(origin).hostname,
    userName: "Sam",
    userDisplayName: "Sam",
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
  });
}

export async function getOptions(origin: string, credentialId: string): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return generateAuthenticationOptions({
    rpID: new URL(origin).hostname,
    allowCredentials: [{ id: credentialId }],
    userVerification: "required",
  });
}

// The phone's answer to Turn on, as the page sent it, with the challenge it signed. The caller then uses that
// challenge up (D132). Anything the library can't verify saves nothing.
export async function checkCreate(answer: unknown, origin: string): Promise<(Passkey & { challenge: string }) | null> {
  let challenge = "";
  try {
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response: parsed(answer),
      expectedChallenge: (signed) => !!(challenge = signed),
      expectedOrigin: origin,
      expectedRPID: new URL(origin).hostname,
      requireUserVerification: true,
    });
    return verified
      ? { credentialId: registrationInfo.credential.id, publicKey: registrationInfo.credential.publicKey, challenge }
      : null;
  } catch {
    return null;
  }
}

// The challenge that the phone's answer for one OK, Make new links or Turn off signed, once the signature passes.
// The caller then uses it up (D132). Any throw refuses, so a fault never pays.
export async function checkGet(answer: unknown, passkey: Passkey, origin: string): Promise<string | null> {
  let challenge = "";
  try {
    const { verified } = await verifyAuthenticationResponse({
      response: parsed(answer),
      expectedChallenge: (signed) => !!(challenge = signed),
      expectedOrigin: origin,
      expectedRPID: new URL(origin).hostname,
      credential: { id: passkey.credentialId, publicKey: passkey.publicKey, counter: 0 },
      requireUserVerification: true,
    });
    return verified ? challenge : null;
  } catch {
    return null;
  }
}

function parsed<T>(answer: unknown): T {
  return (typeof answer === "string" ? JSON.parse(answer) : answer) as T;
}
