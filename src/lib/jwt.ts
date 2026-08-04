import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Edge-safe JWT sign/verify (no next/headers, no Node APIs) so it can run in
// middleware as well as server components/actions.

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "hux-dev-secret-change-me",
);

export type SessionKind = "staff" | "customer";

export interface SessionClaims extends JWTPayload {
  sub: string; // user/customer id
  kind: SessionKind;
  name: string;
  role?: string; // staff only
}

export async function signSession(
  claims: Omit<SessionClaims, "iat" | "exp">,
  maxAgeSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionClaims;
  } catch {
    return null;
  }
}
