"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "./Button";

// Share opens the phone's share sheet, where the browser has one. Copy works everywhere a page is
// served over https.
export function ShareLink({ url, title }: { url: string; title: string }) {
  const canShare = useSyncExternalStore(still, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="stack">
      {canShare && (
        <Button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})}>
          Share
        </Button>
      )}
      <Button
        type="button"
        kind={canShare ? "secondary" : "primary"}
        onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
      >
        Copy
      </Button>
      <p className="small" aria-live="polite">
        {copied && "Copied."}
      </p>
    </div>
  );
}

const still = () => () => {};
