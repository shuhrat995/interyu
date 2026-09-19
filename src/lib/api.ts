import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { getSession, SessionData } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

export async function audit(
  req: NextRequest,
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  before?: unknown,
  after?: unknown
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        beforeJson: before === undefined ? null : JSON.stringify(before),
        afterJson: after === undefined ? null : JSON.stringify(after),
        ip: getIp(req)
      }
    });
  } catch {
    // audit log yozilmasa ham asosiy operatsiyani to'xtatmaymiz
  }
}

type HandlerCtx<P> = { req: NextRequest; params: P; session: SessionData; body?: unknown };

export function withAuth<P = Record<string, string>>(
  handler: (ctx: HandlerCtx<P>) => Promise<NextResponse> | NextResponse,
  opts?: { perm?: string }
) {
  return async (req: NextRequest, ctx: { params?: Promise<P> }) => {
    const session = await getSession(req);
    if (!session) return jsonError(401, "Avtorizatsiya talab qilinadi");
    if (opts?.perm && !can(session.role, opts.perm)) {
      return jsonError(403, "Ruxsat yo'q");
    }
    const params = ctx?.params ? await ctx.params : ({} as P);
    try {
      return await handler({ req, params, session });
    } catch (e) {
      console.error(e);
      return jsonError(500, "Server xatosi");
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, res: jsonError(400, "JSON formatida yuboring") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      res: jsonError(422, `${first.path.join(".") || "maydon"}: ${first.message}`)
    };
  }
  return { ok: true, data: parsed.data };
}
