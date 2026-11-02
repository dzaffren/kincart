import { useId } from "react";
import { Button } from "./Button";
import { RELATIVE } from "./ui";

// Confirm each OK: off, or on with Sam's passkey, and what the last Turn on or Turn off did.
export type PasskeyState =
  | { kind: "off"; busy?: boolean; error?: boolean; saved?: boolean }
  | { kind: "on"; busy?: boolean; saved?: boolean; refused?: boolean };

type Props = { state: PasskeyState; toggle?: () => void };

export function PasskeySection({ state, toggle }: Props) {
  const labelId = useId();
  const errorId = useId();
  const error =
    (state.kind === "off" && state.error && "Not turned on. Your phone didn't save a passkey.") ||
    (state.kind === "on" && state.refused && "Still on. Turning it off needs your face or fingerprint, on the phone that turned it on.");

  return (
    <section className="stack passkey" aria-labelledby={labelId}>
      <div className="heading">
        <p className="field-label" id={labelId}>
          Confirm each OK
        </p>
        <p className="small" aria-live="polite">
          {state.kind === "off"
            ? `Ask for your face or fingerprint before KinCart pays, makes new links or turns this off. Then your link alone can't spend ${RELATIVE}'s money.`
            : "On. Each OK, Make new links and Turn off ask for your face or fingerprint."}
        </p>
        <p className="small">If you lose this phone and its passkeys don&apos;t sync, you&apos;d need to start a new KinCart.</p>
      </div>
      <Button
        type="button"
        kind="secondary"
        busy={state.busy}
        busyLabel="Checking it's you…"
        onClick={toggle}
        aria-describedby={error ? errorId : undefined}
      >
        {state.kind === "off" ? "Turn on" : "Turn off"}
      </Button>
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
      {state.saved && (
        <p className="small" role="status">
          {state.kind === "on"
            ? "Turned on. Your next OK asks for your face or fingerprint."
            : "Turned off. Each OK pays with one tap again."}
        </p>
      )}
    </section>
  );
}
