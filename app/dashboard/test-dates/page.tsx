import { createClient } from "@/lib/supabase/server"
import { TestDatesView } from "@/components/test-dates-view"

export default async function TestDatesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [theoryDatesRes, practicalDatesRes, selectionsRes] = await Promise.all([
    supabase.from("theory_test_dates").select("*").order("test_date", { ascending: true }),
    supabase.from("practical_test_dates").select("*").order("test_date", { ascending: true }),
    supabase.from("user_test_selections").select("*").eq("user_id", user.id),
  ])

  return (
    <TestDatesView
      theoryDates={theoryDatesRes.data ?? []}
      practicalDates={practicalDatesRes.data ?? []}
      selections={selectionsRes.data ?? []}
      userId={user.id}
    />
  )
}
