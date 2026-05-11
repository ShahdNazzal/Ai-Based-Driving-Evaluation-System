import { createClient } from "@/lib/supabase/server"
import {
  BarChart3,
  BookOpen,
  Camera,
  Trophy,
  TrendingUp,
  Calendar,
  ShieldCheck,
  Car,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

// ─── Score helpers ────────────────────────────────────────────
function getStatusColor(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 75) return "text-chart-3"
  if (pct >= 50) return "text-accent"
  return "text-destructive"
}

function getProgressColor(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 75) return "bg-chart-3"
  if (pct >= 50) return "bg-accent"
  return "bg-destructive"
}

function getStatusBadge(score: number, passing: number, max: number) {
  if (score === null) return null
  const pct = (score / max) * 100
  if (pct >= (passing / max) * 100)
    return <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 text-[10px]">PASSED</Badge>
  return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">FAILED</Badge>
}

// ─── Activity sections data ───────────────────────────────────
const ACTIVITY_SECTIONS = [
  { label: "Readiness & Start",       max: 10 },
  { label: "Control & Handling",      max: 15 },
  { label: "Turns & Curves",          max: 15 },
  { label: "Traffic Rules",           max: 15 },
  { label: "Overtaking",              max: 10 },
  { label: "Stopping & Safety Dist.", max: 10 },
  { label: "Traffic Elements",        max: 15 },
  { label: "Parking & Reversing",     max: 10 },
]

function computeSections(g: any) {
  if (!g) return []
  return [
    g.seatbelt_score + g.behavior_score + g.seat_adjust_score + g.mirror_adjust_score + g.start_move_score,
    g.surroundings_score + g.positioning_score + g.gear_score + g.steering_score,
    g.lane_keeping_score + g.turning_score + g.sign_awareness_score + g.indicator_turn_score,
    g.traffic_aware_score + g.ground_marks_score + g.intersections_score + g.indicator_score,
    g.overtake_place_score + g.overtake_signal_score + g.overtake_watch_score + g.overtake_return_score,
    g.normal_stop_score + g.sudden_stop_score + g.intersect_safety_score + g.stop_compliance_score,
    g.pedestrians_score + g.vehicles_score + g.road_env_score + g.obstacles_score,
    g.parking_safe_stop_score + g.parking_alignment_score + g.reverse_look_score + g.reverse_watch_score,
  ]
}

