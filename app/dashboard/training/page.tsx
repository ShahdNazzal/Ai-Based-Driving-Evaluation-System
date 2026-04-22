import { createClient } from "@/lib/supabase/server"
import { TrainingQuiz } from "@/components/training-quiz"

export default async function TrainingPage() {
  const supabase = await createClient()
  const { data: questions } = await supabase
    .from("training_questions")
    .select("*")
    .order("created_at", { ascending: true })

  return <TrainingQuiz questions={questions ?? []} />
}
