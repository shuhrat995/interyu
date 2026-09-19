import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, parseBody, withAuth } from "@/lib/api";
import { fromDb, questionInputSchema, toDb } from "@/lib/questionSchema";

export const GET = withAuth(async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const search = sp.get("search")?.trim() || "";
  const topicId = sp.get("topicId") || "";
  const type = sp.get("type") || "";
  const difficulty = sp.get("difficulty") || "";
  const includeDeleted = sp.get("includeDeleted") === "1";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || 25)));
  const where = {
    AND: [
      includeDeleted ? {} : { deletedAt: null },
      search ? { text: { contains: search } } : {},
      topicId ? { topicId } : {},
      type ? { type } : {},
      difficulty !== "" ? { difficulty: Number(difficulty) } : {}
    ]
  };
  const [total, rows] = await prisma.$transaction([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { topic: { select: { name: true, color: true } } }
    })
  ]);
  return NextResponse.json({ total, page, pageSize, rows });
});

export const POST = withAuth(
  async ({ req, session }) => {
    const parsed = await parseBody(req, questionInputSchema);
    if (!parsed.ok) return parsed.res;
    const input = parsed.data;
    const topic = await prisma.topic.findUnique({ where: { id: input.topicId } });
    if (!topic) return NextResponse.json({ error: "Mavzu topilmadi" }, { status: 422 });
    const created = await prisma.question.create({
      data: { ...toDb(input), version: 1 }
    });
    await prisma.questionVersion.create({
      data: {
        questionId: created.id,
        version: 1,
        action: "create",
        snapshotJson: JSON.stringify(fromDb(created)),
        editedById: session.sub
      }
    });
    await audit(req, session.sub, "create", "question", created.id, null, fromDb(created));
    return NextResponse.json({ question: fromDb(created), id: created.id }, { status: 201 });
  },
  { perm: "question:create" }
);
