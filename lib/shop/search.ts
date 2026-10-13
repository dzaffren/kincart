import type { Item } from "./items";

export type Listing = Item & { shop: string; url: string; imageUrl?: string };

export type Found = Listing & { details: string };

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

function toFound(product: Product): Found[] {
  const offer = product.offers?.find((o) => o.price?.currency === "USD" && o.availability === "InStock");
  const price = offer?.price?.price;
  if (!product.id || !product.title || !offer?.domain || !offer.url?.startsWith("https://") || typeof price !== "number") {
    return [];
  }
  const image = product.images?.[0]?.url;
  return [
    {
      id: product.id,
      name: product.title,
      cents: Math.round(price * 100),
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
