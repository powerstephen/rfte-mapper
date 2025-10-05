"use client";

import React, { useMemo, useState } from "react";

type StageRow = { id: string; stage: string; fte: number; focusHrs: number; util: number; stdRate: number; yield: number };
type BacklogItem = { id: string; stage: string; units: number };

const DEFAULT_STAGES: StageRow[] = [
  { id: "s4", stage: "Booked", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s5", stage: "Show", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s6", stage: "Proposal", fte: 1, focusHrs: 20, util: 0.85, stdRate: 1, yield: 0.95 },
];

const fmt = (n: number, d = 0) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "";
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);

export default function Page() {
  const [stages] = useState<StageRow[]>(DEFAULT_STAGES);
  const [backlog, setBacklog] = useState<BacklogItem[]>(DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })));

  const capsPerWeek = useMemo(
    () => stages.map(s => safe(s.fte * s.focusHrs * s.util * s.stdRate * s.yield)),
    [stages]
  );
  const backlogWeeks = useMemo(
    () =>
      stages.map((s, i) => {
        const cap = capsPerWeek[i] ?? 0;
        const units = backlog[i]?.units ?? 0;
        return cap > 0 ? units / cap : 0;
      }),
    [stages, backlog, capsPerWeek]
  );

  const setBacklogUnits = (id: string, units: number) =>
    setBacklog(prev => prev.map(b => (b.id === id ? { ...b, units } : b)));

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Backlog Health</h1>

      <div style={{ display: "grid", rowGap: 12 }}>
        {stages.map((s, i) => (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>{s.stage}</div>

            <input
              type="number"
              value={backlog[i]?.units ?? 0}
              onChange={e => setBacklogUnits(s.id, parseFloat(e.target.value) || 0)}
              style={{ height: 40, borderRadius: 12, border: "1px solid #e5e7eb", padding: "0 12px" }}
            />

            <div>Weekly cap: <b>{fmt(capsPerWeek[i] ?? 0, 2)}</b></div>

            <div>
              Weeks of backlog: <b>{fmt(backlogWeeks[i] ?? 0, 2)}</b>{" "}
              {(backlogWeeks[i] ?? 0) > 1
                ? <span style={{ color: "#dc2626" }}>({"\u003e"}1 week)</span>
                : <span style={{ color: "#059669" }}>({"\u2264"}1 week)</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
