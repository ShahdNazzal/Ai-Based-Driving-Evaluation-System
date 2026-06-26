import { createClient } from "@/lib/supabase/server"
import { PracticalTestView } from "@/components/practical-test-view"

export default async function PracticalTestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Check theory test score
  const { data: theoryScores } = await supabase
    .from("theory_test_scores")
    .select("score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)

  const theoryScore = theoryScores?.[0]?.score ?? null

  return (
    <PracticalTestView
      userId={user.id}
      theoryScore={theoryScore}
      hasBookedTest={true}
      isWithinTestWindow={true}
    />
  )
}