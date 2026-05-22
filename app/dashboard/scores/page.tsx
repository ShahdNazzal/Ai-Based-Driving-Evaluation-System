import { createClient } from "@/lib/supabase/server"
import {
  BookOpen,
  Camera,
  Trophy,
  AlertCircle,
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

      <div className="flex flex-col gap-6">
        {/* Theory test scores */}

        {/*
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Theory Test Scores
          </h2>

          {theoryScores.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex items-center justify-center gap-3 py-8">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />

                <p className="text-muted-foreground">
                  No theory test scores yet. Your score will appear here after
                  the admin enters it.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {theoryScores.map((s) => (
                <Card key={s.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{format(new Date(s.created_at), "MMM d, yyyy")}</span>

                      <span
                        className={`text-xs font-semibold ${
                          s.score >= 85
                            ? "text-emerald-500"
                            : "text-destructive"
                        }`}
                      >
                        {s.score >= 85 ? "PASSED" : "FAILED"}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      {s.score}/100
                    </div>

                    <Progress value={s.score} className="mt-2 h-1.5" />

                    <p className="mt-1 text-xs text-muted-foreground">
                      Pass threshold: 85/100
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
*/}
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
      className="w-32 rounded-md border px-3 py-2 text-sm"
    />

    <button
      type="submit"
      className="rounded-md bg-primary px-4 py-2 text-sm text-white"
    >
      Add
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {theoryScores.map((s) => (
        <Card key={s.id} className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{format(new Date(s.created_at), "MMM d, yyyy")}</span>

              <span
                className={`text-xs font-semibold ${
                  s.score >= 85
                    ? "text-emerald-500"
                    : "text-destructive"
                }`}
              >
                {s.score >= 85 ? "PASSED" : "FAILED"}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">
              {s.score}/100
            </div>

            <Progress value={s.score} className="mt-2 h-1.5" />

            <p className="mt-1 text-xs text-muted-foreground">
              Pass threshold: 85/100
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</section>






        {/* Practical test grades */}
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
            <div className="grid gap-4 sm:grid-cols-2">
              {practicalGrades.map((g) => (
                <Card key={g.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{format(new Date(g.created_at), "MMM d, yyyy")}</span>

                      <span
                        className={`text-xs font-semibold ${
                          g.total_score >= 75
                            ? "text-emerald-500"
                            : "text-destructive"
                        }`}
                      >
                        {g.total_score >= 75 ? "PASSED" : "FAILED"}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-4">
                    {/* Total Score */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-foreground">
                        Total Score
                      </span>

                      <span className="text-2xl font-bold text-foreground">
                        {g.total_score}/100
                      </span>
                    </div>

                    <Progress value={g.total_score} className="h-2" />

                    {/* AI vs Manual breakdown */}
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-violet-500/10 p-3">
                        <p className="text-xs text-muted-foreground">
                          AI Assessment
                        </p>

                        <p className="text-lg font-bold text-violet-500">
                          {g.ai_total_score}/65
                        </p>
                      </div>

                      <div className="rounded-lg bg-orange-500/10 p-3">
                        <p className="text-xs text-muted-foreground">
                          Manual Assessment
                        </p>

                        <p className="text-lg font-bold text-orange-500">
                          {g.manual_total_score}/35
                        </p>
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="mt-2">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Detailed Breakdown
                      </p>

                      <div className="max-h-64 space-y-1 overflow-y-auto">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Final grades */}
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {finalGrades.map((f) => (
                <Card key={f.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{format(new Date(f.created_at), "MMM d, yyyy")}</span>

                      <span
                        className={`text-xs font-semibold ${
                          f.total_score >= 75
                            ? "text-emerald-500"
                            : "text-destructive"
                        }`}
                      >
                        {f.total_score >= 75 ? "PASSED" : "FAILED"}
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      {f.total_score}/100
                    </div>

                    <Progress value={f.total_score} className="mt-2 h-1.5" />

                    <p className="mt-1 text-xs text-muted-foreground">
                      Pass threshold: 75/100
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}