"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Car,
  Shield,
  BarChart3,
  BookOpen,
  ArrowRight,
  Gamepad2,
  CheckCircle2,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: BookOpen,
    title: "Theory Training",
    desc: "Practice with 50+ questions to prepare for your exam.",
  },
  {
    icon: BarChart3,
    title: "Score Tracking",
    desc: "View your theory and practical test results in real time.",
  },
  {
    icon: Shield,
    title: "AI Assessment",
    desc: "Deep learning model analyzes your driving performance.",
  },
  {
    icon: Phone,
    title: "booking a driving instructor",
    desc: "Book a driving instructor for personalized lessons and practice.",
  },
]

export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-foreground">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-20 right-1/3 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-background">
            درّبني
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button
              variant="ghost"
              className="text-background/80 hover:text-background hover:bg-background/10"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pt-16 pb-24 text-center lg:pt-24">
        <div
          className={`mb-6 inline-flex items-center gap-2 rounded-full border border-background/10 bg-background/5 px-4 py-2 text-sm text-background/70 backdrop-blur-sm ${
            mounted ? "animate-slide-up" : "opacity-0"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 text-accent" />
          Trusted by Jordanian drivers
        </div>

        <h1
          className={`max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-background md:text-6xl lg:text-7xl ${
            mounted ? "animate-slide-up animation-delay-100" : "opacity-0"
          }`}
        >
          Master Your Driving Skills with{" "}
          <span className="text-primary">Confidence</span>
        </h1>

        <p
          className={`mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-background/60 md:text-xl ${
            mounted ? "animate-slide-up animation-delay-200" : "opacity-0"
          }`}
        >
          A professional driver assessment platform designed for Jordanian
          drivers. Prepare for your theory test, get AI-powered practical
          evaluations, and track your progress.
        </p>

        <div
          className={`mt-10 flex flex-col gap-4 sm:flex-row ${
            mounted ? "animate-slide-up animation-delay-300" : "opacity-0"
          }`}
        >
          <Link href="/auth/sign-up">
            <Button
              size="lg"
              className="animate-pulse-glow bg-primary px-8 text-primary-foreground hover:bg-primary/90"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              size="lg"
              variant="outline"
              className="border-background/20 bg-transparent text-background hover:bg-background/10"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group rounded-xl border border-background/10 bg-background/5 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-background/10 ${
                mounted
                  ? `animate-slide-up animation-delay-${(i + 1) * 100}`
                  : "opacity-0"
              }`}
              style={{ animationDelay: `${(i + 3) * 100}ms` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-background">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-background/50">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
