"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary";
  busy?: boolean;
  busyLabel?: string;
};

export function Button({ kind = "primary", busy, busyLabel, name, value, children, ...props }: ButtonProps) {
  const { pending, data } = useFormStatus();
  const pressed = pending && (!name || data?.get(name) === value);
  const showBusy = busy || pressed;
  return (
    <button
      className={`button button-${kind}`}
      name={name}
      value={value}
      aria-disabled={showBusy || undefined}
      disabled={pending && !pressed}
      {...props}
    >
      {showBusy ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {busyLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
