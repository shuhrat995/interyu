import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const action = sp.get("action") || "";
  const entity = sp.get("entity") || "";
  const actorId = sp.get("actorId") || "";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize") || 50)));
  const where = {
    AND: [
      action ? { action: { contains: action } } : {},
      entity ? { entity } : {},
      actorId ? { actorId } : {}
    ]
  };
  const [total, rows] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true } } }
    })
  ]);
  return NextResponse.json({ total, page, pageSize, rows });
});
