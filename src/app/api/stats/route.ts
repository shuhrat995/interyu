import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [questions, topics, admins, logs, recentLogs, activeSessions, recentInterviews, todayAI, monthAI, monthAIErrors] = await Promise.all([
    prisma.question.count({ where: { deletedAt: null } }),
    prisma.topic.count(),
    prisma.adminUser.count(),
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { actor: { select: { name: true } } }
    }),
    prisma.interview.count({ where: { status: "in_progress" } }),
    prisma.interview.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        candidateName: true,
        status: true,
        startedAt: true,
        aiReportJson: true,
        _count: { select: { answers: true } }
      }
    }),
    prisma.aICallLog.aggregate({
      where: { createdAt: { gte: todayStart }, status: "ok" },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true
    }),
    prisma.aICallLog.aggregate({
      where: { createdAt: { gte: monthStart }, status: "ok" },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true
    }),
    prisma.aICallLog.count({ where: { createdAt: { gte: monthStart }, status: "error" } })
  ]);
  const todayLogs = await prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } });
  const byDifficulty: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const rows = await prisma.question.groupBy({
    by: ["difficulty", "type"],
    where: { deletedAt: null },
    _count: true
  });
  rows.forEach((r) => {
    byDifficulty[String(r.difficulty)] = (byDifficulty[String(r.difficulty)] ?? 0) + r._count;
    byType[r.type] = (byType[r.type] ?? 0) + r._count;
  });
  const weekLogs = await prisma.auditLog.count({ where: { createdAt: { gte: weekAgo } } });
  const interviews = recentInterviews.map((iv) => ({
    id: iv.id,
    candidateName: iv.candidateName,
    status: iv.status,
    startedAt: iv.startedAt,
    answers: iv._count.answers,
    score: (() => {
      try {
        return iv.aiReportJson ? (JSON.parse(iv.aiReportJson) as { overall_score?: number }).overall_score ?? null : null;
      } catch {
        return null;
      }
    })()
  }));
  const todayTokens = (todayAI._sum.inputTokens ?? 0) + (todayAI._sum.outputTokens ?? 0);
  const monthTokens = (monthAI._sum.inputTokens ?? 0) + (monthAI._sum.outputTokens ?? 0);
  return NextResponse.json({
    questions,
    topics,
    admins,
    logs,
    todayLogs,
    weekLogs,
    byDifficulty,
    byType,
    recentLogs,
    activeSessions,
    interviews,
    ai: {
      todayCalls: todayAI._count,
      todayTokens,
      monthCalls: monthAI._count,
      monthTokens,
      monthErrors: monthAIErrors
    }
  });
});
