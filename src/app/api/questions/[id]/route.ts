import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit, jsonError, parseBody, withAuth } from "@/lib/api";
import { fromDb, questionInputSchema, toDb } from "@/lib/questionSchema";

export const GET = withAuth<{ id: string }>(async ({ params }) => {
  const { id } = params;
  const q = await prisma.question.findUnique({
    where: { id },
    include: { topic: true }
  });
  if (!q) return jsonError(404, "Savol topilmadi");
  const versions = await prisma.questionVersion.findMany({
    where: { questionId: id },
    orderBy: { version: "desc" },
    take: 20
  });
  return NextResponse.json({
    question: { ...q, data: fromDb(q) },
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      action: v.action,
      createdAt: v.createdAt,
      editedById: v.editedById
    }))
  });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, params, session }) => {
  const { id } = params;
  const parsed = await parseBody(req, questionInputSchema);
  if (!parsed.ok) return parsed.res;
  const input = parsed.data;
  const before = await prisma.question.findUnique({ where: { id } });
  if (!before) return jsonError(404, "Savol topilmadi");
  if (before.deletedAt) return jsonError(409, "O'chirilgan savolni tahrirlash mumkin emas");
  const usedCount = await prisma.answer.count({ where: { questionId: id } });
  const nextVersion = usedCount > 0 ? before.version + 1 : before.version;

  const updated = await prisma.$transaction(async (tx) => {
    const q = await tx.question.update({
      where: { id },
      data: { ...toDb(input), ...(usedCount > 0 ? { version: nextVersion } : {}) }
    });
    if (usedCount > 0) {
      await tx.questionVersion.create({
        data: {
          questionId: id,
          version: nextVersion,
          action: "update",
          snapshotJson: JSON.stringify(fromDb(before)),
          editedById: session.sub
        }
      });
    }
    return q;
  });

  await audit(req, session.sub, "update", "question", id, fromDb(before), fromDb(updated));
  return NextResponse.json({
    question: fromDb(updated),
    version: updated.version,
    newVersionCreated: usedCount > 0
  });
});

export const DELETE = withAuth<{ id: string }>(
  async ({ req, params, session }) => {
    const { id } = params;
    const before = await prisma.question.findUnique({ where: { id } });
    if (!before) return jsonError(404, "Savol topilmadi");
    if (before.deletedAt) return jsonError(409, "Allaqachon o'chirilgan");
    await prisma.question.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await prisma.questionVersion.create({
      data: {
        questionId: id,
        version: before.version,
        action: "delete",
        snapshotJson: JSON.stringify(fromDb(before)),
        editedById: session.sub
      }
    });
    await audit(req, session.sub, "delete", "question", id, fromDb(before), null);
    return NextResponse.json({ ok: true, mode: "soft" });
  },
  { perm: "question:delete" }
);

export const POST = withAuth<{ id: string }>(async ({ req, params, session }) => {
  // restore (soft delete'dan qaytarish)
  const { id } = params;
  const before = await prisma.question.findUnique({ where: { id } });
  if (!before) return jsonError(404, "Savol topilmadi");
  if (!before.deletedAt) return jsonError(409, "Savol o'chirilmagan");
  const restored = await prisma.question.update({
    where: { id },
    data: { deletedAt: null, isActive: true }
  });
  await prisma.questionVersion.create({
    data: {
      questionId: id,
      version: before.version,
      action: "restore",
      snapshotJson: JSON.stringify(fromDb(before)),
      editedById: session.sub
    }
  });
  await audit(req, session.sub, "restore", "question", id, null, fromDb(restored));
  return NextResponse.json({ ok: true, question: fromDb(restored) });
});
