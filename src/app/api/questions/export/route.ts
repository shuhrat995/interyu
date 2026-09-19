import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";
import { toCsv } from "@/lib/csv";

export const GET = withAuth(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "json" ? "json" : "csv";
  const includeDeleted = sp.get("includeDeleted") === "1";
  const topicId = sp.get("topicId") || "";
  const rows = await prisma.question.findMany({
    where: {
      AND: [includeDeleted ? {} : { deletedAt: null }, topicId ? { topicId } : {}]
    },
    include: { topic: true },
    orderBy: { createdAt: "desc" }
  });
  const topics = await prisma.topic.findMany();
  const topicSlug = new Map(topics.map((t) => [t.id, t.slug]));

  if (format === "json") {
    const payload = rows.map((r) => ({
      topicSlug: topicSlug.get(r.topicId) ?? "",
      type: r.type,
      difficulty: r.difficulty,
      text: r.text,
      options: safeOptions(r.optionsJson),
      correctIndex: r.correctIndex,
      rubric: r.rubric,
      keywords: r.keywords ? r.keywords.split(",").filter(Boolean) : [],
      timeLimit: r.timeLimit
    }));
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="questions-${Date.now()}.json"`
      }
    });
  }

  const header = ["topicSlug", "type", "difficulty", "text", "options", "correctIndex", "rubric", "keywords", "timeLimit"];
  const lines: (string | number | null)[][] = rows.map((r) => [
    topicSlug.get(r.topicId) ?? "",
    r.type,
    r.difficulty,
    r.text,
    safeOptions(r.optionsJson).join("|"),
    r.correctIndex === null ? "" : String(r.correctIndex),
    r.rubric ?? "",
    r.keywords,
    r.timeLimit
  ]);
  const csv = toCsv([header, ...lines]);
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="questions-${Date.now()}.csv"`
    }
  });
});

function safeOptions(json: string | null): string[] {
  try {
    return json ? (JSON.parse(json) as string[]) : [];
  } catch {
    return [];
  }
}
