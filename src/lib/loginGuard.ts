import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

const LOCK_DURATIONS = [5, 10, 15];

export function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") || "unknown";
}

function throttleKey(email: string, ip: string) {
  return `${email.toLowerCase().trim()}:${ip}`;
}

export async function requireSetup(): Promise<NextResponse | null> {
  const count = await prisma.adminUser.count();
  if (count > 0) return jsonError(403, "Tizim allaqachon o'rnatilgan");
  return null;
}

export async function getUserByEmail(email: string) {
  return prisma.adminUser.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function isLocked(user: { lockedUntil: Date | null }): Promise<boolean> {
  return Boolean(user.lockedUntil && user.lockedUntil > new Date());
}

export async function registerFailedLogin(
  user: { id: string; failedAttempts: number },
  email: string,
  ip: string
) {
  const attempts = user.failedAttempts + 1;
  const minutes = attempts >= 9 ? 7 * 24 * 60 : LOCK_DURATIONS[Math.min(Math.floor(attempts / 3) - 1, 2)];
  const lockedUntil = attempts >= 3 ? new Date(Date.now() + minutes * 60 * 1000) : null;
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { failedAttempts: attempts, lockedUntil }
  });
  const key = throttleKey(email, ip);
  await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, email: email.toLowerCase().trim(), ip, failedAttempts: 1, lockedUntil },
    update: { failedAttempts: { increment: 1 }, lockedUntil }
  });
}

export async function isThrottleLocked(email: string, ip: string) {
  const throttle = await prisma.loginThrottle.findUnique({ where: { key: throttleKey(email, ip) } });
  return Boolean(throttle?.lockedUntil && throttle.lockedUntil > new Date());
}

export async function registerFailedLoginVirtual(email: string, ip: string) {
  const key = throttleKey(email, ip);
  const throttle = await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, email: email.toLowerCase().trim(), ip, failedAttempts: 1 },
    update: { failedAttempts: { increment: 1 } }
  });
  const attempts = throttle.failedAttempts;
  if (attempts >= 3) {
    const minutes = attempts >= 9 ? 7 * 24 * 60 : LOCK_DURATIONS[Math.min(Math.floor(attempts / 3) - 1, 2)];
    await prisma.loginThrottle.update({ where: { key }, data: { lockedUntil: new Date(Date.now() + minutes * 60 * 1000) } });
  }
}

export async function registerSuccessfulLogin(userId: string, email: string, ip: string) {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }
  });
  await prisma.loginThrottle.deleteMany({ where: { key: throttleKey(email, ip) } });
}
