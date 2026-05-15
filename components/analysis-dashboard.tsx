"use client"

// ============================================================
// components/analysis-dashboard.tsx
// Full driving analysis dashboard – light theme, chart-rich
// ============================================================

import { useMemo, useState } from "react"
import { format } from "date-fns"
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, AreaChart, Area,
  LabelList, Cell,
} from "recharts"
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Star, Target, Zap, Brain, Award,
  ChevronRight, BarChart2, Activity, Shield,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type Attempt = Record<string, any>

// ─────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "readiness", label: "Readiness", color: "#6366f1",
    items: [
      { key: "seatbelt",      label: "Seatbelt",      max: 2, ai: true },
      { key: "behavior",      label: "Behavior",       max: 2, ai: true },
      { key: "seat_adjust",   label: "Seat Adjust",    max: 2, ai: false },
      { key: "mirror_adjust", label: "Mirror Adjust",  max: 2, ai: false },
      { key: "start_move",    label: "Start & Move",   max: 2, ai: false },
    ],
  },
  {
    id: "control", label: "Control", color: "#0ea5e9",
    items: [
      { key: "surroundings",  label: "Surroundings",   max: 3, ai: true  },
      { key: "positioning",   label: "Positioning",    max: 4, ai: true  },
      { key: "gear",          label: "Gear Usage",     max: 4, ai: false },
      { key: "steering",      label: "Steering",       max: 4, ai: false },
    ],
  },
  {
    id: "turns", label: "Turns & Curves", color: "#10b981",
    items: [
      { key: "lane_keeping",    label: "Lane Keeping",    max: 4, ai: true  },
      { key: "turning",         label: "Turning",         max: 4, ai: true  },
      { key: "sign_awareness",  label: "Sign Awareness",  max: 4, ai: true  },
      { key: "indicator_turn",  label: "Indicator Turn",  max: 3, ai: false },
    ],
  },
  {
    id: "traffic", label: "Traffic Rules", color: "#f59e0b",
    items: [
      { key: "traffic_aware",   label: "Traffic Awareness", max: 4, ai: true  },
      { key: "ground_marks",    label: "Ground Marks",      max: 4, ai: true  },
      { key: "intersections",   label: "Intersections",     max: 4, ai: true  },
      { key: "indicator",       label: "Indicator Rules",   max: 3, ai: false },
    ],
  },
  {
    id: "overtaking", label: "Overtaking", color: "#ef4444",
    items: [
      { key: "overtake_place",  label: "Place & Time",   max: 3, ai: false },
      { key: "overtake_signal", label: "Signal",         max: 2, ai: false },
      { key: "overtake_watch",  label: "Monitoring",     max: 3, ai: false },
      { key: "overtake_return", label: "Return Safely",  max: 2, ai: false },
    ],
  },
  {
    id: "stopping", label: "Stopping", color: "#8b5cf6",
    items: [
      { key: "normal_stop",      label: "Normal Stop",       max: 2, ai: true },
      { key: "sudden_stop",      label: "Sudden Stop",       max: 3, ai: true },
      { key: "intersect_safety", label: "Intersection Gap",  max: 3, ai: true },
      { key: "stop_compliance",  label: "Stop Compliance",   max: 2, ai: true },
    ],
  },
  {
    id: "elements", label: "Traffic Elements", color: "#ec4899",
    items: [
      { key: "pedestrians", label: "Pedestrians", max: 4, ai: true },
      { key: "vehicles",    label: "Vehicles",    max: 4, ai: true },
      { key: "road_env",    label: "Road Env",    max: 4, ai: true },
      { key: "obstacles",   label: "Obstacles",   max: 3, ai: true },
    ],
  },
  {
    id: "parking", label: "Parking & Reverse", color: "#14b8a6",
    items: [
      { key: "parking_safe_stop",  label: "Safe Stop",        max: 2, ai: true  },
      { key: "parking_alignment",  label: "Alignment",        max: 3, ai: true  },
      { key: "reverse_look",       label: "Reverse Look",     max: 2, ai: false },
      { key: "reverse_watch",      label: "Reverse Monitor",  max: 3, ai: false },
    ],
  },
]

const ALL_ITEMS = SECTIONS.flatMap((s) =>
  s.items.map((it) => ({ ...it, section: s.id, sectionLabel: s.label, sectionColor: s.color }))
)

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function pct(score: number, max: number) {
  return Math.round((score / max) * 100)
}

