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

export default async function ScoresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [theoryRes, practicalRes, finalRes] = await Promise.all([
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
    supabase
      .from("final_grades")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ])

  const theoryScores = theoryRes.data ?? []
  const practicalGrades = practicalRes.data ?? []
  const finalGrades = finalRes.data ?? []

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
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <BookOpen className="h-5 w-5 text-primary" />
            Theory Test Scores
          </h2>
          {theoryScores.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="flex items-center gap-3 py-8 justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No theory test scores yet. Your score will appear here after the admin enters it.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {theoryScores.map((s) => (
                <Card key={s.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {format(new Date(s.created_at), "MMM d, yyyy")}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          s.score >= 50 ? "text-accent" : "text-destructive"
                        }`}
                      >
                        {s.score >= 50 ? "PASSED" : "FAILED"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      {s.score}/100
                    </div>
                    <Progress
                      value={s.score}
                      className="mt-2 h-1.5"
                    />
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
              <CardContent className="flex items-center gap-3 py-8 justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No practical test grades yet. Complete the practical test to see your AI-assessed results.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {practicalGrades.map((g) => (
                <Card key={g.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      {format(new Date(g.created_at), "MMM d, yyyy")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="text-3xl font-bold text-card-foreground">
                      {g.total_score}/100
                    </div>
                    {[
                      { label: "Parking", value: g.parking_score },
                      { label: "Speed", value: g.speed_score },
                      { label: "Seatbelt", value: g.seatbelt_score },
                      { label: "Lane Control", value: g.lane_score },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-card-foreground">{item.value}/25</span>
                      </div>
                    ))}
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
              <CardContent className="flex items-center gap-3 py-8 justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No final grade assigned yet. This will be entered by the admin.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {finalGrades.map((f) => (
                <Card key={f.id} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      {format(new Date(f.created_at), "MMM d, yyyy")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">
                      {f.final_grade}/100
                    </div>
                    {f.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {f.notes}
                      </p>
                    )}
                    <Progress
                      value={f.final_grade}
                      className="mt-2 h-1.5"
                    />
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
