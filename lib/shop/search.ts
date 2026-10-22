import sharp from "sharp";
import type { Item } from "./items";

export type Listing = Item & { shop: string; url: string; imageUrl?: string };

// photo is the listing's photo as a small WebP in base64, for the pick call only. It is never stored.
export type Found = Listing & { details: string; photo?: { mediaType: string; data: string } };

const PHOTO_TYPES = ["image/webp", "image/jpeg", "image/png", "image/gif"];
const MOST_PHOTO_BYTES = 1024 * 1024;
// Channel3's photos run up to 2048 px. At full size, the pick call's thinking on 10 of them often ran
// past its 10 s timeout. 512 px still shows what a listing is.
const PHOTO_PX = 512;

type Product = {
  id?: string;
  title?: string;
  description?: string;
  images?: { url?: string }[];
  offers?: { url?: string; domain?: string; availability?: string; price?: { price?: number; currency?: string } }[];
  variants?: { options?: { name?: string; values?: { label?: string }[] }[] };
  structured_attributes?: Record<string, string | string[]>;
};

export async function searchListings(query: string, maxCents?: number): Promise<Found[]> {
  const response = await fetch("https://api.trychannel3.com/v1/search", {
    method: "POST",
    headers: { "x-api-key": process.env.CHANNEL3_API_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 10, ...(maxCents ? { filters: { price: { max_price: maxCents / 100 } } } : {}) }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`channel3 ${response.status}`);
  const body: { products?: Product[] } = await response.json();
  return (body.products ?? []).flatMap(toFound);
}

// Only the photo shows a listing that isn't what its words say, so one whose photo can't be read is dropped
// (D89, D93). The photo's URL comes from shop data, so only Channel3's own photo host is fetched (D95).
export async function withPhotos(listings: Found[]): Promise<Found[]> {
  const kept = await Promise.all(
    listings.map(async (listing) => {
      if (!listing.imageUrl) return [listing];
      const photo = await download(listing.imageUrl).catch(() => undefined);
      return photo ? [{ ...listing, photo }] : [];
    }),
  );
  return kept.flat();
}

async function download(imageUrl: string): Promise<Found["photo"]> {
  const url = new URL(imageUrl);
  if (url.protocol !== "https:" || url.host !== "cdn.trychannel3.com") return undefined;
  const response = await fetch(url.href, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(3000) });
  const mediaType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (response.status !== 200 || !PHOTO_TYPES.includes(mediaType)) return undefined;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MOST_PHOTO_BYTES) return undefined;
  const small = await sharp(bytes).resize(PHOTO_PX, PHOTO_PX, { fit: "inside", withoutEnlargement: true }).webp().toBuffer();
  return { mediaType: "image/webp", data: small.toString("base64") };
}

function toFound(product: Product): Found[] {
  const offer = product.offers?.find((o) => o.price?.currency === "USD" && o.availability === "InStock");
  const price = offer?.price?.price;
  const cents = typeof price === "number" ? Math.round(price * 100) : 0;
  if (!product.id || !product.title || !offer?.domain || !offer.url?.startsWith("https://") || cents < 1) return [];
  const image = product.images?.[0]?.url;
  return [
    {
      id: product.id,
      name: product.title,
      cents,
      shop: offer.domain,
      url: offer.url,
      imageUrl: image?.startsWith("https://") ? image : undefined,
      details: detailsOf(product),
    },
  ];
}

function detailsOf(product: Product): string {
  const sizes = product.variants?.options?.find((o) => /size/i.test(o.name ?? ""))?.values?.map((v) => v.label);
  const attributes = Object.entries(product.structured_attributes ?? {}).map(
    ([name, value]) => `${name}: ${[value].flat().join(", ")}`,
  );
  return [(product.description ?? "").slice(0, 300), sizes?.length ? `Sizes: ${sizes.join(", ")}` : "", ...attributes]
    .filter(Boolean)
    .join("\n");
}
