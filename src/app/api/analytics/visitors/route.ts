import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day14 = new Date(todayStart.getTime() - 13 * 24 * 60 * 60 * 1000);
  const activeWindow = new Date(now.getTime() - 5 * 60 * 1000); // "hozir saytda" — oxirgi 5 daqiqa

  const [
    todayViews,
    todayUnique,
    totalViews,
    totalUnique,
    online,
    totalStarts,
    totalFinishes,
    recent,
    topPaths
  ] = await Promise.all([
    prisma.visitorEvent.count({ where: { kind: "view", createdAt: { gte: todayStart } } }),
    prisma.visitorEvent.findMany({ where: { createdAt: { gte: todayStart } }, select: { visitorId: true }, distinct: ["visitorId"] }),
    prisma.visitorEvent.count({ where: { kind: "view" } }),
    prisma.visitorEvent.findMany({ select: { visitorId: true }, distinct: ["visitorId"] }),
    prisma.visitorEvent.findMany({ where: { createdAt: { gte: activeWindow } }, select: { visitorId: true }, distinct: ["visitorId"] }),
    prisma.visitorEvent.count({ where: { kind: "interview_start" } }),
    prisma.visitorEvent.count({ where: { kind: "interview_finish" } }),
    prisma.visitorEvent.findMany({
      where: { createdAt: { gte: day14 } },
      select: { kind: true, createdAt: true, visitorId: true }
    }),
    prisma.visitorEvent.groupBy({
      by: ["path"],
      where: { kind: "view", createdAt: { gte: todayStart } },
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 5
    })
  ]);

  // Kunlik qatorlar: oxirgi 14 kun
  const dayMap = new Map<string, { views: number; unique: Set<string> }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(todayStart.getTime() - i * 86400000);
    dayMap.set(d.toISOString().slice(0, 10), { views: 0, unique: new Set() });
  }
  for (const e of recent) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const row = dayMap.get(key);
    if (!row) continue;
    if (e.kind === "view") row.views += 1;
    row.unique.add(e.visitorId);
  }
  const daily14 = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, r]) => ({ date, views: r.views, unique: r.unique.size }));

  return NextResponse.json({
    today: { views: todayViews, unique: todayUnique.length },
    total: { views: totalViews, unique: totalUnique.length, starts: totalStarts, finishes: totalFinishes },
    online: online.length,
    daily14,
    topPaths: topPaths.map((p) => ({ path: p.path, count: p._count }))
  });
});