function scoreColor(p: number) {
  if (p >= 75) return "#10b981"
  if (p >= 50) return "#f59e0b"
  return "#ef4444"
}

function scoreBg(p: number) {
  if (p >= 75) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (p >= 50) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-red-50 text-red-700 border-red-200"
}

// ─────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CUSTOM SCORE HISTORY TOOLTIP (shows date + values clearly)
// ─────────────────────────────────────────────────────────────
function ScoreHistoryTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}</span>
          </span>
          <strong style={{ color: p.color }}>{p.value} pts</strong>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION COMPARISON TOOLTIP (for the new radar replacement)
// ─────────────────────────────────────────────────────────────
function SectionCompareTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}</span>
          </span>
          <strong style={{ color: p.color }}>{p.value}%</strong>
        </div>
      ))}
      <p className="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">Pass threshold: 75%</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RECOMMENDATIONS ENGINE
// ─────────────────────────────────────────────────────────────
function buildRecommendations(latest: Attempt, all: Attempt[]) {
  const recs: { icon: any; title: string; detail: string; severity: "high" | "medium" | "low" }[] = []

  ALL_ITEMS.forEach((item) => {
    const score = latest[`${item.key}_score`] ?? 0
    const p = pct(score, item.max)

    if (p < 50) {
      const weakCount = all.filter((a) => pct(a[`${item.key}_score`] ?? 0, item.max) < 50).length
      recs.push({
        icon: weakCount >= 2 ? AlertTriangle : Target,
        title: `Improve ${item.label}`,
        detail: weakCount >= 2
          ? `Weak in ${weakCount}/${all.length} attempts. Requires focused practice.`
          : `Scored ${score}/${item.max} in latest attempt. Focus here next session.`,
        severity: weakCount >= 2 ? "high" : "medium",
      })
    }
  })

  return recs
    .sort((a, b) => (a.severity === "high" ? -1 : 1))
    .slice(0, 5)
}

