import { prisma } from "@/lib/prisma";

/**
 * Tashrif analitikasi — server tomonda loglanadi (bloklangan botlar + prefetch o'tkazib yuboriladi).
 * Xato bo'lsa asosiy sahifa buzilmasin — catch bilan.
 */
const BOT_RE = /(bot|crawler|spider|crawling|facebookexternalhit|preview|slurp|monitor|uptime|curl|wget|headless)/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // UA yubormaganlar ko'pincha bot/prefetch
  return BOT_RE.test(userAgent) || userAgent.length < 10;
}

export async function logVisit(args: {
  path: string;
  visitorId: string;
  kind?: "view" | "interview_start" | "interview_finish" | "admin_login";
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.visitorEvent.create({
      data: {
        path: args.path,
        visitorId: args.visitorId,
        kind: args.kind ?? "view",
        userAgent: args.userAgent?.slice(0, 300) ?? null
      }
    });
  } catch {
    // analitika muhim emas — asosiy oqim buzilmasin
  }
}
