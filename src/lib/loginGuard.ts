import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api";

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

export async function registerFailedLogin(user: { id: string; failedAttempts: number }) {
  const attempts = user.failedAttempts + 1;
  if (user.failedAttempts + 1 >= 5) {
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
    });
  } else {
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedAttempts: attempts }
    });
  }
}

export async function registerSuccessfulLogin(userId: string) {
  await prisma.adminUser.update({
    where: { id: userId },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }
  });
}
