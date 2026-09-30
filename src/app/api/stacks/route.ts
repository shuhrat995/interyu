import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STACKS } from "@/lib/tracks";

export const dynamic = "force-dynamic";

/** Ommaviy: stack ro'yxati + har birida nechta aktiv savol borligi */
export async function GET() {
  const rows = await prisma.question.groupBy({
    by: ["topicId"],
    where: { deletedAt: null, isActive: true },
    _count: true
  });
  const countByTopic = new Map<string, number>();
  const topics = await prisma.topic.findMany({ select: { id: true, slug: true } });
  const idToSlug = new Map(topics.map((t) => [t.id, t.slug]));
  for (const r of rows) {
    const slug = idToSlug.get(r.topicId);
    if (slug) countByTopic.set(slug, (countByTopic.get(slug) ?? 0) + r._count);
  }
  return NextResponse.json({
    stacks: STACKS.map((s) => ({
      slug: s.slug,
      track: s.track,
      label: s.label,
      icon: s.icon,
      description: s.description,
      count: s.topics.reduce((sum, t) => sum + (countByTopic.get(t) ?? 0), 0)
    }))
  });
}
