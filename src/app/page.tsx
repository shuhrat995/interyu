import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/interview";

export const metadata = {
  title: "AI Intervyu — Darajangizni AI bilan aniqlang",
  description:
    "Adaptiv AI intervyu: front-end yoki back-end yo'nalishini tanlang, 12 savolga javob bering — daraja, ustunlik, kamchilik va nimaga focus qaratish kerakligi ochiq aytiladi. Ro'yxatdan o'tish shart emas."
};

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "🎚",
    title: "Adaptiv qiyinlik",
    text: "Ketma-ket 2 ta to'g'ri javob darajani oshiradi, xato esa tushiradi. Savollar aynan sizning darajangizga moslashadi."
  },
  {
    icon: "🤖",
    title: "AI baholash",
    text: "Yozma javoblaringiz rubric va kalit tushunchalar asosida baholanadi — kuchli va zaif tomonlaringiz aniq ko'rsatiladi."
  },
  {
    icon: "⏱",
    title: "Haqiqiy intervyu sharoiti",
    text: "Har savol uchun vaqt chegarasi bor va o'tkazib yuborish mumkin emas — haqiqiy suhbatdagi kabi."
  },
  {
    icon: "📊",
    title: "Ochiq hisobot",
    text: "Suhbat so'ngida daraja (junior → senior), umumiy ball, ustunlik va kamchiliklar, jiddiy muammolar hamda nimaga focus qaratish kerakligi — dalillar bilan."
  }
];

const STEPS = [
  { n: "1", title: "Ism va yo'nalishni tanlang", text: "Front-end yoki back-end — savollar shunga qarab tanlanadi. Ro'yxatdan o'tish shart emas." },
  { n: "2", title: "Savollarga javob bering", text: "Test va yozma savollar aralash — daraja avtomatik moslashadi." },
  { n: "3", title: "Natijani oling", text: "Ball, daraja, kuchli va zaif tomonlaringiz hamda aniq focus rejasi bilan hisobot." }
];

export default async function Home() {
  const [settings, questionCount, topicRows] = await Promise.all([
    getSettings(),
    prisma.question.count({ where: { deletedAt: null, isActive: true } }).catch(() => 0),
    prisma.topic
      .findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        select: { id: true, name: true, color: true, _count: { select: { questions: true } } }
      })
      .catch(() => [])
  ]);

  const topics = topicRows
    .map((t) => ({ name: t.name, color: t.color, count: t._count.questions }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  const stats = [
    { value: String(questionCount), label: "savol bazada" },
    { value: String(topics.length), label: "mavzu" },
    { value: String(settings.totalQuestions), label: "savol har suhbatda" },
    { value: "0 → 5", label: "adaptiv daraja" }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <span aria-hidden>🎯</span> AI Intervyu
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/interview" className="btn-primary">
              O&apos;z darajangizni aniqlash
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-14 pb-12 md:pt-20 md:pb-16">
          <div className="max-w-2xl">
            <span className="badge border-acc/40 text-acc">Adaptiv sun'iy intellekt intervyusi</span>
            <h1 className="mt-4 text-3xl md:text-5xl font-semibold leading-tight tracking-tight">
              Bilimingizni AI intervyusida{" "}
              <span className="text-acc">sinab ko'ring</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-mut leading-relaxed">
              {settings.totalQuestions} savoldan iborat suhbat: yo&apos;nalishni tanlaysiz (front-end yoki back-end),
              har javobingiz AI tomonidan baholanadi, qiyinlik esa sizga moslashib boradi. Oxirida qaysi mavzuga
              e&apos;tibor berish kerakligini ochiq aytadigan hisobot olasiz.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/interview" className="btn-primary px-5 py-2.5 text-base">
                🎯 O&apos;z darajangizni aniqlash
              </Link>
              <Link href="#qanday" className="btn-ghost px-5 py-2.5 text-base">
                Qanday ishlaydi?
              </Link>
            </div>
            <p className="mt-4 text-xs text-mut">
              Ro'yxatdan o'tish shart emas · har savolga vaqt chegarasi bor
            </p>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="card p-4">
                <div className="text-2xl font-semibold text-acc">{s.value}</div>
                <div className="text-xs text-mut mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Qanday ishlaydi */}
        <section id="qanday" className="border-y border-line bg-panel/40">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-xl md:text-2xl font-semibold">Qanday ishlaydi?</h2>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {STEPS.map((s) => (
                <div key={s.n} className="card p-5">
                  <div className="w-8 h-8 rounded-full bg-acc/15 text-acc flex items-center justify-center font-semibold">
                    {s.n}
                  </div>
                  <div className="mt-3 font-medium">{s.title}</div>
                  <p className="mt-1 text-sm text-mut leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mavzular */}
        {topics.length > 0 && (
          <section className="mx-auto max-w-5xl px-4 py-12">
            <div className="flex items-end justify-between flex-wrap gap-2">
              <h2 className="text-xl md:text-2xl font-semibold">Qamrab olingan mavzular</h2>
              <span className="text-sm text-mut">Jami {questionCount} savol</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {topics.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-sm"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                  {t.name}
                  <span className="text-xs text-mut">{t.count}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Imkoniyatlar */}
        <section className="border-t border-line bg-panel/40">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-xl md:text-2xl font-semibold">Nega bu platforma?</h2>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="card p-5 flex gap-3">
                  <span className="text-xl" aria-hidden>
                    {f.icon}
                  </span>
                  <div>
                    <div className="font-medium">{f.title}</div>
                    <p className="mt-1 text-sm text-mut leading-relaxed">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <div className="card p-8 md:p-10 text-center bg-gradient-to-b from-acc/10 to-transparent">
            <h2 className="text-2xl md:text-3xl font-semibold">Tayyormisiz?</h2>
            <p className="mt-2 text-mut max-w-xl mx-auto">
              Ismingizni kiriting va bir necha daqiqada darajangiz, kuchli tomonlaringiz va o'sishingiz kerak
              bo'lgan mavzularni bilib oling.
            </p>
            <Link href="/interview" className="btn-primary mt-6 px-6 py-3 text-base">
              🎯 O&apos;z darajangizni aniqlash
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-mut">
          <span>© {new Date().getFullYear()} AI Intervyu — bilim sinash platformasi</span>
          <div className="flex items-center gap-4">
            <Link href="/interview" className="hover:text-acc">
              Darajani aniqlash
            </Link>
            <Link href="/#qanday" className="hover:text-acc">
              Qanday ishlaydi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
