import { NextRequest } from "next/server";

/**
 * Same-origin check for state-changing requests.
 *
 * `request.nextUrl.host` is reconstructed by Next.js and can differ from the
 * host the browser actually used (for example when the site is opened through
 * an IP address), which produced false 403 responses. The Host header is the
 * value the browser signed the Origin against, so compare with that instead.
 */
export function validOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  /*
   * Do not trust X-Forwarded-Host here: a client can send it too and would
   * then be able to pair its own Origin with a spoofed forwarded host. Use
   * the Host header the server actually received.
   */
  const host =
    request.headers.get("host") ||
    request.nextUrl.host;

  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
