import { prisma } from "@/lib/prisma";

// TZ 5.3.1: sozlamalar admin tomonidan boshqariladi (SystemSetting), default 12 savol
export type InterviewSettings = {
  totalQuestions: number;
  adaptiveEnabled: boolean;
  minWrittenChars: number;
};

const DEFAULTS: InterviewSettings = {
  totalQuestions: 12,
  adaptiveEnabled: true,
  minWrittenChars: 15
};

export async function getSettings(): Promise<InterviewSettings> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "interview" } });
    if (row) return { ...DEFAULTS, ...(JSON.parse(row.valueJson) as Partial<InterviewSettings>) };
  } catch {
    // baza hali push qilinmagan bo'lsa default
  }
  return DEFAULTS;
}

export type ServedQuestion = {
  id: string;
  type: "mcq" | "written";
  difficulty: number;
  text: string;
  options: string[]; // correctIndex HECH QACHON qaytmaydi (TZ 5.4)
  timeLimit: number;
  index: number; // 1-based
  total: number;
};

type DbQuestion = {
  id: string;
  type: string;
  difficulty: number;
  text: string;
  optionsJson: string | null;
  timeLimit: number;
};

/** TZ 5.3.4: ketma-ket 2 to'g'ri -> +1 (maks 5), 1 xato -> -1 (min 0) */
export function nextLevel(current: number, isCorrect: boolean, streakBefore: number, adaptive: boolean): { level: number; streak: number } {
  if (!adaptive) return { level: current, streak: 0 };
  if (isCorrect) {
    const streak = streakBefore + 1;
    return { level: streak >= 2 ? Math.min(5, current + 1) : current, streak: streak >= 2 ? 0 : streak };
  }
  return { level: Math.max(0, current - 1), streak: 0 };
}

function safeOptions(json: string | null): string[] {
  try {
    return json ? (JSON.parse(json) as string[]) : [];
  } catch {
    return [];
  }
}

export function toServed(q: DbQuestion, index: number, total: number): ServedQuestion {
  return {
    id: q.id,
    type: q.type === "mcq" ? "mcq" : "written",
    difficulty: q.difficulty,
    text: q.text,
    options: q.type === "mcq" ? safeOptions(q.optionsJson) : [],
    timeLimit: q.timeLimit,
    index,
    total
  };
}

/**
 * Keyingi savol: berilgan darajadan, askedIds'da yo'q. Yo'q bo'lsa qo'shni darajadan.
 * topicSlugs berilsa — faqat shu yo'nalish mavzularidan (front-end / back-end).
 */
export async function pickNextQuestion(level: number, askedIds: string[], topicSlugs?: string[]): Promise<DbQuestion | null> {
  const topicFilter = topicSlugs && topicSlugs.length > 0 ? { topic: { slug: { in: topicSlugs } } } : {};
  const order = [level, level + 1, level - 1, level + 2, level - 2, 5, 4, 3, 2, 1, 0];
  const seen = new Set<number>();
  for (const lv of order) {
    if (lv < 0 || lv > 5 || seen.has(lv)) continue;
    seen.add(lv);
    const candidates = await prisma.question.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        difficulty: lv,
        id: { notIn: askedIds },
        ...topicFilter
      },
      orderBy: { createdAt: "asc" },
      take: 10
    });
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  // fallback: ignore topic filter if no questions found for track
  if (topicSlugs && topicSlugs.length > 0) {
    return pickNextQuestion(level, askedIds, undefined);
  }
  return null;
}

export function parseAskedIds(json: string): string[] {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}
