
// ============================================================
// app/analysis/page.tsx  –  Driving Analysis Dashboard
// Server component wrapper → client chart component
// ============================================================

// ─────────────────────────────────────────────────────────────
// SERVER COMPONENT  (default export)
// ─────────────────────────────────────────────────────────────
import { createClient } from "@/lib/supabase/server"
import { AnalysisDashboard } from "@/components/analysis-dashboard"

export default async function AnalysisPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("practical_test_grades")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  return <AnalysisDashboard attempts={data ?? []} />
}