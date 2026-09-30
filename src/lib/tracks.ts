/**
 * Yo'nalish (track) — nomzod kirishda front-end yoki back-end ni tanlaydi,
 * savollar faqat shu yo'nalish mavzularidan tanlanadi.
 */
export type TrackSlug = "frontend" | "backend";

export type Track = {
  slug: TrackSlug;
  label: string;
  icon: string;
  description: string;
  topics: string[]; // topic.slug
};

export const TRACKS: Track[] = [
  {
    slug: "frontend",
    label: "Front-end",
    icon: "🎨",
    description: "HTML, CSS, JavaScript, TypeScript va React savollari",
    topics: ["html", "css", "javascript", "typescript", "react"]
  },
  {
    slug: "backend",
    label: "Back-end",
    icon: "🛠",
    description: "Python / Node.js / Java / Go + API, baza, algoritmlar",
    topics: ["python", "nodejs", "java", "go", "javascript", "api", "database", "algorithms"]
  }
];

export const TRACK_SLUGS: TrackSlug[] = TRACKS.map((t) => t.slug);

/**
 * Stack (dasturlash tili) — nomzod track'dan keyin aniq tilni tanlaydi.
 * Savollar shu stack mavzularidan tanlanadi (asosiy til + umumiy backend/frontend bazasi).
 */
export type StackSlug =
  | "javascript"
  | "react"
  | "typescript"
  | "htmlcss"
  | "python"
  | "nodejs"
  | "java"
  | "go";

export type Stack = {
  slug: StackSlug;
  track: TrackSlug;
  label: string;
  icon: string;
  description: string;
  topics: string[]; // topic.slug — birinchisi asosiy til
};

export const STACKS: Stack[] = [
  {
    slug: "javascript",
    track: "frontend",
    label: "JavaScript",
    icon: "🟨",
    description: "JS asoslari, closure, event loop, async",
    topics: ["javascript"]
  },
  {
    slug: "react",
    track: "frontend",
    label: "React",
    icon: "⚛️",
    description: "Hooks, state, render optimizatsiya + JS",
    topics: ["react", "javascript"]
  },
  {
    slug: "typescript",
    track: "frontend",
    label: "TypeScript",
    icon: "🔷",
    description: "Tiplar, generics, narrowing + JS",
    topics: ["typescript", "javascript"]
  },
  {
    slug: "htmlcss",
    track: "frontend",
    label: "HTML + CSS",
    icon: "🎨",
    description: "Semantika, flex/grid, responsive",
    topics: ["html", "css"]
  },
  {
    slug: "python",
    track: "backend",
    label: "Python",
    icon: "🐍",
    description: "Python + API, baza, algoritmlar",
    topics: ["python", "api", "database", "algorithms"]
  },
  {
    slug: "nodejs",
    track: "backend",
    label: "Node.js",
    icon: "🟢",
    description: "Node, event loop, Express + API/baza",
    topics: ["nodejs", "javascript", "api", "database", "algorithms"]
  },
  {
    slug: "java",
    track: "backend",
    label: "Java",
    icon: "☕",
    description: "Java + Spring asoslari, API/baza",
    topics: ["java", "api", "database", "algorithms"]
  },
  {
    slug: "go",
    track: "backend",
    label: "Go",
    icon: "🐹",
    description: "Go + konkurentlik, API/baza",
    topics: ["go", "api", "database", "algorithms"]
  }
];

export const STACK_SLUGS: StackSlug[] = STACKS.map((s) => s.slug);

export function isStackSlug(value: unknown): value is StackSlug {
  return typeof value === "string" && STACK_SLUGS.includes(value as StackSlug);
}

export function getStack(slug: string | null | undefined): Stack | null {
  return STACKS.find((s) => s.slug === slug) ?? null;
}

export function stacksOf(track: string | null | undefined): Stack[] {
  return STACKS.filter((s) => s.track === track);
}

export function isTrackSlug(value: unknown): value is TrackSlug {
  return typeof value === "string" && TRACK_SLUGS.includes(value as TrackSlug);
}

export function getTrack(slug: string | null | undefined): Track | null {
  if (!slug) return null;
  return TRACKS.find((t) => t.slug === slug) ?? null;
}

/** Savol tanlashda ishlatiladigan mavzu sluglari */
export function trackTopicSlugs(slug: string | null | undefined): string[] {
  return getTrack(slug)?.topics ?? [];
}
