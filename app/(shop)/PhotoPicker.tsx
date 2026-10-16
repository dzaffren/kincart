"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = { previews?: string[]; notPhoto?: boolean; busy?: boolean };

type Photo = { key: string; url: string; file?: File };

// Next refuses a server action body over 1 MB, so each photo shrinks here first, and 5 of them fit (D70).
const MOST_BYTES = 180_000;
// The long edge and the JPEG quality of each try. The last is about half the pixels of the first.
const STEPS = [
  [1200, 0.85],
  [1200, 0.7],
  [1200, 0.55],
  [1000, 0.55],
  [800, 0.55],
] as const;
// A basket holds up to 5 things, so one Find takes up to 5 photos (D68).
const MOST_PHOTOS = 5;

// Rose's photos go with Find and are never kept (D64). A phone offers its camera and its photos.
export function PhotoPicker({ previews = [], notPhoto = false, busy }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const focusAdd = useRef(false);
  const focusLine = useRef(false);
  // Photos kept or still shrinking. Add stays on screen while a pick shrinks, so a second pick counts the first.
  const count = useRef(previews.length);
  const made = useRef(new Set<string>());
  const errorId = useId();
  const [photos, setPhotos] = useState<Photo[]>(() => previews.map((url, index) => ({ key: `preview-${index}`, url })));
  const [error, setError] = useState(notPhoto);
  const [capped, setCapped] = useState(false);
  // While Find runs, the photos stay on screen and their buttons go, as Try other words does.
  const looking = useFormStatus().pending || busy;
  const full = photos.length >= MOST_PHOTOS;

  useEffect(() => {
    const urls = made.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Only shrunk photos stay in the input, so Find never sends a full-size one.
  useEffect(() => {
    if (input.current) input.current.files = filesOf(photos);
    if (focusAdd.current) {
      // After Remove, focus goes to Add another photo, which is always there with fewer than 5.
      focusAdd.current = false;
      add.current?.focus();
    } else if (focusLine.current) {
      // A pick that fills the 5 takes Add away, so focus goes to the line in its place.
      focusLine.current = false;
      line.current?.focus();
    }
  }, [photos]);

  function remove(photo: Photo) {
    if (made.current.delete(photo.url)) URL.revokeObjectURL(photo.url);
    focusAdd.current = true;
    count.current -= 1;
    setCapped(false);
    setPhotos((now) => now.filter(({ key }) => key !== photo.key));
  }

  async function picked(field: HTMLInputElement) {
    const chosen = Array.from(field.files ?? []);
    if (!chosen.length) return;
    // The phone put the full-size files in the input. The shrunk ones go back at once.
    field.files = filesOf(photos);
    const images = chosen.filter((file) => file.type.startsWith("image/"));
    const room = MOST_PHOTOS - count.current;
    const taken = images.slice(0, room);
    count.current += taken.length;
    // One photo at a time: five 12 MP photos decoded at once hold about 240 MB of pixels.
    const added: Photo[] = [];
    for (const image of taken) {
      const file = await shrink(image).catch(() => null);
      if (!file) continue;
      const url = URL.createObjectURL(file);
      made.current.add(url);
      added.push({ key: url, url, file });
    }
    count.current -= taken.length - added.length;
    setError(images.length < chosen.length || added.length < taken.length);
    // Only Remove clears it, as a pick that started first can finish last.
    if (images.length > room) setCapped(true);
    focusLine.current = count.current === MOST_PHOTOS;
    setPhotos((now) => [...now, ...added]);
  }

  return (
    <div className="stack">
      <input
        ref={input}
        type="file"
        name="photo"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => picked(event.target)}
      />
      {photos.length > 0 && (
        <div className="photo-pick">
          <div className="heading">
            <p className="field-label">{photos.length === 1 ? "Your photo" : `Your ${photos.length} photos`}</p>
            <p className="small">Add words above if you need to, such as a size.</p>
          </div>
          <ul className="photo-tiles">
            {photos.map((photo, index) => (
              <li className="photo-tile" key={photo.key}>
                {/* A photo from this phone, shown before Find sends it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="listing-photo" src={photo.url} alt="" />
                {!looking && (
                  <button
                    type="button"
                    className="button button-secondary"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => remove(photo)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!looking && (
        <>
          {!full && (
            <button
              ref={add}
              type="button"
              className="button button-secondary"
              aria-describedby={error ? errorId : undefined}
              onClick={() => input.current?.click()}
            >
              {photos.length ? "Add another photo" : "Take or pick a photo"}
            </button>
          )}
          {error ? (
            <p ref={line} tabIndex={-1} className="field-error" id={errorId}>
              That file isn&apos;t a photo. Pick a photo, or type what you need.
            </p>
          ) : full ? (
            <p ref={line} tabIndex={-1} className="small">
              {capped ? "Up to 5 photos. The first 5 are kept." : "Up to 5 photos at a time."}
            </p>
          ) : (
            !photos.length && <p className="small">A photo of the thing, or of your written list.</p>
          )}
        </>
      )}
    </div>
  );
}

function filesOf(photos: Photo[]): FileList {
  const files = new DataTransfer();
  for (const { file } of photos) if (file) files.items.add(file);
  return files.files;
}

// Drawing the photo again also drops its EXIF, with the place it was taken. The first try that
// comes to 180 KB or less is kept, else the last.
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  let drawn = 0;
  let jpeg: Blob | null = null;
  try {
    for (const [edge, quality] of STEPS) {
      if (edge !== drawn) {
        const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        drawn = edge;
      }
      jpeg = await encode(canvas, quality);
      if (jpeg.size <= MOST_BYTES) break;
    }
  } finally {
    bitmap.close();
  }
  return new File([jpeg!], "photo.jpg", { type: "image/jpeg" });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/jpeg", quality),
  );
}
