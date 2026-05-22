"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

interface TestDate {
  id: string
  test_date: string
  location: string
  start_time: string
  end_time: string
}

interface Selection {
  id: string
  user_id: string
  test_type: "theory" | "practical"
  test_date_id: string
}

export function TestDatesView({
  theoryDates,
  practicalDates,
  selections,
  userId,
}: {
  theoryDates: TestDate[]
  practicalDates: TestDate[]
  selections: Selection[]
  userId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState<string | null>(null)

  const selectedTheory = selections.find((s) => s.test_type === "theory")
  const selectedPractical = selections.find((s) => s.test_type === "practical")

  const upcomingTheoryDates = useMemo(() => {
    const now = new Date()

    return theoryDates
      .filter((date) => new Date(date.end_time) > now)
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
  }, [theoryDates])

  const upcomingPracticalDates = useMemo(() => {
    const now = new Date()

    return practicalDates
      .filter((date) => new Date(date.end_time) > now)
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
  }, [practicalDates])

  const handleSelect = async (
    testType: "theory" | "practical",
    testDateId: string
  ) => {
    setLoading(testDateId)

    const supabase = createClient()

    const { error } = await supabase.from("user_test_selections").insert({
      user_id: userId,
      test_type: testType,
      test_date_id: testDateId,
    })

    if (error) {
      console.error(error)
      toast.error("Failed to book test date.")
      setLoading(null)
      return
    }

    toast.success("Test date booked successfully.")



toast.info(
  "Please go to the traffic department to complete the payment procedures."
)


    setLoading(null)

    startTransition(() => {
      router.refresh()



    })
  }

  const handleCancelBooking = async (selectionId: string) => {
    setLoading(selectionId)

    const supabase = createClient()

    const { error } = await supabase
      .from("user_test_selections")
      .delete()
      .eq("id", selectionId)
      .eq("user_id", userId)

    if (error) {
      console.error(error)
      toast.error("Failed to cancel booking.")
      setLoading(null)
      return
    }

    toast.success("Booking cancelled successfully.")
    setLoading(null)

    startTransition(() => {
      router.refresh()
    })
  }

  const renderDateCards = (
    dates: TestDate[],
    testType: "theory" | "practical",
    selectedSelection?: Selection
  ) => {
    const selectedId = selectedSelection?.test_date_id

    if (!dates.length) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
          <Calendar className="h-10 w-10 text-muted-foreground" />

          <p className="mt-3 text-sm text-muted-foreground">
            No upcoming test dates available at the moment.
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dates.map((date) => {
          const isSelected = selectedId === date.id
          const hasSelectedDate = Boolean(selectedId)

          return (
            <Card
              key={date.id}
              className={`border-border bg-card transition-all ${
                isSelected ? "border-primary ring-1 ring-primary/30" : ""
              }`}
            >
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(date.test_date), "EEEE, MMMM d, yyyy")}
                  </div>

                  {isSelected && (
                    <Badge className="border-primary/20 bg-primary/10 text-primary">
                      Selected
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {date.location}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(date.start_time), "h:mm a")} -{" "}
                  {format(new Date(date.end_time), "h:mm a")}
                </div>

                {isSelected && selectedSelection ? (
                  <div className="mt-1 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      You are booked for this date
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelBooking(selectedSelection.id)}
                      disabled={loading === selectedSelection.id || isPending}
                    >
                      {loading === selectedSelection.id
                        ? "Cancelling..."
                        : "Cancel Booking"}
                    </Button>
                  </div>
                ) : !hasSelectedDate ? (
                  <Button
                    size="sm"
                    className="mt-1"
                    onClick={() => handleSelect(testType, date.id)}
                    disabled={loading === date.id || isPending}
                  >
                    {loading === date.id ? "Booking..." : "Select This Date"}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          Available Test Dates
        </h1>

        <p className="mt-1 text-muted-foreground">
          Select your theory or practical driving test date.
        </p>
      </div>

      <Tabs defaultValue="theory">
        <TabsList className="mb-4">
          <TabsTrigger value="theory">Theory Test</TabsTrigger>
          <TabsTrigger value="practical">Practical Test</TabsTrigger>
        </TabsList>

        <TabsContent value="theory">
          {renderDateCards(upcomingTheoryDates, "theory", selectedTheory)}
        </TabsContent>

        <TabsContent value="practical">
          {renderDateCards(
            upcomingPracticalDates,
            "practical",
            selectedPractical
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}