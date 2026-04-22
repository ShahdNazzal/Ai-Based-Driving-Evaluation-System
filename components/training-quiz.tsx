"use client"

import { useState, useCallback } from "react"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface Question {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
}

export function TrainingQuiz({ questions }: { questions: Question[] }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState<Record<number, boolean>>({})
  const [finished, setFinished] = useState(false)

  const current = questions[currentIdx]
  const total = questions.length

  const handleSelect = useCallback(
    (answer: string) => {
      if (showResult[currentIdx]) return
      setSelected((prev) => ({ ...prev, [currentIdx]: answer }))
    },
    [currentIdx, showResult]
  )

  const handleCheck = useCallback(() => {
    setShowResult((prev) => ({ ...prev, [currentIdx]: true }))
  }, [currentIdx])

  const handleNext = useCallback(() => {
    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      setFinished(true)
    }
  }, [currentIdx, total])

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1)
  }, [currentIdx])

  const handleRestart = useCallback(() => {
    setCurrentIdx(0)
    setSelected({})
    setShowResult({})
    setFinished(false)
  }, [])

  const correctCount = Object.entries(showResult).filter(
    ([idx, shown]) =>
      shown && selected[Number(idx)] === questions[Number(idx)]?.correct_answer
  ).length

  if (!questions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg text-muted-foreground">
          No training questions available yet.
        </p>
      </div>
    )
  }

  if (finished) {
    const pct = Math.round((correctCount / total) * 100)
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <Card className="border-border bg-card text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-card-foreground">
              Training Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="text-5xl font-bold text-card-foreground">
              {correctCount}/{total}
            </div>
            <Progress value={pct} className="mx-auto h-3 w-64" />
            <p className="text-muted-foreground">
              You scored {pct}% on this practice session.
            </p>
            <Button
              onClick={handleRestart}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const options = [
    { key: "A", value: current.option_a },
    { key: "B", value: current.option_b },
    { key: "C", value: current.option_c },
    { key: "D", value: current.option_d },
  ]

  const checked = showResult[currentIdx]
  const isCorrect = selected[currentIdx] === current.correct_answer

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          Theory Training
        </h1>
        <p className="mt-1 text-muted-foreground">
          Practice with sample driving questions. This is for training only.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Question {currentIdx + 1} of {total}
        </span>
        <Progress
          value={((currentIdx + 1) / total) * 100}
          className="h-2 flex-1"
        />
        <span className="text-sm font-mono text-primary">
          {correctCount} correct
        </span>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed text-card-foreground">
            {current.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {options.map((opt) => {
            const isSelected = selected[currentIdx] === opt.key
            const isCorrectAnswer = current.correct_answer === opt.key
            let className =
              "flex items-center gap-3 rounded-lg border p-4 text-left transition-all cursor-pointer"

            if (checked) {
              if (isCorrectAnswer) {
                className +=
                  " border-accent bg-accent/5 text-card-foreground"
              } else if (isSelected && !isCorrectAnswer) {
                className +=
                  " border-destructive bg-destructive/5 text-card-foreground"
              } else {
                className += " border-border text-muted-foreground opacity-60"
              }
            } else if (isSelected) {
              className += " border-primary bg-primary/5 text-card-foreground"
            } else {
              className +=
                " border-border text-card-foreground hover:border-primary/30 hover:bg-secondary/50"
            }

            return (
              <button
                key={opt.key}
                onClick={() => handleSelect(opt.key)}
                className={className}
                disabled={checked}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-bold text-secondary-foreground">
                  {opt.key}
                </span>
                <span className="flex-1 text-sm">{opt.value}</span>
                {checked && isCorrectAnswer && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                )}
                {checked && isSelected && !isCorrectAnswer && (
                  <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                )}
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="gap-1 bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="flex gap-2">
          {!checked && selected[currentIdx] && (
            <Button
              onClick={handleCheck}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Check Answer
            </Button>
          )}
          {checked && (
            <Button
              onClick={handleNext}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
            >
              {currentIdx < total - 1 ? "Next" : "Finish"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
