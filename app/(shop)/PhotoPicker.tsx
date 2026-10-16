"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = { previews?: string[]; notPhoto?: boolean; busy?: boolean };

type Photo = { key: string; url: string; file?: File };

// Next refuses a server action body over 1 MB, so the photo shrinks here first (D65).
const LONG_EDGE = 1600;
const MOST_BYTES = 900_000;
// A basket holds up to 5 things, so one Find takes up to 5 photos (D68).
const MOST_PHOTOS = 5;

// Rose's photos go with Find and are never kept (D64). A phone offers its camera and its photos.
export function PhotoPicker({ previews = [], notPhoto = false, busy }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const add = useRef<HTMLButtonElement>(null);
  const focusAdd = useRef(false);
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
    if (!focusAdd.current) return;
    // After Remove, focus goes to Add another photo, which is always there with fewer than 5.
    focusAdd.current = false;
    add.current?.focus();
  }, [photos]);

  function remove(photo: Photo) {
    if (made.current.delete(photo.url)) URL.revokeObjectURL(photo.url);
    focusAdd.current = true;
    setCapped(false);
    setPhotos((now) => now.filter(({ key }) => key !== photo.key));
  }

  async function picked(field: HTMLInputElement) {
    const chosen = Array.from(field.files ?? []);
    if (!chosen.length) return;
    // The phone put the full-size files in the input. The shrunk ones go back at once.
    field.files = filesOf(photos);
    const images = chosen.filter((file) => file.type.startsWith("image/"));
    const room = MOST_PHOTOS - photos.length;
    const shrunk = await Promise.all(images.slice(0, room).map((file) => shrink(file).catch(() => null)));
    const added = shrunk.flatMap((file) => {
      if (!file) return [];
      const url = URL.createObjectURL(file);
      made.current.add(url);
      return [{ key: url, url, file }];
    });
    setError(images.length < chosen.length || added.length < Math.min(images.length, room));
    setCapped(images.length > room);
    setPhotos((now) => [...now, ...added].slice(0, MOST_PHOTOS));
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
            <p className="field-error" id={errorId}>
              That file isn&apos;t a photo. Pick a photo, or type what you need.
            </p>
          ) : full ? (
            <p className="small">{capped ? "Up to 5 photos. The first 5 are kept." : "Up to 5 photos at a time."}</p>
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
