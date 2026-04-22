import { createClient } from "@/lib/supabase/server"
import {
  BarChart3,
  BookOpen,
  Camera,
  Trophy,
  TrendingUp,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [theoryScoresRes, practicalGradesRes, finalGradesRes] =
    await Promise.all([
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
        .from("final_grades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ])

  const theoryScore = theoryScoresRes.data?.[0]?.score ?? null
  const practicalGrade = practicalGradesRes.data?.[0] ?? null
  const finalGrade = finalGradesRes.data?.[0]?.final_grade ?? null

  const dlGrade = practicalGrade?.total_score ?? null

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl text-balance">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back! Here is your driving assessment overview.
        </p>
      </div>

      {/* Score overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Theory Score
            </CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">
              {theoryScore !== null ? `${theoryScore}/100` : "--"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {theoryScore !== null
                ? theoryScore >= 50
                  ? "Passed"
                  : "Needs improvement"
                : "Not yet taken"}
            </p>
            {theoryScore !== null && (
              <Progress value={theoryScore} className="mt-2 h-1.5" />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              DL Practical Grade
            </CardTitle>
            <Camera className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">
              {dlGrade !== null ? `${dlGrade}/100` : "--"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {dlGrade !== null ? "AI-assessed" : "Not yet evaluated"}
            </p>
            {dlGrade !== null && (
              <Progress value={dlGrade} className="mt-2 h-1.5" />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Final Grade
            </CardTitle>
            <Trophy className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">
              {finalGrade !== null ? `${finalGrade}/100` : "--"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {finalGrade !== null ? "Official result" : "Pending"}
            </p>
            {finalGrade !== null && (
              <Progress value={finalGrade} className="mt-2 h-1.5" />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-card-foreground">
              {finalGrade !== null && finalGrade >= 50
                ? "Pass"
                : theoryScore !== null
                  ? "In Progress"
                  : "New"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Overall assessment status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Practical breakdown */}
      {practicalGrade && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              Practical Test Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Parking", value: practicalGrade.parking_score },
                { label: "Speed Control", value: practicalGrade.speed_score },
                { label: "Seatbelt", value: practicalGrade.seatbelt_score },
                { label: "Lane Control", value: practicalGrade.lane_score },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-card-foreground">
                      {item.value}/25
                    </span>
                  </div>
                  <Progress value={(item.value / 25) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/training">
            <Card className="group cursor-pointer border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    Practice Theory
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Train with sample questions
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/test-dates">
            <Card className="group cursor-pointer border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <Calendar className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    View Test Dates
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Book your next test
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/scores">
            <Card className="group cursor-pointer border-border bg-card transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10 transition-colors group-hover:bg-chart-3/20">
                  <BarChart3 className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">
                    View Scores
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check all your results
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
