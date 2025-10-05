"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// ---------- Types ----------
type Offer = { id: string; name: string; asp: number; gm: number; share: number };
type HeadcountRow = { id: string; role: string; fte: number; focusHrs: number; util: number; contractors: number };
type FunnelCounts = { awareness: number; lead: number; qualified: number; booked: number; show: number; proposal: number; closeWon: number };
type CycleQuality = { bookedToShowDays: number; showToProposalDays: number; proposalToCloseDays: number; noShowRate: number; proposalWin: number };
type PostClose = { onboardingToAhaDays: number; m1Retention: number; m2Retention: number };
type BacklogItem = { id: string; stage: string; units: number };
type Cash = { cac: number; dso: number; paybackDays: number; prepayShare: number };
type StageRow = { id: string; stage: string; unit: string; owner: string; fte: number; focusHrs: number; util: number; stdRate: number; yield: number };

// ---------- Helpers ----------
const fmt = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "";
const safe = (n: number, alt = 0) => (Number.isFinite(n) && !Number.isNaN(n) ? n : alt);
const sum = (arr: number[]) => arr.reduce((a, b) => a + safe(b), 0);

// ---------- Defaults ----------
const DEFAULT_STAGES: StageRow[] = [
  { id: "s1", stage: "Awareness", unit: "lead", owner: "Marketing", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s2", stage: "Lead", unit: "lead", owner: "Marketing/SDR", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s3", stage: "Qualified", unit: "lead", owner: "SDR", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s4", stage: "Booked", unit: "meeting", owner: "SDR", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s5", stage: "Show", unit: "meeting", owner: "AE", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s6", stage: "Proposal", unit: "proposal", owner: "AE/RevOps", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s7", stage: "CloseWon", unit: "deal", owner: "AE", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s8", stage: "Onboarding", unit: "client", owner: "Delivery/CS", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s9", stage: "Aha", unit: "client", owner: "Delivery/CS", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s10", stage: "Delivery", unit: "client", owner: "Delivery", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
  { id: "s11", stage: "Renewal/Expansion", unit: "client", owner: "CS", fte: 0, focusHrs: 0, util: 0.85, stdRate: 0, yield: 1 },
];

export default function Page() {
  // Scope
  const [days, setDays] = useState<number>(90);
  const weeks = useMemo(() => safe(days / 7, 0), [days]);

  // Offers (simplified to keep this file small but working)
  const [offers] = useState<Offer[]>([{ id: "o1", name: "Core", asp: 5000, gm: 0.7, share: 1 }]);

  // Headcount (summary)
  const [headcount] = useState<HeadcountRow[]>([
    { id: "h3", role: "Sales AE", fte: 1, focusHrs: 20, util: 0.85, contractors: 0 },
  ]);

  // Minimal funnel/backlog/cash just to compile and display
  const [backlog, setBacklog] = useState<BacklogItem[]>(DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })));
  const [stages, setStages] = useState<StageRow[]>(
    DEFAULT_STAGES.map(s =>
      s.stage === "Proposal"
        ? { ...s, fte: 1, focusHrs: 20, util: 0.85, stdRate: 1, yield: 0.95 }
        : s
    )
  );
  const totalFTE = useMemo(() => sum(headcount.map(h => h.fte + h.contractors)), [headcount]);

  // Weighted ASP/GM
  const weightedASP = useMemo(() => sum(offers.map(o => o.asp * o.share)), [offers]);
  const weightedGM = useMemo(() => sum(offers.map(o => o.gm * o.share)) / (sum(offers.map(o => o.share)) || 1), [offers]);

  // Capacity
  const capsPerWeek = useMemo(
    () => stages.map(s => ({ stage: s.stage, cap: safe(s.fte * s.focusHrs * s.util * s.stdRate * s.yield) })),
    [stages]
  );
  const dealsPerWeekFromStage = useMemo(
    () => stages.map((s, i) => ({ stage: s.stage, dealsPerWeek: capsPerWeek[i]?.cap ?? 0 })),
    [stages, capsPerWeek]
  );
  const systemDealsPerWeek = useMemo(() => {
    const min = dealsPerWeekFromStage.reduce(
      (a, b) => (a.dealsPerWeek < b.dealsPerWeek ? a : b),
      { stage: "—", dealsPerWeek: Infinity }
    );
    return { value: min.dealsPerWeek === Infinity ? 0 : min.dealsPerWeek, stage: min.stage };
  }, [dealsPerWeekFromStage]);

  const deals90d = useMemo(() => safe(systemDealsPerWeek.value * weeks), [systemDealsPerWeek, weeks]);
  const rev90d = useMemo(() => safe(deals90d * weightedASP), [deals90d, weightedASP]);
  const gp90d = useMemo(() => safe(rev90d * weightedGM), [rev90d, weightedGM]);
  const rfteCeiling = useMemo(() => (totalFTE > 0 ? gp90d / totalFTE : 0), [gp90d, totalFTE]);

  // Backlog weeks
  const backlogWeeks = useMemo(
    () =>
      stages.map((s, i) => {
        const cap = capsPerWeek[i]?.cap ?? 0;
        const units = backlog[i]?.units ?? 0;
        const weeksOf = cap > 0 ? units / cap : 0;
        return { stage: s.stage, units, cap, weeksOf };
      }),
    [stages, backlog, capsPerWeek]
  );

  const setBacklogUnits = (id: string, units: number) =>
    setBacklog(prev => prev.map(b => (b.id === id ? { ...b, units } : b)));

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">R/FTE Bottleneck Mapper</h1>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>Total FTE: <b>{fmt(totalFTE)}</b></div>
          <div>Deals/wk ceiling: <b>{fmt(systemDealsPerWeek.value, 2)}</b> @ {systemDealsPerWeek.stage}</div>
          <div>GP (90d): <b>${fmt(gp90d)}</b></div>
          <div>R/FTE ceiling: <b>${fmt(rfteCeiling)}</b></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="backlog" className="w-full">
        <TabsList className="grid grid-cols-1">
          <TabsTrigger value="backlog">Backlog</TabsTrigger>
        </TabsList>

        <TabsContent value="backlog">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Backlog Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stages.map((s, i) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3 font-medium">{s.stage}</div>

                  <Input
                    className="col-span-3"
                    type="number"
                    value={backlog[i]?.units ?? 0}
                    onChange={e => setBacklogUnits(s.id, parseFloat(e.target.value) || 0)}
                  />

                  <div className="col-span-3 text-sm">
                    Weekly cap: <b>{fmt(capsPerWeek[i]?.cap ?? 0, 2)}</b>
                  </div>

                  <div className="col-span-3 text-sm">
                    Weeks of backlog: <b>{fmt(backlogWeeks[i]?.weeksOf ?? 0, 2)}</b>{" "}
                    {(backlogWeeks[i]?.weeksOf ?? 0) > 1 ? (
                      <span className="text-red-600">({"{"}">{"}"}1 week)</span>
                    ) : (
                      <span className="text-emerald-600">({"{"}"\u2264{"}"}1 week)</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Stage Capacity (bar)</CardTitle></CardHeader>
        <CardContent style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages.map((s, i) => ({ name: s.stage, capacity: capsPerWeek[i]?.cap ?? 0 }))}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="capacity" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </main>
  );
}
