"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = { preview?: string; notPhoto?: boolean; busy?: boolean };

// Rose's photo goes with Find and is never kept (D64). A phone offers its camera and its photos.
export function PhotoPicker({ preview, notPhoto = false, busy }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [photo, setPhoto] = useState(preview);
  const [error, setError] = useState(notPhoto);
  // While Find runs, the photo stays on screen and its buttons go, as Try other words does.
  const looking = useFormStatus().pending || busy;

  useEffect(() => () => void (photo?.startsWith("blob:") && URL.revokeObjectURL(photo)), [photo]);

  function remove() {
    if (input.current) input.current.value = "";
    setPhoto(undefined);
  }

  function picked(file?: File) {
    if (!file) return;
    const isPhoto = file.type.startsWith("image/");
    if (!isPhoto) remove();
    setError(!isPhoto);
    if (isPhoto) setPhoto(URL.createObjectURL(file));
  }

  return (
    <div className="stack">
      <input
        ref={input}
        type="file"
        name="photo"
        accept="image/*"
        hidden
        onChange={(event) => picked(event.target.files?.[0])}
      />
      {photo ? (
        <div className="photo-pick">
          {/* A photo from this phone, shown before Find sends it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="listing-photo" src={photo} alt="" />
          <div className="heading">
            <p className="field-label">Your photo</p>
            <p className="small">Add words above if you need to, such as a size.</p>
          </div>
          {!looking && (
            <button type="button" className="button button-secondary" onClick={remove}>
              Remove photo
            </button>
          )}
        </div>
      ) : (
        !looking && (
          <>
            <button
              type="button"
              className="button button-secondary"
              aria-describedby={error ? errorId : undefined}
              onClick={() => input.current?.click()}
            >
              Take or pick a photo
            </button>
            {error ? (
              <p className="field-error" id={errorId}>
                That file isn&apos;t a photo. Pick a photo, or type what you need.
              </p>
            ) : (
              <p className="small">A photo of the thing, or of your written list.</p>
            )}
          </>
        )
      )}
    </div>
  );
}
