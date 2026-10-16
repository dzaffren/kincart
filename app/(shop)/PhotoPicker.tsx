"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = { preview?: string; notPhoto?: boolean; busy?: boolean };

// Next refuses a server action body over 1 MB, so the photo shrinks here first (D65).
const LONG_EDGE = 1600;
const MOST_BYTES = 900_000;

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

  async function picked(file?: File) {
    const field = input.current;
    if (!file || !field) return;
    // The full-size photo never goes, even when Rose taps Find before the shrink ends.
    field.value = "";
    const small = file.type.startsWith("image/") ? await shrink(file).catch(() => null) : null;
    setError(!small);
    if (!small) return setPhoto(undefined);
    const files = new DataTransfer();
    files.items.add(small);
    field.files = files.files;
    setPhoto(URL.createObjectURL(small));
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

// Drawing the photo again also drops its EXIF, with the place it was taken.
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let jpeg = await encode(canvas, 0.85);
  if (jpeg.size > MOST_BYTES) jpeg = await encode(canvas, 0.7);
  return new File([jpeg], "photo.jpg", { type: "image/jpeg" });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/jpeg", quality),
  );
}
