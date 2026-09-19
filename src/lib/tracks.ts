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
    description: "Backend va API, ma'lumotlar bazasi, algoritmlar, JavaScript",
    topics: ["javascript", "api", "database", "algorithms"]
  }
];

export const TRACK_SLUGS: TrackSlug[] = TRACKS.map((t) => t.slug);

export function isTrackSlug(value: unknown): value is TrackSlug {
  return typeof value === "string" && TRACK_SLUGS.includes(value as TrackSlug);
}

export function getTrack(slug: string | null | undefined): Track {
  return TRACKS.find((t) => t.slug === slug) ?? TRACKS[0];
}

/** Savol tanlashda ishlatiladigan mavzu sluglari */
export function trackTopicSlugs(slug: string | null | undefined): string[] {
  return getTrack(slug).topics;
}
