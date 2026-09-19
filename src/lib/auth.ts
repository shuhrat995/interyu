import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { Role } from "@/lib/rbac";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-secret-change-me"
);

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
  .sign(secret);
}

export async function getSession(req: NextRequest): Promise<SessionData | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionFromToken(token);
}

export async function getSessionFromToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
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