// ─────────────────────────────────────────────────────────────
// DRIVER PROFILE
// ─────────────────────────────────────────────────────────────
function driverProfile(avg: number, trend: number, consistency: number) {
  if (avg >= 85) return { label: "Elite Driver", emoji: "🏆", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" }
  if (avg >= 75 && trend >= 0) return { label: "Safe Driver", emoji: "✅", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" }
  if (trend > 5) return { label: "Improving Driver", emoji: "📈", color: "text-violet-600", bg: "bg-violet-50 border-violet-200" }
  if (consistency > 15) return { label: "Inconsistent Driver", emoji: "⚡", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" }
  if (avg < 55) return { label: "Needs Practice", emoji: "🎯", color: "text-red-600", bg: "bg-red-50 border-red-200" }
  return { label: "Developing Driver", emoji: "🚗", color: "text-slate-600", bg: "bg-slate-50 border-slate-200" }
}

// ─────────────────────────────────────────────────────────────
// CUSTOM DOT FOR SCORE HISTORY
// ─────────────────────────────────────────────────────────────
function ScoreDot(props: any) {
  const { cx, cy, value, stroke } = props
  if (!cx || !cy) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={stroke} stroke="white" strokeWidth={2} />
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// CUSTOM LABEL FOR SCORE HISTORY DOTS
// ─────────────────────────────────────────────────────────────
function ScoreLabel(props: any) {
  const { x, y, value, fill } = props
  if (value == null) return null
  return (
    <text x={x} y={y - 10} fill={fill} fontSize={11} fontWeight={700} textAnchor="middle">
      {value}
    </text>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export function AnalysisDashboard({ attempts }: { attempts: Attempt[] }) {
  const [activeSection, setActiveSection] = useState("all")





 // ─── Guard: no attempts yet — MUST be before any attempt-dependent code ───
  if (!attempts || attempts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-50 rounded-xl border border-yellow-200">
        <svg className="w-16 h-16 text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">No Test Data Yet</h2>
        <p className="text-gray-600 max-w-md">
          You haven't completed a practical test yet. Go take the practical exam first, then come back here and you'll find this page ready for you.
        </p>
      </div>
    )
  }






  const latest = attempts[attempts.length - 1]
  const first  = attempts[0]

  // KPI calculations
  const scores = attempts.map((a) => a.total_score)
  const avg    = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
  const trend  = attempts.length > 1 ? latest.total_score - first.total_score : 0
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length
  const consistency = Math.sqrt(variance)
  const predicted = attempts.length > 1
    ? Math.min(100, Math.round(latest.total_score + (latest.total_score - attempts[attempts.length - 2].total_score)))
    : latest.total_score
  const profile = driverProfile(avg, trend, consistency)

  // Chart data
  const lineData = attempts.map((a, i) => ({
    name: `Attempt ${i + 1}`,
    date: format(new Date(a.created_at), "MMM d"),
    Total: a.total_score,
    "AI Score": a.ai_total_score,
    "Manual Score": a.manual_total_score,
  }))

  const sectionBarData = SECTIONS.map((sec) => {
    const maxTotal = sec.items.reduce((s, i) => s + i.max, 0)
    const scored   = sec.items.reduce((s, i) => s + (latest[`${i.key}_score`] ?? 0), 0)
    return {
      name: sec.label,
      score: scored,
      max: maxTotal,
      pct: pct(scored, maxTotal),
      color: sec.color,
    }
  })

  // ── NEW: Section Comparison data (replaces radar) ──────────
  // Shows last 3 attempts side-by-side per section as grouped bars
  const last3 = attempts.slice(-3)
  const sectionCompareData = SECTIONS.map((sec) => {
    const maxTotal = sec.items.reduce((s, i) => s + i.max, 0)
    const obj: any = { section: sec.label.replace(" & ", "\n& ") }
    last3.forEach((a, idx) => {
      const total = sec.items.reduce((s, it) => s + (a[`${it.key}_score`] ?? 0), 0)
      const attemptNum = attempts.length - last3.length + idx + 1
      obj[`Attempt ${attemptNum}`] = Math.round((total / maxTotal) * 100)
    })
    return obj
  })
  const compareKeys = last3.map((_, idx) => {
    const attemptNum = attempts.length - last3.length + idx + 1
    return `Attempt ${attemptNum}`
  })
  const compareColors = ["#6366f1", "#0ea5e9", "#10b981"]

  // Per-attempt section breakdown
  const sectionTrendData = SECTIONS.map((sec) => {
    const maxTotal = sec.items.reduce((s, i) => s + i.max, 0)
    const obj: any = { section: sec.label }
    attempts.forEach((a, i) => {
      const total = sec.items.reduce((s, it) => s + (a[`${it.key}_score`] ?? 0), 0)
      obj[`#${i + 1}`] = pct(total, maxTotal)
    })
    return obj
  })

  // Top strengths & weaknesses
  const skillRatings = ALL_ITEMS.map((item) => ({
    ...item,
    score: latest[`${item.key}_score`] ?? 0,
    p: pct(latest[`${item.key}_score`] ?? 0, item.max),
  })).sort((a, b) => b.p - a.p)

  const topStrengths  = skillRatings.slice(0, 4)
  const topWeaknesses = [...skillRatings].sort((a, b) => a.p - b.p).slice(0, 4)

  const recommendations = buildRecommendations(latest, attempts)

  if (attempts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-lg">No practical test data yet.</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* ── HEADER ─────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Driving Analysis Dashboard
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {attempts.length} attempt{attempts.length > 1 ? "s" : ""} recorded ·
                Last: {format(new Date(latest.created_at), "MMMM d, yyyy")}
              </p>
            </div>
            {/* Driver Profile Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${profile.bg} ${profile.color}`}>
              <span className="text-lg">{profile.emoji}</span>
              {profile.label}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── KPI ROW ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Latest Score",
              value: `${latest.total_score}/100`,
              sub: latest.total_score >= 75 ? "PASSED ✓" : "FAILED ✗",
              subColor: latest.total_score >= 75 ? "text-emerald-600" : "text-red-500",
              icon: Activity,
              accent: "#6366f1",
            },
            {
              label: "Average Score",
              value: `${avg}/100`,
              sub: `Over ${attempts.length} attempts`,
              subColor: "text-slate-400",
              icon: BarChart2,
              accent: "#0ea5e9",
            },
            {
              label: "Overall Trend",
              value: trend === 0 ? "Stable" : `${trend > 0 ? "+" : ""}${trend} pts`,
              sub: trend > 0 ? "Improving 📈" : trend < 0 ? "Declining 📉" : "No change",
              subColor: trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-slate-400",
              icon: trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus,
              accent: trend > 0 ? "#10b981" : trend < 0 ? "#ef4444" : "#94a3b8",
            },
            {
              label: "Predicted Next",
              value: `${predicted}/100`,
              sub: predicted >= 75 ? "Expected pass" : "Needs work",
              subColor: predicted >= 75 ? "text-emerald-600" : "text-amber-600",
              icon: Brain,
              accent: "#f59e0b",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.accent}18` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.accent }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
              <div className={`text-xs mt-1 font-medium ${kpi.subColor}`}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ── SCORE OVER TIME (improved with axis labels + data labels) ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Score History</h2>
            <span className="ml-auto text-xs text-slate-400">All attempts</span>
          </div>
          {/* Axis label hint row */}
          <div className="flex items-center gap-6 mb-4 px-1">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">Y-axis:</span> Total score out of 100
            </p>
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">X-axis:</span> Attempt number
            </p>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span className="inline-block w-4 border-t-2 border-dashed border-emerald-500" />
              Pass line = 75 pts
            </span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={lineData} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                label={{ value: "Attempt Number", position: "insideBottom", offset: -2, fontSize: 12, fill: "#94a3b8" }}
                height={44}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                label={{ value: "Score (out of 100)", angle: -90, position: "insideLeft", offset: 14, fontSize: 12, fill: "#94a3b8" }}
                width={56}
              />
              <Tooltip content={<ScoreHistoryTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#64748b", paddingTop: 8 }}
                formatter={(value) => <span style={{ color: "#64748b", fontWeight: 500 }}>{value}</span>}
              />
              <ReferenceLine
                y={75}
                stroke="#10b981"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{ value: "Pass threshold (75)", fill: "#10b981", fontSize: 11, position: "insideTopRight" }}
              />
              <Area
                type="monotone"
                dataKey="Total"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#totalGrad)"
                dot={<ScoreDot stroke="#6366f1" />}
                label={<ScoreLabel fill="#6366f1" />}
                activeDot={{ r: 6, stroke: "#6366f1", strokeWidth: 2, fill: "white" }}
              />
              <Line
                type="monotone"
                dataKey="AI Score"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "#0ea5e9", stroke: "white", strokeWidth: 1.5 }}
                strokeDasharray="4 2"
                label={{ fontSize: 10, fill: "#0ea5e9", position: "top", formatter: (v: any) => v }}
              />
              <Line
                type="monotone"
                dataKey="Manual Score"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "#f59e0b", stroke: "white", strokeWidth: 1.5 }}
                strokeDasharray="4 2"
                label={{ fontSize: 10, fill: "#f59e0b", position: "top", formatter: (v: any) => v }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── SECTION PERFORMANCE + SECTION COMPARISON (replaces radar) ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Section Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-sky-600" />
              </div>
              <h2 className="font-semibold text-slate-800">Section Scores (Latest)</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-600">X-axis:</span> Score percentage (%)
              </p>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-600">Y-axis:</span> Test section
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sectionBarData} layout="vertical" barSize={16} margin={{ top: 4, right: 48, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "Score (%)", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94a3b8" }}
                  height={36}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={108}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(v: any) => [`${v}%`, "Score"]}
                />
                <ReferenceLine x={75} stroke="#10b98140" strokeDasharray="4 2" />
                <Bar dataKey="pct" name="Score %" radius={[0, 6, 6, 0]}>
                  {sectionBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="pct"
                    position="right"
                    formatter={(v: any) => `${v}%`}
                    style={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── NEW: Section Comparison across last 3 attempts (replaces radar) ── */}
          {attempts.length >= 2 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="font-semibold text-slate-800">
                  Section Comparison — Last {Math.min(3, attempts.length)} Attempts
                </h2>
              </div>
              <div className="flex items-center gap-4 mb-1">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">X-axis:</span> Test section
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">Y-axis:</span> Score percentage (%)
                </p>
              </div>
              {/* Legend badge explanation */}
              <div className="flex flex-wrap gap-2 mb-4">
                {compareKeys.map((key, i) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border"
                    style={{ background: `${compareColors[i]}18`, color: compareColors[i], borderColor: `${compareColors[i]}40` }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: compareColors[i] }} />
                    {key}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 ml-auto">
                  — Pass line: 75%
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={sectionCompareData}
                  barSize={attempts.length >= 3 ? 10 : 14}
                  margin={{ top: 18, right: 8, bottom: 48, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="section"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={56}
                    label={{ value: "Test Section", position: "insideBottom", offset: -44, fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `${v}%`}
                    label={{ value: "Score (%)", angle: -90, position: "insideLeft", offset: 14, fontSize: 11, fill: "#94a3b8" }}
                    width={52}
                  />
                  <Tooltip content={<SectionCompareTooltip />} />
                  <ReferenceLine y={75} stroke="#10b981" strokeDasharray="5 3" strokeWidth={1.5} />
                  {compareKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} fill={compareColors[i]} radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey={key}
                        position="top"
                        formatter={(v: any) => `${v}%`}
                        style={{ fontSize: 9, fontWeight: 700, fill: compareColors[i] }}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* If only 1 attempt, show AI vs Manual */
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <Brain className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="font-semibold text-slate-800">AI vs Manual Assessment</h2>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-6">
                {[
                  { label: "AI Assessment", score: latest.ai_total_score, max: 65, color: "#6366f1" },
                  { label: "Manual Assessment", score: latest.manual_total_score, max: 35, color: "#f59e0b" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      <span className="text-sm font-bold" style={{ color: item.color }}>{item.score}/{item.max}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct(item.score, item.max)}%`, background: item.color }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{pct(item.score, item.max)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── ATTEMPTS TABLE ───────────────────────── */}
        {attempts.length >= 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="font-semibold text-slate-800">Attempts Comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">#</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Date</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">AI</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Manual</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Change</th>
                    <th className="text-center py-3 px-4 text-slate-500 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...attempts].reverse().map((a, i, arr) => {
                    const prev = arr[i + 1]
                    const change = prev ? a.total_score - prev.total_score : null
                    const idx = attempts.length - i
                    return (
                      <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-700">#{idx}</td>
                        <td className="py-3 px-4 text-slate-600">{format(new Date(a.created_at), "MMM d, yyyy")}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{a.total_score}</td>
                        <td className="py-3 px-4 text-right text-violet-600 font-medium">{a.ai_total_score}</td>
                        <td className="py-3 px-4 text-right text-amber-600 font-medium">{a.manual_total_score}</td>
                        <td className="py-3 px-4 text-right">
                          {change !== null ? (
                            <span className={`inline-flex items-center gap-1 font-semibold ${change > 0 ? "text-emerald-600" : change < 0 ? "text-red-500" : "text-slate-400"}`}>
                              {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {change > 0 ? `+${change}` : change}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${a.total_score >= 75 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                            {a.total_score >= 75 ? "PASSED" : "FAILED"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SECTION TREND (grouped bar) ──────────── */}
        {attempts.length >= 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-pink-600" />
              </div>
              <h2 className="font-semibold text-slate-800">Section Progress Over Attempts (%)</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-600">X-axis:</span> Test section
              </p>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-600">Y-axis:</span> Score percentage (%)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={sectionTrendData}
                barSize={attempts.length > 4 ? 8 : 16}
                margin={{ top: 4, right: 8, bottom: 48, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="section"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  angle={-35}
                  textAnchor="end"
                  height={56}
                  interval={0}
                  label={{ value: "Test Section", position: "insideBottom", offset: -44, fontSize: 11, fill: "#94a3b8" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "Score (%)", angle: -90, position: "insideLeft", offset: 14, fontSize: 11, fill: "#94a3b8" }}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {attempts.map((_, i) => (
                  <Bar key={i} dataKey={`#${i + 1}`} fill={["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444"][i % 5]} radius={[3,3,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── STRENGTHS & WEAKNESSES ───────────────── */}
        <div className="grid sm:grid-cols-2 gap-6">

          {/* Strengths */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="font-semibold text-slate-800">Top Strengths</h2>
            </div>
            <div className="space-y-4">
              {topStrengths.map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <span className="text-sm font-bold text-emerald-600">{item.score}/{item.max}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${item.p}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <h2 className="font-semibold text-slate-800">Areas to Improve</h2>
            </div>
            <div className="space-y-4">
              {topWeaknesses.map((item) => (
                <div key={item.key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <span className="text-sm font-bold text-red-500">{item.score}/{item.max}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.p}%`, background: scoreColor(item.p) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FULL SKILL BREAKDOWN ─────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Full Skill Breakdown</h2>
            {/* Section filter tabs */}
            <div className="ml-auto flex flex-wrap gap-2">
              {["all", ...SECTIONS.map((s) => s.id)].map((id) => {
                const sec = SECTIONS.find((s) => s.id === id)
                return (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      activeSection === id
                        ? "bg-slate-800 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    style={activeSection === id && sec ? { background: sec.color } : {}}
                  >
                    {id === "all" ? "All" : (sec?.label ?? id)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTIONS
              .filter((s) => activeSection === "all" || s.id === activeSection)
              .flatMap((sec) =>
                sec.items.map((item) => {
                  const score = latest[`${item.key}_score`] ?? 0
                  const p = pct(score, item.max)
                  return (
                    <div key={item.key} className={`rounded-xl border p-4 ${scoreBg(p)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold">{item.label}</span>
                        <span className="text-xs font-bold">{score}/{item.max}</span>
                      </div>
                      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p}%`, background: scoreColor(p) }} />
                      </div>
                      <p className="text-xs mt-1.5 opacity-70">
                        {item.ai ? "🤖 AI" : "👤 Manual"} · {sec.label}
                      </p>
                    </div>
                  )
                })
              )}
          </div>
        </div>

        {/* ── RECOMMENDATIONS ──────────────────────── */}
        {recommendations.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-violet-600" />
              </div>
              <h2 className="font-semibold text-slate-800">Smart Recommendations</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${
                  rec.severity === "high" ? "bg-red-50 border-red-200" :
                  rec.severity === "medium" ? "bg-amber-50 border-amber-200" :
                  "bg-blue-50 border-blue-200"
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    rec.severity === "high" ? "bg-red-100" :
                    rec.severity === "medium" ? "bg-amber-100" : "bg-blue-100"
                  }`}>
                    <rec.icon className={`w-4 h-4 ${
                      rec.severity === "high" ? "text-red-600" :
                      rec.severity === "medium" ? "text-amber-600" : "text-blue-600"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${
                      rec.severity === "high" ? "text-red-800" :
                      rec.severity === "medium" ? "text-amber-800" : "text-blue-800"
                    }`}>{rec.title}</p>
                    <p className={`text-xs mt-0.5 ${
                      rec.severity === "high" ? "text-red-600" :
                      rec.severity === "medium" ? "text-amber-600" : "text-blue-600"
                    }`}>{rec.detail}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI INSIGHT SUMMARY ───────────────────── */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">AI Performance Summary</h2>
              <p className="text-slate-400 text-xs">Based on {attempts.length} attempt{attempts.length > 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                label: "Consistency Score",
                value: consistency < 5 ? "Excellent" : consistency < 10 ? "Good" : consistency < 15 ? "Fair" : "Poor",
                sub: `σ = ${consistency.toFixed(1)} pts`,
                icon: consistency < 10 ? "✅" : "⚠️",
              },
              {
                label: "Progress Rate",
                value: `${trend > 0 ? "+" : ""}${trend} pts`,
                sub: trend > 0 ? "Upward trend" : trend < 0 ? "Needs attention" : "Stable",
                icon: trend > 0 ? "📈" : trend < 0 ? "📉" : "➡️",
              },
              {
                label: "Pass Probability",
                value: `${Math.min(100, Math.round((predicted / 100) * 100))}%`,
                sub: predicted >= 75 ? "Likely to pass" : "Needs improvement",
                icon: predicted >= 75 ? "🎯" : "🔄",
              },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">{item.label}</p>
                <p className="text-xl font-bold text-white">{item.icon} {item.value}</p>
                <p className="text-slate-400 text-xs mt-1">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Motivational message */}
          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-slate-300 text-sm leading-relaxed">
              {avg >= 80
                ? "🌟 Excellent performance! You're consistently scoring above the pass threshold. Keep maintaining this level."
                : trend > 5
                ? "📈 Great improvement trajectory! Your scores are climbing. Focus on your weak areas and you'll pass on the next attempt."
                : trend < -5
                ? "⚠️ Your scores have been declining. Review the recommended areas above and consider extra practice sessions."
                : "💪 Steady performance. Target the weak skill areas highlighted in the recommendations to push your score above 75."}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
