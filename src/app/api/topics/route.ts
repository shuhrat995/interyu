import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit, jsonError, parseBody, withAuth } from "@/lib/api";

const topicSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug faqat kichik harf, raqam va '-'"),
  parentId: z.string().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(16).nullable().optional(),
  order: z.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional()
});

export const GET = withAuth(async () => {
  const topics = await prisma.topic.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { questions: { where: { deletedAt: null } } } } }
  });
  return NextResponse.json({ topics });
});

export const POST = withAuth(
  async ({ req, session }) => {
    const parsed = await parseBody(req, topicSchema);
    if (!parsed.ok) return parsed.res;
    const data = parsed.data;
    if (data.parentId) {
      const parent = await prisma.topic.findUnique({ where: { id: data.parentId } });
      if (!parent) return jsonError(422, "Ota mavzu topilmadi");
    }
    const exists = await prisma.topic.findUnique({ where: { slug: data.slug } });
    if (exists) return jsonError(409, "Bu slug allaqachon mavjud");
    const topic = await prisma.topic.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId ?? null,
        color: data.color ?? "#6d8cff",
        icon: data.icon ?? null,
        order: data.order ?? 0,
        isActive: data.isActive ?? true
      }
    });
    await audit(req, session.sub, "create", "topic", topic.id, null, topic);
    return NextResponse.json({ topic }, { status: 201 });
  },
  { perm: "topic:create" }
);

export const PATCH = withAuth(
  async ({ req, session }) => {
    const parsed = await parseBody(
      req,
      z.object({ id: z.string(), patch: topicSchema.partial() })
    );
    if (!parsed.ok) return parsed.res;
    const { id, patch } = parsed.data;
    const before = await prisma.topic.findUnique({ where: { id } });
    if (!before) return jsonError(404, "Mavzu topilmadi");
    if (patch.parentId === id) return jsonError(422, "Mavzu o'zining ota'si bo'lolmaydi");
    const topic = await prisma.topic.update({ where: { id }, data: patch });
    await audit(req, session.sub, "update", "topic", id, before, topic);
    return NextResponse.json({ topic });
  },
  { perm: "topic:update" }
);

export const DELETE = withAuth(
  async ({ req, params, session }) => {
    const id = (params as { id: string }).id;
    if (!id) return jsonError(400, "id kerak (query: ?id=...)");
    const before = await prisma.topic.findUnique({
      where: { id },
      include: { _count: { select: { questions: true, children: true } } }
    });
    if (!before) return jsonError(404, "Mavzu topilmadi");
    if (before._count.questions > 0 || before._count.children > 0) {
      return jsonError(409, "Mavzuda savollar yoki bolalar mavzular bor — o'chirib bo'lmaydi");
    }
    await prisma.topic.delete({ where: { id } });
    await audit(req, session.sub, "delete", "topic", id, before, null);
    return NextResponse.json({ ok: true });
  },
  { perm: "topic:delete" }
);
