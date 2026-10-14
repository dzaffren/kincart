import { whoIs } from "../../../../lib/shop/people";

// Each secret link has its own manifest, so its Home Screen icon opens that link (D28).
export async function GET(_request: Request, { params }: RouteContext<"/manifest/[token]">) {
  const { token } = await params;
  const who = await whoIs(token);
  if (!who) return new Response(null, { status: 404 });

  const page = `/${who.person === "rose" ? "r" : "h"}/${token}`;
  return Response.json(
    {
      name: "KinCart",
      short_name: "KinCart",
      start_url: page,
      scope: page,
      display: "standalone",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
