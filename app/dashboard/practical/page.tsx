

import { createClient } from "@/lib/supabase/server"
import { PracticalTestView } from "@/components/practical-test-view"



export default async function PracticalTestPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()





//هون صار تغيير


 if (!user) return null


//if (!user?.id) {
//  return <div>Unauthorized</div>
//}




//هون صار تغيير  




  // Check theory test score
  const { data: theoryScores }= await supabase
    .from("theory_test_scores")
    .select("score")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)

  const theoryScore = theoryScores?.[0]?.score ?? null

  // Check if user has a practical test date selected and if we're within the time window
  const { data: selections } = await supabase
    .from("user_test_selections")
    .select("test_date_id")
    .eq("user_id", user.id)
    .eq("test_type", "practical")
    .limit(1)

  let isWithinTestWindow = false
  if (selections && selections.length > 0) {
    const { data: testDate } = await supabase
      .from("practical_test_dates")
      .select("*")
      .eq("id", selections[0].test_date_id)
      .single()

    if (testDate) {
      const now = new Date()
      const start = new Date(testDate.start_time)
      const end = new Date(testDate.end_time)
      isWithinTestWindow = now >= start && now <= end
    }
  }

  return (
    <PracticalTestView
      userId={user.id}
      theoryScore={theoryScore}
      hasBookedTest={!!selections?.length}
      isWithinTestWindow={isWithinTestWindow}
    />
  )
}