// ─── Page ─────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [theoryScoresRes, practicalGradesRes, finalGradesRes] = await Promise.all([
    supabase
      .from("theory_test_scores")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("practical_test_grades")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("practical_test_grades")
      .select("total_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ])

  const theoryScore   = theoryScoresRes.data?.[0]?.score ?? null
  const practicalGrade = practicalGradesRes.data?.[0] ?? null
  const finalGrade    = finalGradesRes.data?.[0]?.total_score ?? null

  const practicalTotal = practicalGrade?.total_score ?? null
  const aiScore        = practicalGrade?.ai_total_score ?? null
  const manualScore    = practicalGrade?.manual_total_score ?? null
  const sectionScores  = computeSections(practicalGrade)

  // Overall status
  const overallStatus =
    finalGrade !== null && finalGrade >= 75
      ? { label: "PASSED", color: "text-chart-3", bg: "bg-chart-3/10 border-chart-3/20" }
      : theoryScore !== null || practicalTotal !== null
        ? { label: "IN PROGRESS", color: "text-accent", bg: "bg-accent/10 border-accent/20" }
        : { label: "NEW", color: "text-primary", bg: "bg-primary/10 border-primary/20" }

  return (
    <div className="animate-fade-in">
      <div className="relative mx-auto max-w-7xl space-y-8 p-6 pb-16 lg:p-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Jordan Traffic Dept. · Driving Exam System
            </p>
            <h1 className="text-3xl font-black tracking-tight text-foreground lg:text-4xl">
              Assessment Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Overview of your driving licence examination progress.
            </p>
          </div>
          <div className={`rounded-lg border px-4 py-2 text-center ${overallStatus.bg}`}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Status</p>
            <p className={`mt-0.5 text-xl font-black ${overallStatus.color}`}>{overallStatus.label}</p>
          </div>
        </div>

        {/* ── Score cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Theory */}
          <Card className="group relative overflow-hidden border-border bg-card transition-all hover:border-primary/40">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/5" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Theory Exam
              </CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-black ${theoryScore !== null ? getStatusColor(theoryScore, 100) : "text-muted-foreground/50"}`}>
                {theoryScore !== null ? theoryScore : "—"}
                {theoryScore !== null && <span className="text-lg text-muted-foreground">/100</span>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {theoryScore !== null
                  ? getStatusBadge(theoryScore, 85, 100)
                  : <span className="text-xs text-muted-foreground">Not yet taken</span>}
              </div>
              {theoryScore !== null && (
                <Progress value={theoryScore} className="mt-3 h-1.5" />
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground">Pass threshold: 85/100</p>
            </CardContent>
          </Card>

          {/* Practical AI */}
          <Card className="group relative overflow-hidden border-border bg-card transition-all hover:border-accent/40">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-accent/5" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Practical · AI
              </CardTitle>
              <Camera className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-black ${aiScore !== null ? getStatusColor(aiScore, 65) : "text-muted-foreground/50"}`}>
                {aiScore !== null ? aiScore : "—"}
                {aiScore !== null && <span className="text-lg text-muted-foreground">/65</span>}
              </div>
              <div className="mt-2">
                {aiScore !== null
                  ? <span className="text-xs text-accent">AI-assessed (65%)</span>
                  : <span className="text-xs text-muted-foreground">Pending evaluation</span>}
              </div>
              {aiScore !== null && (
                <Progress value={(aiScore / 65) * 100} className="mt-3 h-1.5" />
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground">65 marks auto-graded</p>
            </CardContent>
          </Card>

          {/* Practical Manual */}
          <Card className="group relative overflow-hidden border-border bg-card transition-all hover:border-chart-4/40">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-chart-4/5" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Practical · Manual
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-black ${manualScore !== null && manualScore > 0 ? getStatusColor(manualScore, 35) : "text-muted-foreground/50"}`}>
                {manualScore !== null && manualScore > 0 ? manualScore : "—"}
                {manualScore !== null && manualScore > 0 && <span className="text-lg text-muted-foreground">/35</span>}
              </div>
              <div className="mt-2">
                <span className="text-xs text-muted-foreground">Examiner-graded (35%)</span>
              </div>
              {manualScore !== null && manualScore > 0 && (
                <Progress value={(manualScore / 35) * 100} className="mt-3 h-1.5" />
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground">35 marks by examiner</p>
            </CardContent>
          </Card>

          {/* Final */}
          <Card className="group relative overflow-hidden border-border bg-card transition-all hover:border-chart-3/40">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-chart-3/5" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Final Grade
              </CardTitle>
              <Trophy className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-black ${finalGrade !== null ? getStatusColor(finalGrade, 100) : "text-muted-foreground/50"}`}>
                {finalGrade !== null ? finalGrade : "—"}
                {finalGrade !== null && <span className="text-lg text-muted-foreground">/100</span>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {finalGrade !== null
                  ? getStatusBadge(finalGrade, 75, 100)
                  : <span className="text-xs text-muted-foreground">Pending</span>}
              </div>
              {finalGrade !== null && (
                <Progress value={finalGrade} className="mt-3 h-1.5" />
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground">Pass threshold: 75/100</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Practical breakdown ── */}
        {practicalGrade && (
          <Card className="border-border bg-card">
            <CardHeader className="border-border pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  Practical Test · Activity Breakdown
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-xs text-muted-foreground">AI ({aiScore}/65)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-chart-4" />
                    <span className="text-xs text-muted-foreground">Manual ({manualScore}/35)</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {ACTIVITY_SECTIONS.map((section, i) => {
                  const score = sectionScores[i] ?? 0
                  const pct = (score / section.max) * 100
                  return (
                    <div key={section.label} className="group rounded-lg border border-border bg-card/80 p-4 transition-all hover:border-border">
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Activity {i + 1}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-foreground leading-tight">
                            {section.label}
                          </p>
                        </div>
                        <span className={`text-xl font-black ${getStatusColor(score, section.max)}`}>
                          {score}
                          <span className="text-xs font-normal text-muted-foreground">/{section.max}</span>
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="mt-1.5 text-right font-mono text-[10px] text-muted-foreground">
                        {pct.toFixed(0)}%
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* AI vs Manual summary bar */}
              <div className="mt-6 rounded-lg border border-border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Score Composition · Total {practicalTotal ?? 0}/100
                </p>
                <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-accent transition-all"
                    style={{ width: `${((aiScore ?? 0) / 100) * 100}%` }}
                  />
                  <div
                    className="bg-chart-4 transition-all"
                    style={{ width: `${((manualScore ?? 0) / 100) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>AI: {aiScore ?? 0}/65</span>
                  <span>Manual: {manualScore ?? 0}/35</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Quick actions ── */}
        <div>
          <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/training">
              <div className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-card">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Practice Theory</p>
                  <p className="text-xs text-muted-foreground">60 questions · 60 minutes</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-muted-foreground" />
              </div>
            </Link>
            <Link href="/dashboard/test-dates">
              <div className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-accent/40 hover:bg-card">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">View Test Dates</p>
                  <p className="text-xs text-muted-foreground">Book your practical exam</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-muted-foreground" />
              </div>
            </Link>
            <Link href="/dashboard/scores">
              <div className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-chart-3/40 hover:bg-card">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-chart-3/10 transition-colors group-hover:bg-chart-3/20">
                  <BarChart3 className="h-5 w-5 text-chart-3" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Full Score Report</p>
                  <p className="text-xs text-muted-foreground">All results & breakdowns</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-muted-foreground" />
              </div>
            </Link>
          </div>
        </div>

        {/* ── Exam info strip ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BookOpen,  label: "Theory Exam",    detail: "100 marks · Pass: 85%  · 60 questions · 60 min", color: "text-primary" },
            { icon: Camera,    label: "Practical Exam", detail: "100 marks · Pass: 75%  · 8 activity sections",   color: "text-accent" },
            { icon: ShieldCheck, label: "AI vs Manual",  detail: "65% AI auto-graded  · 35% examiner evaluated",  color: "text-chart-4" },
          ].map(({ icon: Icon, label, detail, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-4 py-3">
              <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              <div>
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}