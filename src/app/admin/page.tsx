"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecentInterview = {
  id: string;
  candidateName: string;
  status: string;
  startedAt: string;
  answers: number;
  score: number | null;
};

type Stats = {
  questions: number;
  topics: number;
  admins: number;
  logs: number;
  todayLogs: number;
  weekLogs: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  activeSessions: number;
  interviews: RecentInterview[];
  ai: { todayCalls: number; todayTokens: number; monthCalls: number; monthTokens: number; monthErrors: number };
  recentLogs: { id: string; action: string; entity: string; createdAt: string; actor?: { name?: string } | null }[];
};

type Visitors = {
  today: { views: number; unique: number };
  total: { views: number; unique: number; starts: number; finishes: number };
  online: number;
  daily14: { date: string; views: number; unique: number }[];
  topPaths: { path: string; count: number }[];
};

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [visitors, setVisitors] = useState<Visitors | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Xato");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setErr(String(e.message || e)));
    // Analitika: 30 sekundda yangilanadi (hozir saytda kishi uchun)
    loadVisitors();
    const t = setInterval(loadVisitors, 30_000);
    return () => clearInterval(t);
  }, []);

  function loadVisitors() {
    fetch("/api/analytics/visitors")
      .then((r) => (r.ok ? r.json() : null))
      .then(setVisitors)
      .catch(() => {});
  }

  const cards = [
    { label: "Hozir saytda", value: visitors?.online ?? "—", icon: "🟢" },
    { label: "Bugun tashrif", value: visitors?.today.views ?? "—", icon: "👣" },
    { label: "Faol sessiyalar", value: stats?.activeSessions ?? "—", icon: "🎙" },
    { label: "Savollar", value: stats?.questions ?? "—", icon: "📝" }
  ];

  const maxDaily = Math.max(1, ...(visitors?.daily14.map((d) => d.views) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-mut">Tashriflar, intervyular, kontent va AI sarf holati</p>
      </div>

      {err && <div className="card p-4 text-bad text-sm">{err}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <div className="text-2xl" aria-hidden>{c.icon}</div>
            <div className={`text-2xl font-semibold mt-1 ${c.label === "Hozir saytda" ? "text-ok" : ""}`}>{c.value}</div>
            <div className="text-xs text-mut">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tashrif analitikasi */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-medium">👣 Tashriflar (real, server hisobi)</h2>
          <span className="text-xs text-mut">
            jami: <b>{visitors?.total.views ?? "—"}</b> ko&apos;rish ·{" "}
            <b>{visitors?.total.unique ?? "—"}</b> unique mehmon ·{" "}
            <b>{visitors?.total.starts ?? "—"}</b> intervyu boshlangan ·{" "}
            <b className={visitors && visitors.total.finishes > 0 ? "text-ok" : ""}>{visitors?.total.finishes ?? "—"}</b> yakunlangan
          </span>
        </div>
        {visitors ? (
          <>
            <div className="flex items-end gap-1.5 h-28">
              {visitors.daily14.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative" title={`${fmtDate(d.date)}: ${d.views} ko'rish, ${d.unique} mehmon`}>
                  <div className="w-full bg-acc/80 rounded-t-sm min-h-[2px]" style={{ height: `${(d.views / maxDaily) * 88}px` }} />
                  <span className="text-[9px] text-mut">{d.views > 0 ? d.views : ""}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-mut mt-1">
              <span>{visitors.daily14[0] ? fmtDate(visitors.daily14[0].date) : ""}</span>
              <span>bugun</span>
            </div>
            {visitors.topPaths.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {visitors.topPaths.map((p) => (
                  <span key={p.path} className="badge border-line text-mut">
                    {p.path} <b className="text-fg">{p.count}</b>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-mut">Yuklanmoqda...</p>
        )}
      </div>

      {/* AI sarf vidjeti */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">🤖 AI sarf</h2>
          {stats && stats.ai.monthErrors > 0 && (
            <span className="badge border-warn/50 text-warn text-xs">{stats.ai.monthErrors} xato bu oy</span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-bg rounded-md p-3">
            <div className="text-lg font-semibold tabular-nums">{stats?.ai.todayCalls ?? "—"}</div>
            <div className="text-xs text-mut">bugungi chaqiruv</div>
          </div>
          <div className="bg-bg rounded-md p-3">
            <div className="text-lg font-semibold tabular-nums">{stats ? fmtTokens(stats.ai.todayTokens) : "—"}</div>
            <div className="text-xs text-mut">bugungi token</div>
          </div>
          <div className="bg-bg rounded-md p-3">
            <div className="text-lg font-semibold tabular-nums">{stats?.ai.monthCalls ?? "—"}</div>
            <div className="text-xs text-mut">oylik chaqiruv</div>
          </div>
          <div className="bg-bg rounded-md p-3">
            <div className="text-lg font-semibold tabular-nums">{stats ? fmtTokens(stats.ai.monthTokens) : "—"}</div>
            <div className="text-xs text-mut">oylik token</div>
          </div>
        </div>
      </div>

      {/* So'nggi intervyular */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">🎙 So'nggi intervyular</h2>
          <Link href="/admin/interviews" className="text-xs text-acc hover:underline">
            Barchasi →
          </Link>
        </div>
        {stats ? (
          stats.interviews.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {stats.interviews.map((iv) => (
                <li key={iv.id} className="flex items-center justify-between gap-2 border-b border-line/60 pb-2">
                  <Link href={`/admin/interviews/${iv.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    <span className="font-medium">{iv.candidateName}</span>
                    <span className="text-mut"> · {iv.answers} javob · </span>
                    <span className={iv.status === "finished" ? "text-ok" : "text-warn"}>
                      {iv.status === "finished" ? "yakunlangan" : "davom etmoqda"}
                    </span>
                  </Link>
                  <span className="text-mut whitespace-nowrap text-xs">
                    {new Date(iv.startedAt).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {iv.score !== null && (
                    <span className={`badge text-xs ${iv.score >= 70 ? "border-ok/50 text-ok" : iv.score >= 40 ? "border-warn/50 text-warn" : "border-bad/50 text-bad"}`}>
                      {iv.score}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mut">Hozircha intervyu yo'q</p>
          )
        ) : (
          <p className="text-sm text-mut">Yuklanmoqda...</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-sm font-medium mb-3">Daraja bo'yicha savollar</h2>
          {stats ? (
            <div className="space-y-2">
              {Object.entries(stats.byDifficulty).sort(([a], [b]) => Number(a) - Number(b)).map(([d, n]) => (
                <div key={d} className="flex items-center gap-2 text-sm">
                  <span className="w-10 text-mut">{d}/5</span>
                  <div className="flex-1 h-2.5 bg-panel2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-acc"
                      style={{ width: `${Math.min(100, (n / Math.max(...Object.values(stats.byDifficulty))) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums">{n}</span>
                </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-mut">Yuklanmoqda...</p>
          )}
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-medium mb-3">So'nggi harakatlar</h2>
          <ul className="space-y-2 text-sm">
            {(stats?.recentLogs ?? []).map((l) => (
              <li key={l.id} className="flex justify-between gap-2 border-b border-line/60 pb-1.5">
                <span className="truncate">
                  <span className="text-acc">{l.actor?.name ?? "tizim"}</span> · {l.action} · {l.entity}
                </span>
                <span className="text-mut whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </li>
            ))}
            {stats && stats.recentLogs.length === 0 && <li className="text-mut">Hozircha harakat yo'q</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
