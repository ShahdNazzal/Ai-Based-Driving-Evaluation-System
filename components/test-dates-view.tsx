"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  test_type: string
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

  const handleSelect = async (testType: string, testDateId: string) => {
    setLoading(testDateId)
    const supabase = createClient()

    const { error } = await supabase.from("user_test_selections").insert({
      user_id: userId,
      test_type: testType,
      test_date_id: testDateId,
    })

    if (error) {
      toast.error("Failed to book test date. Please try again.")
      setLoading(null)
      return
    }

    toast.success("Test date booked successfully!")
    setLoading(null)
    startTransition(() => {
      router.refresh()
    })
  }

  const renderDateCards = (
    dates: TestDate[],
    testType: string,
    selectedId: string | undefined
  ) => {
    if (!dates.length) {
      return (
        <div className="flex flex-col items-center py-12">
          <Calendar className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            No test dates available at the moment.
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dates.map((d) => {
          const isSelected = selectedId === d.id
          return (
            <Card
              key={d.id}
              className={`border-border bg-card transition-all ${
                isSelected ? "border-primary ring-1 ring-primary/20" : ""
              }`}
            >
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(d.test_date), "EEEE, MMMM d, yyyy")}
                  </div>
                  {isSelected && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Selected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {d.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(d.start_time), "h:mm a")} -{" "}
                  {format(new Date(d.end_time), "h:mm a")}
                </div>
                {!selectedId && (
                  <Button
                    size="sm"
                    className="mt-1 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => handleSelect(testType, d.id)}
                    disabled={loading === d.id || isPending}
                  >
                    {loading === d.id ? "Booking..." : "Select This Date"}
                  </Button>
                )}
                {isSelected && (
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-accent">
                    <CheckCircle2 className="h-4 w-4" />
                    You are booked for this date
                  </div>
                )}
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
          Select a date for your theory or practical driving test.
        </p>
      </div>

      <Tabs defaultValue="theory">
        <TabsList className="mb-4">
          <TabsTrigger value="theory">Theory Test</TabsTrigger>
          <TabsTrigger value="practical">Practical Test</TabsTrigger>
        </TabsList>
        <TabsContent value="theory">
          {renderDateCards(
            theoryDates,
            "theory",
            selectedTheory?.test_date_id
          )}
        </TabsContent>
        <TabsContent value="practical">
          {renderDateCards(
            practicalDates,
            "practical",
            selectedPractical?.test_date_id
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
