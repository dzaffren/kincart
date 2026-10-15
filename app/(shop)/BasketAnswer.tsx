"use client";

import { useState } from "react";
import { things } from "../../lib/shop/items";
import type { Line } from "../../lib/shop/requests";
import { Button } from "./Button";
import { LocalTime } from "./LocalTime";
import { money, RELATIVE, Summary } from "./ui";

type Action = (formData: FormData) => void | Promise<void>;

type Props = { lines: Line[]; askedAt: Date; answer?: Action; busy?: boolean; unticked?: string[] };

// Sam's OK button names the total of the ticked lines, so it changes as Sam ticks.
export function BasketAnswer({ lines, askedAt, answer, busy, unticked = [] }: Props) {
  const [ticked, setTicked] = useState(() => lines.filter((line) => !unticked.includes(line.id)).map((line) => line.id));
  const paying = lines.filter((line) => ticked.includes(line.id));
  const total = paying.reduce((sum, line) => sum + line.cents, 0);

  function toggle(id: string) {
    setTicked((now) => (now.includes(id) ? now.filter((other) => other !== id) : [...now, id]));
  }

  return (
    <>
      <h1>
        {RELATIVE} would like {things(lines.length)}
      </h1>
      <form className="flow" action={answer}>
        {busy ? (
          <>
            <Summary title="Paying" cents={total} lines={paying} />
            <Button type="submit" busy busyLabel="Paying…" />
          </>
        ) : (
          <>
            <Summary title="In total" cents={total} note={`Paid from ${RELATIVE}'s PayPal if you say OK.`} />
            <fieldset className="options">
              <legend className="small">Untick anything you don&apos;t want to pay for.</legend>
              <ul className="lines">
                {lines.map((line) => (
                  <li key={line.id}>
                    <label className="option">
                      <input
                        className="option-input"
                        type="checkbox"
                        name="line"
                        value={line.id}
                        checked={ticked.includes(line.id)}
                        onChange={() => toggle(line.id)}
                      />
                      <span className="option-body listing">
                        <span className="option-box" aria-hidden="true" />
                        <span className="listing-title">
                          <span className="listing-name">{line.name}</span>
                          <span>
                            <span className="option-price">{money(line.cents)}</span>{" "}
                            <span className="small">at {line.shop}</span>
                          </span>
                        </span>
                        <span className="listing-text">
                          {line.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="listing-photo" src={line.imageUrl} alt="" />
                          )}
                          <span>
                            <strong>Why it fits:</strong> {line.reason}
                          </span>
                          {line.watch && (
                            <span>
                              <strong>Good to know:</strong> {line.watch}
                            </span>
                          )}
                        </span>
                      </span>
                    </label>
                    <a className="link" href={line.url} target="_blank" rel="noopener noreferrer">
                      See it on {line.shop}
                    </a>
                  </li>
                ))}
              </ul>
            </fieldset>
            <p className="small">
              Asked at <LocalTime at={askedAt} format="clock" />.
            </p>
            {total ? (
              <Button type="submit" name="answer" value="ok" busyLabel="Paying…">
                OK, pay {money(total)}
              </Button>
            ) : (
              <Button type="button" aria-disabled>
                Tick at least one to pay
              </Button>
            )}
            <Button type="submit" name="answer" value="no" kind="secondary">
              No
            </Button>
          </>
        )}
      </form>
    </>
  );
}
