"use client";

import { useCallback, useEffect, useState } from "react";

type Log = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  ip: string | null;
  createdAt: string;
  actor?: { name?: string | null; email?: string | null } | null;
};

export default function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [detail, setDetail] = useState<Log | null>(null);
  const pageSize = 50;

  const load = useCallback(async () => {
    const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (action) sp.set("action", action);
    if (entity) sp.set("entity", entity);
    const res = await fetch(`/api/audit-logs?${sp}`);
    if (res.ok) {
      const j = await res.json();
      setRows(j.rows);
      setTotal(j.total);
    }
  }, [page, action, entity]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-mut">Har bir admin harakati: {total} yozuv</p>
      </div>

      <div className="card p-3 grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
        <div className="col-span-2">
          <label className="label" htmlFor="aaction">Amal (masalan: create, update, delete)</label>
          <input id="aaction" value={action} onChange={(e) => { setPage(1); setAction(e.target.value); }} />
        </div>
        <div>
          <label className="label" htmlFor="aentity">Obyekt</label>
          <select id="aentity" value={entity} onChange={(e) => { setPage(1); setEntity(e.target.value); }}>
            <option value="">Barchasi</option>
            <option value="question">question</option>
            <option value="topic">topic</option>
            <option value="admin_user">admin_user</option>
            <option value="prompt">prompt</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mut border-b border-line">
              <th className="p-3 font-medium">Vaqt</th>
              <th className="p-3 font-medium">Kim</th>
              <th className="p-3 font-medium">Amal</th>
              <th className="p-3 font-medium">Obyekt</th>
              <th className="p-3 font-medium">IP</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-line/60">
                <td className="p-3 whitespace-nowrap text-mut">{new Date(l.createdAt).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3">{l.actor?.name ?? "tizim"}</td>
                <td className="p-3"><span className="badge border-line text-mut">{l.action}</span></td>
                <td className="p-3">{l.entity}</td>
                <td className="p-3 text-mut">{l.ip ?? "—"}</td>
                <td className="p-3 text-right">
                  <button className="btn-ghost text-xs" onClick={() => setDetail(l)}>Batafsil</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-mut">Yozuv yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
        <span className="text-mut">{page} / {pages}</span>
        <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>→</button>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="card w-full max-w-2xl p-5 space-y-3 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{detail.action} · {detail.entity}</h2>
              <button className="btn-ghost text-xs" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="text-xs text-mut">{new Date(detail.createdAt).toLocaleString("uz-UZ")} · IP: {detail.ip ?? "—"}</div>
            <div>
              <div className="label">Oldin</div>
              <pre className="text-xs bg-bg rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{pretty(detail.beforeJson)}</pre>
            </div>
            <div>
              <div className="label">Keyin</div>
              <pre className="text-xs bg-bg rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{pretty(detail.afterJson)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pretty(v: string | null) {
  if (!v) return "—";
  try {
    return JSON.stringify(JSON.parse(v), null, 2);
  } catch {
    return v;
  }
}
