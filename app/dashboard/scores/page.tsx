import { createClient } from "@/lib/supabase/server"
import {
  BookOpen,
  Camera,
  Trophy,
  AlertCircle,
  ChevronDown,
  Sparkles,
  History,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"

import { revalidatePath } from "next/cache"

// Activity sections matching the dashboard
const ACTIVITY_SECTIONS = [
  { key: "seatbelt", label: "Seatbelt", max: 2, section: "Readiness" },
  { key: "behavior", label: "Behavior", max: 2, section: "Readiness" },
  { key: "seat_adjust", label: "Seat Adjust", max: 2, section: "Readiness" },
  { key: "mirror_adjust", label: "Mirror Adjust", max: 2, section: "Readiness" },
  { key: "start_move", label: "Start Move", max: 2, section: "Readiness" },
  { key: "surroundings", label: "Surroundings", max: 3, section: "Control" },
  { key: "positioning", label: "Positioning", max: 4, section: "Control" },
  { key: "gear", label: "Gear", max: 4, section: "Control" },
  { key: "steering", label: "Steering", max: 4, section: "Control" },
  { key: "lane_keeping", label: "Lane Keeping", max: 4, section: "Turns" },
  { key: "turning", label: "Turning", max: 4, section: "Turns" },
  { key: "sign_awareness", label: "Sign Awareness", max: 4, section: "Turns" },
  { key: "indicator_turn", label: "Indicator Turn", max: 3, section: "Turns" },
  { key: "traffic_aware", label: "Traffic Awareness", max: 4, section: "Traffic" },
  { key: "ground_marks", label: "Ground Marks", max: 4, section: "Traffic" },
  { key: "intersections", label: "Intersections", max: 4, section: "Traffic" },
  { key: "indicator", label: "Indicator Rules", max: 3, section: "Traffic" },
  { key: "overtake_place", label: "Overtake Place", max: 3, section: "Overtaking" },
  { key: "overtake_signal", label: "Overtake Signal", max: 2, section: "Overtaking" },
  { key: "overtake_watch", label: "Overtake Watch", max: 3, section: "Overtaking" },
  { key: "overtake_return", label: "Overtake Return", max: 2, section: "Overtaking" },
  { key: "normal_stop", label: "Normal Stop", max: 2, section: "Stopping" },
  { key: "sudden_stop", label: "Sudden Stop", max: 3, section: "Stopping" },
  { key: "intersect_safety", label: "Intersect Safety", max: 3, section: "Stopping" },
  { key: "stop_compliance", label: "Stop Compliance", max: 2, section: "Stopping" },
  { key: "pedestrians", label: "Pedestrians", max: 4, section: "Elements" },
  { key: "vehicles", label: "Vehicles", max: 4, section: "Elements" },
  { key: "road_env", label: "Road Env", max: 4, section: "Elements" },
  { key: "obstacles", label: "Obstacles", max: 3, section: "Elements" },
  { key: "parking_safe_stop", label: "Parking Safe Stop", max: 2, section: "Parking" },
  { key: "parking_alignment", label: "Parking Alignment", max: 3, section: "Parking" },
  { key: "reverse_look", label: "Reverse Look", max: 2, section: "Parking" },
  { key: "reverse_watch", label: "Reverse Watch", max: 3, section: "Parking" },
]

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 75) return "text-emerald-500"
  if (pct >= 50) return "text-amber-500"
  return "text-red-500"
}

function PassBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        passed
          ? "bg-emerald-500/10 text-emerald-500"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          passed ? "bg-emerald-500" : "bg-destructive"
        }`}
      />
      {passed ? "PASSED" : "FAILED"}
    </span>
  )
}

export default async function ScoresPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [theoryRes, practicalRes] = await Promise.all([
    supabase
      .from("theory_test_scores")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("practical_test_grades")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  const theoryScores = theoryRes.data ?? []
  const practicalGrades = practicalRes.data ?? []

  // Final grades will use the same source as the dashboard:
  // practical_test_grades.total_score
  const finalGrades = practicalGrades

  // Split each dataset into "current" (latest/most recent, already first
  // because of the desc ordering) and "previous" (everything else).
  const currentTheory = theoryScores[0]
  const previousTheory = theoryScores.slice(1)

  const currentPractical = practicalGrades[0]
  const previousPractical = practicalGrades.slice(1)

  const currentFinal = finalGrades[0]
  const previousFinal = finalGrades.slice(1)

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          My Scores
        </h1>

        <p className="mt-1 text-muted-foreground">
          View all your test results and assessment scores.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* ============================ THEORY ============================ */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Theory Test Scores
          </h2>

          {/* ✅ ADD SCORE FORM */}
          <form
            action={async (formData) => {
              "use server"

              const supabase = await createClient()

              const {
                data: { user },
              } = await supabase.auth.getUser()

              if (!user) return

              const score = Number(formData.get("score"))

              if (!score || score < 0 || score > 100) return

              // جيب آخر محاولة
              const { data: lastScore } = await supabase
                .from("theory_test_scores")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle()

              // إذا كان ناجح → لا تضيف
              if (lastScore && lastScore.score >= 85) {
                return
              }

              // إذا راسب أو ما عنده نتيجة → أضف
              await supabase.from("theory_test_scores").insert([
                {
                  user_id: user.id,
                  score: score,
                },
              ])

              revalidatePath("/dashboard")
            }}
            className="mb-4 flex gap-2"
          >
            <input
              type="number"
              name="score"
              placeholder="Enter score"
              min={0}
              max={100}
              className="w-32 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none ring-primary/30 transition focus:ring-2"
            />

            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Add Score
            </button>
          </form>

          {theoryScores.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-center gap-3 py-8">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />

                <p className="text-muted-foreground">
                  No theory test scores yet. Add your score above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Current */}
              <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-md">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Current Score
                    </span>
                    <PassBadge passed={currentTheory.score >= 85} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold text-card-foreground">
                        {currentTheory.score}
                        <span className="text-lg font-medium text-muted-foreground">
                          /100
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(currentTheory.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Progress value={currentTheory.score} className="mt-3 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pass threshold: 85/100
                  </p>
                </CardContent>
              </Card>

              {/* Previous */}
              {previousTheory.length > 0 && (
                <details className="group rounded-xl border border-border bg-card shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Previous Attempts
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {previousTheory.length}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="flex flex-col gap-2 border-t border-border p-3">
                    {previousTheory.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(s.created_at), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">
                            {s.score}/100
                          </span>
                          <PassBadge passed={s.score >= 85} />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>

        {/* ============================ PRACTICAL ============================ */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Camera className="h-5 w-5 text-accent" />
            DL Practical Test Grades
          </h2>

          {practicalGrades.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-center gap-3 py-8">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />

                <p className="text-muted-foreground">
                  No practical test grades yet. Complete the practical test to
                  see your AI-assessed results.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Current */}
              <Card className="relative overflow-hidden border-accent/30 bg-gradient-to-br from-accent/5 via-card to-card shadow-md">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                      <Sparkles className="h-3.5 w-3.5" />
                      Current Result
                    </span>
                    <PassBadge passed={currentPractical.total_score >= 75} />
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Total Score
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(currentPractical.created_at), "MMM d, yyyy")}
                      </p>
                    </div>

                    <span className="text-3xl font-bold text-foreground">
                      {currentPractical.total_score}
                      <span className="text-base font-medium text-muted-foreground">
                        /100
                      </span>
                    </span>
                  </div>

                  <Progress value={currentPractical.total_score} className="h-2" />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-violet-500/10 p-3">
                      <p className="text-xs text-muted-foreground">
                        AI Assessment
                      </p>
                      <p className="text-lg font-bold text-violet-500">
                        {currentPractical.ai_total_score}/65
                      </p>
                    </div>

                    <div className="rounded-lg bg-orange-500/10 p-3">
                      <p className="text-xs text-muted-foreground">
                        Manual Assessment
                      </p>
                      <p className="text-lg font-bold text-orange-500">
                        {currentPractical.manual_total_score}/35
                      </p>
                    </div>
                  </div>

                  <details className="group rounded-lg border border-border/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <span>Detailed Breakdown</span>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="max-h-64 space-y-1 overflow-y-auto border-t border-border/60 p-3">
                      {ACTIVITY_SECTIONS.map((section) => {
                        const scoreKey = `${section.key}_score` as keyof typeof currentPractical
                        const score = (currentPractical as any)[scoreKey] ?? 0

                        return (
                          <div
                            key={section.key}
                            className="flex items-center justify-between border-b border-border/50 py-1 text-xs last:border-0"
                          >
                            <span className="text-muted-foreground">
                              {section.label}
                            </span>
                            <span
                              className={`font-medium ${getScoreColor(
                                score,
                                section.max
                              )}`}
                            >
                              {score}/{section.max}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </details>
                </CardContent>
              </Card>

              {/* Previous */}
              {previousPractical.length > 0 && (
                <details className="group rounded-xl border border-border bg-card shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Previous Results
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {previousPractical.length}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="flex flex-col gap-3 border-t border-border p-3">
                    {previousPractical.map((g) => (
                      <details
                        key={g.id}
                        className="group/item rounded-lg border border-border/60 bg-background/50"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs">
                          <span className="text-muted-foreground">
                            {format(new Date(g.created_at), "MMM d, yyyy")}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-foreground">
                              {g.total_score}/100
                            </span>
                            <PassBadge passed={g.total_score >= 75} />
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open/item:rotate-180" />
                          </div>
                        </summary>

                        <div className="border-t border-border/60 p-3">
                          <div className="mb-3 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-violet-500/10 p-2.5">
                              <p className="text-[10px] text-muted-foreground">
                                AI Assessment
                              </p>
                              <p className="text-sm font-bold text-violet-500">
                                {g.ai_total_score}/65
                              </p>
                            </div>
                            <div className="rounded-lg bg-orange-500/10 p-2.5">
                              <p className="text-[10px] text-muted-foreground">
                                Manual Assessment
                              </p>
                              <p className="text-sm font-bold text-orange-500">
                                {g.manual_total_score}/35
                              </p>
                            </div>
                          </div>

                          <div className="max-h-56 space-y-1 overflow-y-auto">
                            {ACTIVITY_SECTIONS.map((section) => {
                              const scoreKey = `${section.key}_score` as keyof typeof g
                              const score = (g as any)[scoreKey] ?? 0

                              return (
                                <div
                                  key={section.key}
                                  className="flex items-center justify-between border-b border-border/50 py-1 text-xs last:border-0"
                                >
                                  <span className="text-muted-foreground">
                                    {section.label}
                                  </span>
                                  <span
                                    className={`font-medium ${getScoreColor(
                                      score,
                                      section.max
                                    )}`}
                                  >
                                    {score}/{section.max}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>

        {/* ============================ FINAL ============================ */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Trophy className="h-5 w-5 text-chart-3" />
            Final Grades
          </h2>

          {finalGrades.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-center gap-3 py-8">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />

                <p className="text-muted-foreground">
                  No final grade available yet. Complete the practical test to
                  see your final grade.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Current */}
              <Card className="relative overflow-hidden border-chart-3/30 bg-gradient-to-br from-chart-3/5 via-card to-card shadow-md">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-chart-3/10 blur-2xl" />
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-chart-3">
                      <Trophy className="h-3.5 w-3.5" />
                      Current Final Grade
                    </span>
                    <PassBadge passed={currentFinal.total_score >= 75} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-card-foreground">
                    {currentFinal.total_score}
                    <span className="text-lg font-medium text-muted-foreground">
                      /100
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(currentFinal.created_at), "MMM d, yyyy")}
                  </p>
                  <Progress value={currentFinal.total_score} className="mt-3 h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pass threshold: 75/100
                  </p>
                </CardContent>
              </Card>

              {/* Previous */}
              {previousFinal.length > 0 && (
                <details className="group rounded-xl border border-border bg-card shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Previous Final Grades
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {previousFinal.length}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="flex flex-col gap-2 border-t border-border p-3">
                    {previousFinal.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(f.created_at), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">
                            {f.total_score}/100
                          </span>
                          <PassBadge passed={f.total_score >= 75} />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}