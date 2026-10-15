import { NextResponse, type NextRequest } from "next/server";
import { whoIs } from "../../../../../lib/shop/people";
import { beginLink, setupCookie } from "../../../paypalLink";

// A home page phone posts Link PayPal here in a new tab, because PayPal refuses to load in a frame (D61).
export async function POST(request: NextRequest, { params }: RouteContext<"/r/[token]/link">) {
  const { token } = await params;
  if ((await whoIs(token))?.person !== "rose") return new NextResponse(null, { status: 404 });

  const link = await beginLink(token, request.nextUrl.origin);
  // 303, so the new tab follows with a GET.
  const response = NextResponse.redirect(new URL(link.to, request.url), 303);
  if (link.setupToken) response.cookies.set("setup_token", link.setupToken, setupCookie(token));
  return response;
}
