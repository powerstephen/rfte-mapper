"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Plus,
  Trash2,
  Gauge,
  DollarSign,
  Users,
  AlertTriangle,
  Table as TableIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Offer = { id: string; name: string; asp: number; gm: number; share: number };
type HeadcountRow = { id: string; role: string; fte: number; focusHrs: number; util: number; contractors: number };
type FunnelCounts = { awareness: number; lead: number; qualified: number; booked: number; show: number; proposal: number; closeWon: number };
type CycleQuality = { bookedToShowDays: number; showToProposalDays: number; proposalToCloseDays: number; noShowRate: number; proposalWin: number };
type PostClose = { onboardingToAhaDays: number; m1Retention: number; m2Retention: number };
type BacklogItem = { id: string; stage: string; units: number };
type Cash = { cac: number; dso: number; paybackDays: number; prepayShare: number };
type StageRow = { id: string; stage: string; unit: string; owner: string; fte: number; focusHrs: number; util: number; stdRate: number; yield: number };

const fmt = (n: number, d = 0) =>
  isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "";
const pct = (n: number) => (isFinite(n) ? (n * 100).toFixed(1) + "%" : "");
const safe = (n: number, alt = 0) => (isFinite(n) && !isNaN(n) ? n : alt);
const sum = (arr: number[]) => arr.reduce((a, b) => a + safe(b), 0);

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

export default function RFTEBottleneckMapper() {
  const [days, setDays] = useState<number>(90);
  const weeks = useMemo(() => safe(days / 7, 0), [days]);

  const [offers, setOffers] = useState<Offer[]>([{ id: "o1", name: "Core", asp: 0, gm: 0.7, share: 1 }]);
  const [headcount, setHeadcount] = useState<HeadcountRow[]>([
    { id: "h1", role: "Marketing", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h2", role: "SDR/BDR", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h3", role: "Sales AE", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h4", role: "RevOps", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h5", role: "Delivery", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
    { id: "h6", role: "CS/Success", fte: 0, focusHrs: 0, util: 0.7, contractors: 0 },
  ]);

  const [funnel, setFunnel] = useState<FunnelCounts>({ awareness: 0, lead: 0, qualified: 0, booked: 0, show: 0, proposal: 0, closeWon: 0 });
  const [cq, setCQ] = useState<CycleQuality>({ bookedToShowDays: 0, showToProposalDays: 0, proposalToCloseDays: 0, noShowRate: 0.0, proposalWin: 0.0 });
  const [post, setPost] = useState<PostClose>({ onboardingToAhaDays: 0, m1Retention: 0.0, m2Retention: 0.0 });
  const [backlog, setBacklog] = useState<BacklogItem[]>(DEFAULT_STAGES.map(s => ({ id: s.id, stage: s.stage, units: 0 })));
  const [cash, setCash] = useState<Cash>({ cac: 0, dso: 0, paybackDays: 0, prepayShare: 0 });
  const [stages, setStages] = useState<StageRow[]>(DEFAULT_STAGES);

  // --- derived
  const totalFTE = useMemo(() => sum(headcount.map(h => h.fte + h.contractors)), [headcount]);
  const weightedASP = useMemo(() => sum(offers.map(o => o.asp * o.share)), [offers]);
  const weightedGM = useMemo(() => sum(offers.map(o => o.gm * o.share)) / (sum(offers.map(o => o.share)) || 1), [offers]);
  const capsPerWeek = useMemo(() => stages.map(s => ({ stage: s.stage, cap: s.fte * s.focusHrs * s.util * s.stdRate * s.yield })), [stages]);
  const dealsPerWeekFromStage = useMemo(() => stages.map((s, i) => ({ stage: s.stage, dealsPerWeek: capsPerWeek[i]?.cap ?? 0 })), [stages, capsPerWeek]);
  const systemDealsPerWeek = useMemo(() => {
    const min = dealsPerWeekFromStage.reduce(
      (a, b) => (a.dealsPerWeek < b.dealsPerWeek ? a : b),
      { stage: "—", dealsPerWeek: Infinity }
    );
    return { value: min.dealsPerWeek, stage: min.stage };
  }, [dealsPerWeekFromStage]);

  const deals90d = useMemo(() => systemDealsPerWeek.value * weeks, [systemDealsPerWeek, weeks]);
  const rev90d = useMemo(() => deals90d * weightedASP, [deals90d, weightedASP]);
  const gp90d = useMemo(() => rev90d * weightedGM, [rev90d, weightedGM]);
  const rfteCeil = useMemo(() => (totalFTE > 0 ? gp90d / totalFTE : 0), [gp90d, totalFTE]);

  const gpPerDay = useMemo(() => (days > 0 ? gp90d / days : 0), [gp90d, days]);
  const gp30 = useMemo(() => gpPerDay * 30, [gpPerDay]);
  const gp30CAC = useMemo(() => (cash.cac > 0 ? gp30 / cash.cac : 0), [gp30, cash.cac]);
  const cashFlag = useMemo(() => gp30CAC > 0 && gp30CAC < 3, [gp30CAC]);

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

  const updateStage = (id: string, patch: Partial<StageRow>) =>
    setStages(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  const setBacklogUnits = (id: string, units: number) =>
    setBacklog(prev => prev.map(b => (b.id === id ? { ...b, units } : b)));

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">R/FTE Bottleneck Mapper</h1>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Total FTE: {fmt(totalFTE)}</div>
          <div>Deals/week ceiling: {fmt(systemDealsPerWeek.value, 2)} @ {systemDealsPerWeek.stage}</div>
          <div>GP(90d): ${fmt(gp90d)}</div>
          <div>R/FTE ceiling: ${fmt(rfteCeil)}</div>
          <div>GP30/CAC: {fmt(gp30CAC, 2)} {cashFlag && <span className="text-red-600">(cash constrained)</span>}</div>
        </CardContent>
      </Card>

      <Tabs defaultValue="backlog" className="w-full">
        <TabsList className="grid grid-cols-1">
          <TabsTrigger value="backlog">Backlog Health</TabsTrigger>
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
                    onChange={e =>
                      setBacklogUnits(s.id, parseFloat(e.target.value) || 0)
                    }
                  />

                  <div className="col-span-3 text-sm">
                    Weekly cap: <b>{fmt(capsPerWeek[i]?.cap ?? 0, 2)}</b>
                  </div>

                  <div className="col-span-3 text-sm">
                    Weeks of backlog: <b>{fmt(backlogWeeks[i]?.weeksOf ?? 0, 2)}</b>{" "}
                    {(backlogWeeks[i]?.weeksOf ?? 0) > 1 ? (
                      <span className="text-red-600">(&gt;1 week)</span>
                    ) : (
                      <span className="text-emerald-600">(≤1 week)</span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
