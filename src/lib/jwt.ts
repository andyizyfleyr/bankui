import { SignJWT, jwtVerify } from "jose";
import type { BankUser } from "@/lib/types";

const COOKIE_NAME = "nova_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return new TextEncoder().encode(secret);
}

/** Signe un JWT HS256 contenant l'utilisateur (edge-compatible). */
export async function signToken(user: BankUser): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

/** Vérifie et décode un JWT ; renvoie l'utilisateur ou null. */
export async function verifyToken(token: string): Promise<BankUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || !payload.name || !payload.email) return null;
    return {
      id: payload.sub,
      name: String(payload.name),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME, MAX_AGE_SECONDS };
