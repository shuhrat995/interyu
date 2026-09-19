"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type Analytics = {
  kpi: {
    totalInterviews: number;
    finished: number;
    inProgress: number;
    completionRate: number;
    avgScore: number | null;
    avgDurationMin: number;
    totalAnswers: number;
    aiCalls: number;
    aiTokens: number;
  };
  daily: { date: string; started: number; finished: number }[];
  scoreBuckets: { label: string; count: number }[];
  levels: { level: string; count: number }[];
  topics: { topic: string; color: string; total: number; errors: number; errorRate: number; avgScore: number | null }[];
  days: number;
};

const LEVEL_COLORS: Record<string, string> = {
  junior: "#6d8cff",
  "junior+": "#4ade80",
  middle: "#fbbf24",
  "middle+": "#f97316",
  senior: "#f87171"
};

const TOOLTIP_STYLE = {
  background: "#111731",
  border: "1px solid #273052",
  borderRadius: 8,
  color: "#e6ebff",
  fontSize: 12
} as const;

function scoreColor(score: number | null): string {
  if (score === null) return "#9aa6cc";
  if (score >= 70) return "#4ade80";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Ma'lumot olinmadi"))))
      .then((d: Analytics) => {
        if (alive) setData(d);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">📈 Analitika</h1>
        <div className="card text-sm text-mut">Yuklanmoqda…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">📈 Analitika</h1>
        <div className="card text-sm text-bad">{error || "Ma'lumot yo'q"}</div>
      </div>
    );
  }

  const { kpi, daily, scoreBuckets, levels, topics } = data;
  const dailySeries = daily.map((d) => ({ ...d, label: d.date.slice(5) }));
  const totalLevels = levels.reduce((s, l) => s + l.count, 0);
  const noData = kpi.totalInterviews === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold">📈 Analitika</h1>
          <p className="text-sm text-mut">Intervyular samaradorligi va AI baholash tahlili</p>
        </div>
        <span className="text-xs text-mut">Oxirgi {data.days} kun</span>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Jami intervyu" value={String(kpi.totalInterviews)} sub={`${kpi.inProgress} davom etmoqda`} />
        <Kpi label="Yakunlangan" value={String(kpi.finished)} sub={`${kpi.completionRate}% tugatish`} />
        <Kpi
          label="O'rtacha ball"
          value={kpi.avgScore === null ? "—" : `${kpi.avgScore}/100`}
          valueColor={scoreColor(kpi.avgScore)}
          sub={`${kpi.totalAnswers} javob`}
        />
        <Kpi label="O'rtacha davomiylik" value={`${kpi.avgDurationMin} daq`} sub="yakunlangan sessiyalar" />
        <Kpi label="AI chaqiruv" value={String(kpi.aiCalls)} sub="jami" />
        <Kpi label="AI token" value={kpi.aiTokens.toLocaleString("en-US")} sub="kirim + chiqim" />
      </div>

      {noData ? (
        <div className="card text-sm text-mut">
          Hozircha intervyu ma'lumoti yo'q. Nomzod sayti (<span className="text-acc">/interview</span>) orqali
          sessiya o'tkazilgach grafiklar to'ladi.
        </div>
      ) : null}

      {/* Dinamika */}
      <section className="card">
        <h2 className="font-medium mb-3">Intervyular dinamikasi</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySeries} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="gStarted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6d8cff" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#6d8cff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gFinished" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#273052" />
              <XAxis dataKey="label" stroke="#9aa6cc" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="#9aa6cc" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#9aa6cc" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#9aa6cc" }} />
              <Area type="monotone" dataKey="started" name="Boshlandi" stroke="#6d8cff" fill="url(#gStarted)" strokeWidth={2} />
              <Area type="monotone" dataKey="finished" name="Yakunlandi" stroke="#4ade80" fill="url(#gFinished)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Ball taqsimoti */}
        <section className="card">
          <h2 className="font-medium mb-3">Ball taqsimoti</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBuckets} margin={{ top: 6, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#273052" vertical={false} />
                <XAxis dataKey="label" stroke="#9aa6cc" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#9aa6cc" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#9aa6cc" }} cursor={{ fill: "#1b2444" }} />
                <Bar dataKey="count" name="Intervyular" radius={[4, 4, 0, 0]}>
                  {scoreBuckets.map((b, i) => (
                    <Cell key={b.label} fill={scoreColor(i * 10 + 5)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Daraja donut */}
        <section className="card">
          <h2 className="font-medium mb-3">Daraja taqsimoti</h2>
          {levels.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-mut">Ma'lumot yo'q</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levels}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={98}
                    paddingAngle={3}
                    stroke="#111731"
                  >
                    {levels.map((l) => (
                      <Cell key={l.level} fill={LEVEL_COLORS[l.level] ?? "#9aa6cc"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value, name) => [
                      `${Number(value)} ta (${totalLevels ? Math.round((Number(value) / totalLevels) * 100) : 0}%)`,
                      String(name)
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9aa6cc" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Mavzu xatolari */}
      <section className="card">
        <h2 className="font-medium mb-3">Mavzular bo'yicha xatolar</h2>
        {topics.length === 0 ? (
          <div className="text-sm text-mut">Ma'lumot yo'q</div>
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics} layout="vertical" margin={{ top: 6, right: 24, bottom: 0, left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#273052" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke="#9aa6cc" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="topic" width={110} stroke="#9aa6cc" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "#1b2444" }}
                    formatter={(value, _n, item) => {
                      const p = (item?.payload ?? {}) as { errors?: number; total?: number };
                      return [`${Number(value)}% (${p.errors ?? 0}/${p.total ?? 0})`, "Xato ulushi"];
                    }}
                  />
                  <Bar dataKey="errorRate" name="Xato ulushi" radius={[0, 4, 4, 0]}>
                    {topics.map((t) => (
                      <Cell key={t.topic} fill={t.errorRate >= 60 ? "#f87171" : t.errorRate >= 30 ? "#fbbf24" : "#4ade80"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-mut border-b border-line">
                    <th className="py-2 pr-4 font-medium">Mavzu</th>
                    <th className="py-2 pr-4 font-medium">Javoblar</th>
                    <th className="py-2 pr-4 font-medium">Xatolar</th>
                    <th className="py-2 pr-4 font-medium">Xato ulushi</th>
                    <th className="py-2 font-medium">O'rtacha AI ball</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.topic} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                          {t.topic}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-mut">{t.total}</td>
                      <td className="py-2 pr-4 text-mut">{t.errors}</td>
                      <td className="py-2 pr-4">
                        <span
                          className="badge"
                          style={{
                            borderColor: t.errorRate >= 60 ? "#f87171" : t.errorRate >= 30 ? "#fbbf24" : "#4ade80",
                            color: t.errorRate >= 60 ? "#f87171" : t.errorRate >= 30 ? "#fbbf24" : "#4ade80"
                          }}
                        >
                          {t.errorRate}%
                        </span>
                      </td>
                      <td className="py-2" style={{ color: scoreColor(t.avgScore) }}>
                        {t.avgScore === null ? "—" : `${t.avgScore}/100`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  valueColor
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs text-mut">{label}</div>
      <div className="text-2xl font-semibold mt-1" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      {sub ? <div className="text-xs text-mut mt-0.5">{sub}</div> : null}
    </div>
  );
}
