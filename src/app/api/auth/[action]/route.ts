import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, parseBody, withAuth, jsonError } from "@/lib/api";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { signSession, sessionCookieOptions, COOKIE_NAME } from "@/lib/auth";
import { logVisit } from "@/lib/analytics";
import {
  getUserByEmail,
  registerFailedLogin,
  registerFailedLoginVirtual,
  registerSuccessfulLogin,
  requireSetup,
  getRequestIp,
  isThrottleLocked
} from "@/lib/loginGuard";

const bootstrapSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(6)
});
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const changeSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(6)
});

export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const action = pathname.split("/").pop();

  if (action === "bootstrap") {
    const guard = await requireSetup();
    if (guard) return guard;
    const parsed = await parseBody(req, bootstrapSchema);
    if (!parsed.ok) return parsed.res;
    const { email, name, password } = parsed.data;
    const exists = await prisma.adminUser.count();
    if (exists > 0) return jsonError(403, "Tizim allaqachon o'rnatilgan");
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.adminUser.create({
      data: { email: email.toLowerCase(), name, passwordHash: hash, role: "super_admin" }
    });
    await audit(req, user.id, "bootstrap", "admin_user", user.id, null, { email, role: user.role });
    return NextResponse.json({ ok: true, userId: user.id });
  }

  if (action === "login") {
    const parsed = await parseBody(req, loginSchema);
    if (!parsed.ok) return parsed.res;
    const { email, password } = parsed.data;
    const ip = getRequestIp(req);
    const user = await getUserByEmail(email);
    if (!user || !user.isActive) {
      if (await isThrottleLocked(email, ip)) {
        return jsonError(429, "Kirish vaqtincha bloklangan. Keyinroq urinib ko'ring");
      }
      await registerFailedLoginVirtual(email, ip);
      await audit(req, null, "login_failed_unknown", "admin_user", null, null, { email });
      return jsonError(401, "Email yoki parol xato");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await registerFailedLogin(user, email, ip);
      await audit(req, user.id, "login_failed", "admin_user", user.id);
      const attempts = user.failedAttempts + 1;
      const mins = attempts >= 9 ? 7 * 24 * 60 : attempts >= 6 ? 10 : attempts >= 3 ? 5 : 0;
      return jsonError(mins ? 429 : 401, mins ? `Hisob bloklandi. ${mins >= 1440 ? "1 hafta" : `${mins} daqiqa`}dan keyin urinib ko'ring` : "Email yoki parol xato");
    }
    await registerSuccessfulLogin(user.id, email, ip);
    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as never
    });
    await audit(req, user.id, "login", "admin_user", user.id);
    // Analitika: admin kirdi
    const vid = req.cookies.get("vid")?.value;
    if (vid) await logVisit({ path: "/qw", visitorId: vid, kind: "admin_login" });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return res;
  }

  return jsonError(404, "Noma'lum amal");
}

export const PUT = withAuth(async ({ req, session }) => {
  const parsed = await parseBody(req, changeSchema);
  if (!parsed.ok) return parsed.res;
  const user = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  if (!user) return jsonError(404, "Foydalanuvchi topilmadi");
  const ok = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!ok) return jsonError(401, "Joriy parol xato");
  const hash = await bcrypt.hash(parsed.data.next, 12);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash: hash, mustChangePass: false }
  });
  await audit(req, user.id, "change_password", "admin_user", user.id);
  return NextResponse.json({ ok: true });
});

