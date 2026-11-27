"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { TrendingUp, Activity, AlertTriangle, CheckCircle, MapPin, BarChart2 } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";

type Defect = {
  id: string;
  category: string;
  severity: number;
  status: string;
  created_at: string;
  campus_zone_id: string;
  campus_zones: { name: string; zone_area_factor: number }[] | null;
};

const SEVERITY_WEIGHTS: Record<number, number> = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 20 };
const CATEGORY_COLORS: Record<string, string> = {
  drainage: "#4a9eff",
  road: "#f5a623",
  walkway: "#3ec97a",
  structure: "#ff5a5a",
  other: "#9b59b6",
};
const SEVERITY_COLORS = ["#3ec97a", "#4a9eff", "#f5a623", "#ff7a40", "#ff5a5a"];

export default function AnalyticsCharts() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("defects")
        .select("id, category, severity, status, created_at, campus_zone_id, campus_zones(name, zone_area_factor)")
        .order("created_at", { ascending: true });
      setDefects((data ?? []) as Defect[]);
      setLoading(false);
    };
    fetch();
  }, []);

  // ── Chart 1: Defects per month (12-month rolling) ──────────────────────────
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(new Date(), 11 - i));
    const label = format(monthStart, "MMM yy");
    const count = defects.filter(d =>
      format(startOfMonth(new Date(d.created_at)), "MMM yy") === label
    ).length;
    return { month: label, defects: count };
  });

  // ── Chart 2: Defects by category (donut) ────────────────────────────────────
  const categoryMap: Record<string, number> = {};
  defects.forEach(d => { categoryMap[d.category] = (categoryMap[d.category] ?? 0) + 1; });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // ── Chart 3: Defects by zone (horizontal bar) ────────────────────────────────
  const zoneMap: Record<string, number> = {};
  defects.forEach(d => {
    const zoneName = Array.isArray(d.campus_zones)
      ? d.campus_zones[0]?.name
      : (d.campus_zones as { name: string } | null)?.name;
    if (zoneName) zoneMap[zoneName] = (zoneMap[zoneName] ?? 0) + 1;
  });
  const zoneBarData = Object.entries(zoneMap)
    .map(([zone, count]) => ({ zone, defects: count }))
    .sort((a, b) => b.defects - a.defects);

  // ── Chart 4: Severity distribution per month ────────────────────────────────
  const severityMonthly = monthlyData.map(({ month }) => {
    const monthDefects = defects.filter(d =>
      format(startOfMonth(new Date(d.created_at)), "MMM yy") === month
    );
    const entry: Record<string, string | number> = { month };
    [1, 2, 3, 4, 5].forEach(s => {
      entry[`Sev${s}`] = monthDefects.filter(d => d.severity === s).length;
    });
    return entry;
  });

  // ── Chart 5: Structural Health Rating per zone ──────────────────────────────
  const zoneScores: Record<string, { score: number; factor: number; count: number }> = {};
  defects.forEach(d => {
    const zoneArr = Array.isArray(d.campus_zones) ? d.campus_zones[0] : d.campus_zones as { name: string; zone_area_factor: number } | null;
    if (!zoneArr) return;
    const key = zoneArr.name;
    if (!zoneScores[key]) zoneScores[key] = { score: 0, factor: zoneArr.zone_area_factor ?? 1, count: 0 };
    zoneScores[key].score += SEVERITY_WEIGHTS[d.severity] ?? 1;
    zoneScores[key].count += 1;
  });
  const shrData = Object.entries(zoneScores).map(([zone, { score, factor }]) => ({
    zone: zone.replace("Zone", "Zn"),
    shr: Math.max(0, Math.round(100 - (score / factor))),
  })).sort((a, b) => b.shr - a.shr);

  // ── Summary Stats ─────────────────────────────────────────────────────────────
  const total = defects.length;
  const resolved = defects.filter(d => d.status === "resolved").length;
  const critical = defects.filter(d => d.severity >= 4).length;
  const assessed = defects.filter(d => d.status === "assessed").length;

  if (loading) return null;

  const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) => (
    <div className={`bg-bg2 border border-borderDark rounded-xl p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-textDefault">{value}</div>
        <div className="text-xs text-text3 font-mono uppercase tracking-wider mt-0.5">{label}</div>
      </div>
    </div>
  );

  const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="bg-bg2 border border-borderDark rounded-xl p-6">
      <div className="mb-6">
        <h3 className="font-bold text-textDefault text-base">{title}</h3>
        {subtitle && <p className="text-text3 text-xs font-mono mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderDark pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-textDefault flex items-center gap-3">
            <BarChart2 className="text-primary" /> Analytics Dashboard
          </h1>
          <p className="text-text2 mt-1 text-sm">
            Structural health intelligence — FUTA campus infrastructure at a glance.
          </p>
        </div>
        <div className="text-xs font-mono text-text3 bg-bg border border-borderDark rounded px-3 py-1.5">
          {total} total defects indexed
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Logged" value={total} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
        <StatCard icon={AlertTriangle} label="Critical / Emergency" value={critical} color="bg-danger/10 text-danger" />
        <StatCard icon={TrendingUp} label="Under Assessment" value={assessed} color="bg-warning/10 text-warning" />
        <StatCard icon={CheckCircle} label="Resolved" value={resolved} color="bg-success/10 text-success" />
      </div>

      {/* Row 1: Line chart + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Defects Reported per Month" subtitle="12-month rolling window">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
                <XAxis dataKey="month" tick={{ fill: "#7a8aaa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#7a8aaa", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#161b25", border: "1px solid #2a3347", borderRadius: 8, color: "#d0daea" }}
                />
                <Line
                  type="monotone"
                  dataKey="defects"
                  stroke="#4a9eff"
                  strokeWidth={2.5}
                  dot={{ fill: "#4a9eff", r: 4 }}
                  activeDot={{ r: 6, fill: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Defects by Category" subtitle="Distribution breakdown">
          {categoryData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-text3 font-mono text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] ?? "#4a9eff"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#161b25", border: "1px solid #2a3347", borderRadius: 8, color: "#d0daea" }}
                />
                <Legend formatter={(v) => <span style={{ color: "#d0daea", fontSize: 12, textTransform: "capitalize" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Zone bar + Severity stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Defects by Campus Zone" subtitle="Horizontal distribution — worst zones on top">
          {zoneBarData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-text3 font-mono text-sm">No zone data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={zoneBarData} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#7a8aaa", fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="zone" type="category" tick={{ fill: "#d0daea", fontSize: 11 }} width={110} />
                <Tooltip
                  contentStyle={{ background: "#161b25", border: "1px solid #2a3347", borderRadius: 8, color: "#d0daea" }}
                />
                <Bar dataKey="defects" fill="#4a9eff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Severity Trend by Month" subtitle="Stacked — is campus getting better?">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={severityMonthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
              <XAxis dataKey="month" tick={{ fill: "#7a8aaa", fontSize: 11 }} />
              <YAxis tick={{ fill: "#7a8aaa", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#161b25", border: "1px solid #2a3347", borderRadius: 8, color: "#d0daea" }}
              />
              <Legend formatter={(v) => <span style={{ color: "#7a8aaa", fontSize: 11 }}>{v}</span>} />
              {[1, 2, 3, 4, 5].map((s, i) => (
                <Bar key={s} dataKey={`Sev${s}`} name={`Level ${s}`} stackId="a" fill={SEVERITY_COLORS[i]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: SHR score per zone */}
      <ChartCard
        title="Structural Health Rating (SHR) per Zone"
        subtitle="Score: 100 = pristine, 0 = critical. Calculated from severity load vs zone area factor."
      >
        {shrData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-text3 font-mono text-sm">
            No zone data yet — submit defects to populate this chart.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {shrData.map(({ zone, shr }) => {
              const color = shr >= 75 ? "#3ec97a" : shr >= 50 ? "#f5a623" : shr >= 25 ? "#ff7a40" : "#ff5a5a";
              return (
                <div key={zone} className="bg-bg border border-borderDark rounded-lg p-4 text-center">
                  <div className="text-xs font-mono text-text3 uppercase tracking-wider mb-3 flex items-center justify-center gap-1">
                    <MapPin size={11} /> {zone}
                  </div>
                  <div
                    className="text-4xl font-bold mb-1"
                    style={{ color }}
                  >
                    {shr}
                  </div>
                  <div className="text-xs text-text3">/ 100</div>
                  <div className="mt-3 h-2 bg-borderDark rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${shr}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] font-mono" style={{ color }}>
                    {shr >= 75 ? "HEALTHY" : shr >= 50 ? "MODERATE" : shr >= 25 ? "DEGRADED" : "CRITICAL"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

    </div>
  );
}
