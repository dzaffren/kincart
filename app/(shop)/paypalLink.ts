import { createSetupToken } from "../../lib/shop/paypal";

type Link = { to: string; setupToken?: string };

// Not a "use server" file, so the browser can't call these. Callers check the link is Rose's first.
// Link PayPal starts here as a server action, or as POST /r/<token>/link from a home page phone (D61).
export async function beginLink(token: string, origin: string): Promise<Link> {
  const page = `${origin}/r/${token}`;
  try {
    const setup = await createSetupToken(`${page}/linked`, `${page}?cancelled=1`);
    return { to: setup.approveUrl, setupToken: setup.id };
  } catch (error) {
    console.log(`paypal link status=failed reason=${error instanceof Error ? error.message : error}`);
    return { to: `/r/${token}?cancelled=1` };
  }
}

export function setupCookie(token: string) {
  return { httpOnly: true, secure: true, sameSite: "lax", path: `/r/${token}`, maxAge: 3600 } as const;
}
