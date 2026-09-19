"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  candidateName: string;
  status: string;
  track: string | null;
  currentLevel: number;
  answered: number;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  level: string | null;
  recommendation: string | null;
  tags: { id: string; label: string; color: string }[];
  notesCount: number;
  antiCheatCount: number;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  in_progress: { label: "Davom etmoqda", cls: "border-warn/50 text-warn" },
  finished: { label: "Yakunlangan", cls: "border-ok/50 text-ok" },
  abandoned: { label: "Uzilgan", cls: "border-line text-mut" }
};

export default function InterviewsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const pageSize = 20;

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) sp.set("status", status);
    if (search) sp.set("search", search);
    const res = await fetch(`/api/interviews?${sp}`);
    if (res.ok) {
      const j = await res.json();
      setRows(j.rows);
      setTotal(j.total);
    }
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Intervyular</h1>
        <p className="text-sm text-mut">Jami: {total} sessiya</p>
      </div>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <div className="col-span-2">
          <label className="label" htmlFor="isearch">Nomzod ismi</label>
          <input id="isearch" className="w-full" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="qidiruv..." />
        </div>
        <div>
          <label className="label" htmlFor="istatus">Holat</label>
          <select id="istatus" className="w-full" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Barchasi</option>
            <option value="in_progress">Davom etmoqda</option>
            <option value="finished">Yakunlangan</option>
            <option value="abandoned">Uzilgan</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mut border-b border-line">
              <th className="p-3 font-medium">Nomzod</th>
              <th className="p-3 font-medium">Yo&apos;nalish</th>
              <th className="p-3 font-medium">Ball</th>
              <th className="p-3 font-medium">Daraja</th>
              <th className="p-3 font-medium">Tavsiya</th>
              <th className="p-3 font-medium">Javoblar</th>
              <th className="p-3 font-medium">Teglar</th>
              <th className="p-3 font-medium">Holat</th>
              <th className="p-3 font-medium">Boshlangan</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line/60 hover:bg-panel2/40">
                <td className="p-3">
                  <div className="font-medium">{r.candidateName}</div>
                  {r.notesCount > 0 && <div className="text-xs text-mut">💬 {r.notesCount} izoh</div>}
                  {r.antiCheatCount > 0 && <div className="text-xs text-warn">⚠ {r.antiCheatCount} anti-cheat</div>}
                </td>
                <td className="p-3 text-xs text-mut">
                  {r.track === "backend" ? "Back-end" : r.track === "frontend" ? "Front-end" : "—"}
                </td>
                <td className="p-3 tabular-nums font-semibold">{r.score ?? "—"}</td>
                <td className="p-3">{r.level ? <span className="badge border-acc/40 text-acc">{r.level}</span> : "—"}</td>
                <td className="p-3">
                  {r.recommendation === "ha" && <span className="badge border-ok/50 text-ok">ha</span>}
                  {r.recommendation === "yo'q" && <span className="badge border-bad/50 text-bad">yo'q</span>}
                  {r.recommendation === "shartli" && <span className="badge border-warn/50 text-warn">shartli</span>}
                  {!r.recommendation && "—"}
                </td>
                <td className="p-3 tabular-nums">{r.answered}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map((t) => (
                      <span key={t.id} className="badge" style={{ borderColor: t.color, color: t.color }}>{t.label}</span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`badge ${STATUS_LABEL[r.status]?.cls ?? "border-line text-mut"}`}>
                    {STATUS_LABEL[r.status]?.label ?? r.status}
                  </span>
                </td>
                <td className="p-3 text-mut whitespace-nowrap">
                  {new Date(r.startedAt).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="p-3 text-right">
                  <button className="btn-ghost text-xs" onClick={() => router.push(`/admin/interviews/${r.id}`)}>
                    Tafsilot
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-mut">Intervyu topilmadi</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
        <span className="text-mut">{page} / {pages}</span>
        <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
      </div>
    </div>
  );
}
