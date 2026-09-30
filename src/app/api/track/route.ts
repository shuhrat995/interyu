import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { logVisit, isBot } from "@/lib/analytics";

const COOKIE = "vid";
const ONE_YEAR = 365 * 24 * 60 * 60;

/**
 * Tashrif loglash: sahifa yuklanganda client shu endpointga "ping" qiladi.
 * Server: yangi tashrifuvchiga vid cookie beradi (1 yil), eventi yozadi.
 * Botlar/prefetch o'tkazib yuboriladi.
 */
export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return new NextResponse(null, { status: 204 });

  const body = (await req.json().catch(() => ({}))) as { path?: string; kind?: string };
  const ALLOWED_PATHS = ["/", "/interview", "/qw", "/login", "/admin", "/admin/questions", "/admin/topics", "/admin/interviews", "/admin/analytics", "/admin/audit"];
  const rawPath = typeof body.path === "string" ? body.path.slice(0, 120) : "/";
  const path = ALLOWED_PATHS.some((p) => rawPath === p || rawPath.startsWith(p + "/") || rawPath.startsWith(p + "?"))
    ? rawPath.split("?")[0]
    : "/";
  const kinds = ["view", "interview_start", "interview_finish", "admin_login"] as const;
  const kind = kinds.includes((body.kind ?? "") as (typeof kinds)[number]) ? (body.kind as (typeof kinds)[number]) : "view";

  const existing = req.cookies.get(COOKIE)?.value;
  // fixation himoyasi: faqat 24 belgili hex vid qabul qilinadi (randomBytes(12))
  const validVid = existing && /^[0-9a-f]{24}$/i.test(existing) ? existing : null;
  const visitorId = validVid ?? randomBytes(12).toString("hex");

  await logVisit({ path, visitorId, kind, userAgent: ua });

  const res = validVid
    ? new NextResponse(null, { status: 204 })
    : new NextResponse(null, {
        status: 204,
        headers: {
          "Set-Cookie": `${COOKIE}=${visitorId}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
        }
      });
  return res;
}
