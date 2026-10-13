"use client";

import { useEffect, useState } from "react";
import { subscribe } from "./actions";
import { NotifySection, type NotifyState } from "./Notify";
import { notifyState, type NotifyEnv } from "./state";

type Props = { who: "rose" | "sam"; token: string; publicKey: string };

export function NotifyControl({ who, token, publicKey }: Props) {
  const scope = `/${who === "rose" ? "r" : "h"}/${token}`;
  const [state, setState] = useState<NotifyState | null>(null);

  useEffect(() => {
    look(scope).then(
      ({ env, subscription }) => {
        setState(notifyState(env));
        // Puts back a phone the server forgot after a 404 or 410 while this browser still holds it.
        if (subscription) subscribe(token, subscription.toJSON()).catch(() => {});
      },
      () => setState({ kind: "not supported" }),
    );
  }, [scope, token]);

  async function turnOn() {
    setState({ kind: "off", busy: true });
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? { kind: "blocked" } : { kind: "off" });
        return;
      }
      // Scoped to this person's link, so Rose's and Sam's links on one phone each get their own (D28).
      await navigator.serviceWorker.register("/sw.js", { scope });
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(publicKey) }));
      setState((await subscribe(token, subscription.toJSON())) ? { kind: "on" } : { kind: "off", error: true });
    } catch {
      setState({ kind: "off", error: true });
    }
  }

  if (!state) return null;
  return <NotifySection who={who} state={state} turnOn={turnOn} />;
}

async function look(scope: string): Promise<{ env: NotifyEnv; subscription: PushSubscription | null }> {
  const hasServiceWorker = "serviceWorker" in navigator;
  const hasPushManager = "PushManager" in window;
  const registration = hasServiceWorker ? await navigator.serviceWorker.getRegistration(scope) : undefined;
  const subscription = (hasPushManager && (await registration?.pushManager.getSubscription())) || null;
  return {
    env: {
      hasServiceWorker,
      hasPushManager,
      isIPhone: /iPhone|iPad|iPod/.test(navigator.userAgent),
      standalone:
        matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true,
      permission: typeof Notification === "undefined" ? "default" : Notification.permission,
      subscribed: subscription !== null,
    },
    subscription,
  };
}

function bytes(base64url: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64url.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
