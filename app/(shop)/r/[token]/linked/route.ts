import { NextResponse, type NextRequest } from "next/server";
import { createPaymentToken } from "../../../../../lib/shop/paypal";
import { whoIs } from "../../../../../lib/shop/people";
import { saveVault } from "../../../../../lib/shop/requests";

// PayPal sends Rose here after "Agree and Continue". The setup token comes from our own cookie.
export async function GET(request: NextRequest, { params }: RouteContext<"/r/[token]/linked">) {
  const { token } = await params;
  if (whoIs(token) !== "rose") return new NextResponse(null, { status: 404 });

  const page = new URL(`/r/${token}`, request.url);
  const setupToken = request.cookies.get("setup_token")?.value;
  try {
    if (!setupToken) throw new Error("no setup token");
    await saveVault(await createPaymentToken(setupToken));
    console.log("paypal link status=linked");
  } catch (error) {
    console.log(`paypal link status=failed reason=${error instanceof Error ? error.message : error}`);
    page.searchParams.set("cancelled", "1");
  }

  const response = NextResponse.redirect(page);
  response.cookies.set("setup_token", "", { path: `/r/${token}`, maxAge: 0 });
  return response;
}
