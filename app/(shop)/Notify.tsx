import { useId } from "react";
import { Button } from "./Button";
import { HELPER, RELATIVE } from "./ui";

export type NotifyState =
  | { kind: "off"; busy?: boolean; error?: boolean }
  | { kind: "on" }
  | { kind: "blocked" }
  | { kind: "home screen first" }
  | { kind: "not supported" };

type Props = { who: "rose" | "sam"; state: NotifyState; turnOn?: () => void };

export function NotifySection({ who, state, turnOn }: Props) {
  const labelId = useId();
  const errorId = useId();
  const when = who === "sam" ? `${RELATIVE} asks for something` : `${HELPER} answers`;
  const error = state.kind === "off" && state.error;

  return (
    <section className="stack notify" aria-labelledby={labelId}>
      <div className="heading">
        <p className="field-label" id={labelId}>
          Notifications
        </p>
        <p className="small" aria-live="polite">
          {state.kind === "off" && `Turn them on to get a buzz when ${when}, even with this page closed.`}
          {state.kind === "on" && `On. Your phone will buzz when ${when}.`}
          {state.kind === "blocked" &&
            "Blocked on this phone. To get them, allow notifications for this site in your browser's settings. Until then, keep this page open."}
          {state.kind === "home screen first" &&
            "On iPhone, add this page to your Home Screen first: tap Share, then Add to Home Screen. Then open KinCart from your Home Screen and turn them on there."}
          {state.kind === "not supported" && `This browser can't show notifications. Keep this page open to see when ${when}.`}
        </p>
      </div>
      {state.kind === "off" && (
        <Button
          type="button"
          kind="secondary"
          busy={state.busy}
          busyLabel="Turning on…"
          onClick={turnOn}
          aria-describedby={error ? errorId : undefined}
        >
          Turn on notifications
        </Button>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          Couldn&apos;t turn them on. Try again in a minute.
        </p>
      )}
    </section>
  );
}
