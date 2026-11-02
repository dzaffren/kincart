"use client";

import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { passkeyOptions, turnOffPasskey, turnOnPasskey } from "./actions";
import { PasskeySection, type PasskeyState } from "./Passkey";

type Action = (formData: FormData) => void | Promise<void>;

export function PasskeyControl({ token, on }: { token: string; on: boolean }) {
  // Inside the home page's phones a passkey isn't asked for, so OK opens Sam's own page instead (D125).
  const canAsk = useSyncExternalStore(
    noSubscription,
    () => window.self === window.top && browserSupportsWebAuthn(),
    () => false,
  );
  // What the last Turn on or Turn off did, until the page's refresh agrees with it.
  const [last, setLast] = useState<PasskeyState | null>(null);
  const state: PasskeyState = last && (last.busy || last.kind === (on ? "on" : "off")) ? last : { kind: on ? "on" : "off" };

  async function toggle() {
    if (state.busy) return;
    setLast({ kind: state.kind, busy: true });
    const answer = await phoneAnswer(token);
    if (state.kind === "off") {
      const saved = !!answer && (await turnOnPasskey(token, answer).catch(() => false));
      setLast(saved ? { kind: "on", saved } : { kind: "off", error: true });
    } else {
      const off = await turnOffPasskey(token, answer).catch(() => false);
      setLast(off ? { kind: "off", saved: true } : { kind: "on", refused: true });
    }
  }

  if (!canAsk) return null;
  return <PasskeySection state={state} toggle={toggle} />;
}

// With the passkey on, every send but No first gets the phone's signed answer. A cancel sends none, and the
// server refuses it.
export function GuardedForm({
  guard,
  action,
  className,
  children,
}: {
  guard?: string;
  action?: Action;
  className: string;
  children: ReactNode;
}) {
  async function confirmFirst(formData: FormData) {
    if (formData.get("answer") !== "no") formData.set("passkey", await phoneAnswer(guard!));
    await action?.(formData);
  }

  return (
    <form className={className} action={guard ? confirmFirst : action}>
      {children}
    </form>
  );
}

const noSubscription = () => () => {};

// The phone's answer as JSON, or "" when it has no passkey, Sam cancels, or the browser can't ask.
async function phoneAnswer(token: string): Promise<string> {
  try {
    const asked = await passkeyOptions(token);
    if (!asked) return "";
    const answer =
      asked.kind === "create"
        ? await startRegistration({ optionsJSON: asked.options })
        : await startAuthentication({ optionsJSON: asked.options });
    return JSON.stringify(answer);
  } catch {
    return "";
  }
}
