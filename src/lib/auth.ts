import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { Role } from "@/lib/rbac";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw) {
    // Build paytida (Vercel "Collecting page data") env bo'lmasligi mumkin —
    // import vaqtida portlamaslik uchun faqat real chaqiruvda tekshiramiz.
    // Lekin production runtime'da secretsiz imzo qo'yish/zsoxtalashtirishga yo'l yo'q.
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("JWT_SECRET muhit o'zgaruvchisi o'rnatilmagan (production)");
    }
    return new TextEncoder().encode("dev-only-secret-change-me");
  }
  return new TextEncoder().encode(raw);
}

export type SessionData = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

export const COOKIE_NAME = "ai_interview_session";
export const SESSION_TTL_SEC = 8 * 3600;

export async function signSession(payload: SessionData): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
  .sign(getSecret());
}

export async function getSession(req: NextRequest): Promise<SessionData | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionFromToken(token);
}

export async function getSessionFromToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: payload.role as Role
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC
  };
}
