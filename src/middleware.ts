import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/jwt";

const STAFF_COOKIE = process.env.AUTH_COOKIE_STAFF || "hux_staff_session";
const CUSTOMER_COOKIE = process.env.AUTH_COOKIE_CUSTOMER || "hux_customer_session";

// Edge guard: verifies the JWT cookie exists & is valid, and that its `kind`
// matches the area. Fine-grained role/module checks happen server-side.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ---- Backoffice ----
  if (pathname.startsWith("/backoffice")) {
    if (pathname === "/backoffice/login") return NextResponse.next();
    const token = req.cookies.get(STAFF_COOKIE)?.value;
    const claims = token ? await verifySession(token) : null;
    if (!claims || claims.kind !== "staff") {
      const url = req.nextUrl.clone();
      url.pathname = "/backoffice/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ---- Customer account ----
  if (pathname.startsWith("/conta")) {
    const publicAuth = ["/conta/login", "/conta/cadastro", "/conta/recuperar"];
    if (publicAuth.some((p) => pathname === p)) return NextResponse.next();
    const token = req.cookies.get(CUSTOMER_COOKIE)?.value;
    const claims = token ? await verifySession(token) : null;
    if (!claims || claims.kind !== "customer") {
      const url = req.nextUrl.clone();
      url.pathname = "/conta/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/backoffice/:path*", "/conta/:path*"],
};
