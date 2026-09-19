import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") || "";
  const search = sp.get("search")?.trim() || "";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || 20)));

  const where = {
    AND: [
      status ? { status } : {},
      search ? { candidateName: { contains: search } } : {}
    ]
  };

  const [total, rows] = await prisma.$transaction([
    prisma.interview.count({ where }),
    prisma.interview.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { answers: true } },
        tags: true,
        notes: { select: { id: true } }
      }
    })
  ]);

  const list = rows.map((r) => {
    let report: { overall_score?: number; level?: string; hiring_recommendation?: string } | null = null;
    try {
      report = r.aiReportJson ? JSON.parse(r.aiReportJson) : null;
    } catch {
      report = null;
    }
    return {
      id: r.id,
      candidateName: r.candidateName,
      status: r.status,
      track: r.track,
      currentLevel: r.currentLevel,
      answered: r._count.answers,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      score: report?.overall_score ?? null,
      level: report?.level ?? null,
      recommendation: report?.hiring_recommendation ?? null,
      tags: r.tags,
      notesCount: r.notes.length,
      antiCheatCount: countAntiCheat(r.antiCheatJson)
    };
  });

  return NextResponse.json({ total, page, pageSize, rows: list });
});

function countAntiCheat(json: string): number {
  try {
    const events = JSON.parse(json) as unknown[];
    return Array.isArray(events) ? events.length : 0;
  } catch {
    return 0;
  }
}
