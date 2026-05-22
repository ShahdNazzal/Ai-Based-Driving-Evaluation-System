"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  BarChart3,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Phone,
  Camera,
  Brain,
  Cpu,
  MapPin,
  ChevronDown,
  Shield,
  Gamepad2,
  MessageSquare,
  Calendar,
  PlayCircle,
  FileText,
  Users,
  Mail,
  Instagram,
  ExternalLink,
} from "lucide-react"
import { CarFront } from "lucide-react"

/* ─────────────────────── DATA ─────────────────────── */

const features = [
  {
    icon: BookOpen,
    title: "Theory Practice",
    desc: "50+ questions tailored to Jordanian traffic law. Track every attempt in real time.",
    tag: "Exam Prep",
  },
  {
    icon: Camera,
    title: "AI Video Analysis",
    desc: "Upload your driving footage. Seven CV models analyze behavior, parking, and road driving.",
    tag: "AI · CV",
  },
  {
    icon: Gamepad2,
    title: "Driving Simulator",
    desc: "Gamified simulation with scored scenarios — practice without leaving your seat.",
    tag: "Game",
  },
  {
    icon: MessageSquare,
    title: "Exam Chatbot",
    desc: "Ask anything about the practical or theory exam. Instant, accurate, always available.",
    tag: "AI Chat",
  },
  {
    icon: Calendar,
    title: "Book Appointments",
    desc: "Schedule your theory or practical exam, or book a session with a certified instructor.",
    tag: "Booking",
  },
  {
    icon: FileText,
    title: "Result Analytics",
    desc: "Detailed breakdown of your AI-graded test — every category, every mark, explained.",
    tag: "Results",
  },
  {
    icon: Users,
    title: "Certified Instructors",
    desc: "Connect with qualified driving instructors for personalized on-road practice.",
    tag: "Instructors",
  },
  {
    icon: Shield,
    title: "Bias-Free Scoring",
    desc: "AI eliminates examiner subjectivity. Hard evidence replaces human impression.",
    tag: "Fairness",
  },
]

const stats = [
  { value: "50+", label: "Theory Questions" },
  { value: "65", label: "AI-Graded Marks" },
  { value: "7", label: "CV Models" },
  { value: "100%", label: "Objective Scoring" },
]

const techPillars = [
  { icon: Camera, label: "Computer Vision" },
  { icon: Cpu, label: "Object Detection" },
  { icon: Brain, label: "Lane Segmentation" },
  { icon: Shield, label: "Bias-Free Scoring" },
]

const steps = [
  {
    step: "01",
    icon: BookOpen,
    title: "Prepare with Theory & Simulator",
    desc: "Practice 50+ questions and test your reflexes in the driving simulator before your real exam.",
  },
  {
    step: "02",
    icon: Calendar,
    title: "Book Your Exam Slot",
    desc: "Schedule your theory or practical appointment. Optionally book an instructor for extra prep.",
  },
  {
    step: "03",
    icon: Camera,
    title: "Upload Your Driving Video",
    desc: "After your practical test, upload the footage. Seven AI models analyze behavior, parking, and road driving.",
  },
  {
    step: "04",
    icon: FileText,
    title: "Get Your Objective Report",
    desc: "Receive a bias-free, category-by-category breakdown — 100 total marks, fully traceable.",
  },
]

/* ─────────────────────── COMPONENT ─────────────────────── */

export function HeroSection() {
  const [mounted, setMounted] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    setMounted(true)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#03080F", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --blue:        #1B6EF3;
          --blue-bright: #4A90FF;
          --blue-dim:    rgba(27,110,243,0.13);
          --blue-glow:   rgba(27,110,243,0.30);
          --blue-border: rgba(27,110,243,0.25);
          --surface:     rgba(255,255,255,0.032);
          --surface-2:   rgba(255,255,255,0.062);
          --border:      rgba(255,255,255,0.065);
          --border-2:    rgba(255,255,255,0.12);
          --tx-primary:  rgba(255,255,255,0.95);
          --tx-sec:      rgba(255,255,255,0.52);
          --tx-muted:    rgba(255,255,255,0.27);
        }

        @keyframes riseUp  { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes scan    { 0%{transform:translateY(-100%)} 100%{transform:translateY(700%)} }
        @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes pulsRng { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.55);opacity:0} }
        @keyframes bdPulse { 0%,100%{border-color:rgba(27,110,243,.18)} 50%{border-color:rgba(27,110,243,.52)} }
        @keyframes sDot    { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.5)} 70%{box-shadow:0 0 0 5px rgba(74,222,128,0)} }

        .rise-1{animation:riseUp .65s cubic-bezier(.16,1,.3,1) .05s both}
        .rise-2{animation:riseUp .65s cubic-bezier(.16,1,.3,1) .15s both}
        .rise-3{animation:riseUp .65s cubic-bezier(.16,1,.3,1) .25s both}
        .rise-4{animation:riseUp .65s cubic-bezier(.16,1,.3,1) .35s both}
        .rise-5{animation:riseUp .65s cubic-bezier(.16,1,.3,1) .45s both}

        .card{
          background:var(--surface);
          border:1px solid var(--border);
          transition:border-color .3s,background .3s,transform .25s;
        }
        .card:hover{border-color:var(--border-2);background:var(--surface-2);transform:translateY(-3px)}

        .card-accent{
          background:var(--blue-dim);
          border:1px solid var(--blue-border);
          animation:bdPulse 5s ease-in-out infinite;
          transition:background .3s,border-color .3s;
        }
        .card-accent:hover{background:rgba(27,110,243,.2);border-color:rgba(27,110,243,.55)}

        .btn-p{
          background:var(--blue);color:#fff;border:1px solid var(--blue);
          font-weight:600;letter-spacing:.01em;
          transition:background .2s,transform .2s,box-shadow .2s;
        }
        .btn-p:hover{background:#1560d8;transform:translateY(-1px);box-shadow:0 10px 28px var(--blue-glow)}

        .btn-g{
          background:transparent;border:1px solid var(--border);
          color:rgba(255,255,255,.75);
          transition:border-color .2s,background .2s;
        }
        .btn-g:hover{border-color:var(--border-2);background:var(--surface-2)}

        .nav-a{color:var(--tx-sec);font-size:14px;font-weight:500;text-decoration:none;transition:color .2s}
        .nav-a:hover{color:var(--tx-primary)}

        .grid-tex{
          background-image:
            linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);
          background-size:64px 64px;
        }

        .scan-beam{
          position:absolute;left:0;right:0;height:80px;pointer-events:none;
          background:linear-gradient(transparent,rgba(27,110,243,.042),transparent);
          animation:scan 12s linear infinite;
        }

        .ticker{animation:ticker 34s linear infinite;display:flex}

        .tag{
          font-family:'JetBrains Mono',monospace;font-size:10px;
          letter-spacing:.08em;text-transform:uppercase;
          color:var(--blue-bright);background:var(--blue-dim);
          padding:3px 8px;border-radius:4px;border:1px solid rgba(27,110,243,.22);
        }

        .mono{font-family:'JetBrains Mono',monospace}
        .display{font-family:'Syne',sans-serif}

        .eyebrow{
          font-family:'JetBrains Mono',monospace;font-size:11px;
          letter-spacing:.1em;text-transform:uppercase;color:var(--blue-bright);
        }

        .scroll-hint{animation:fadeIn 1s 2.5s both}
        .status-dot{animation:sDot 2.5s infinite}
      `}</style>

      {/* ── Video Background ── */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay loop muted playsInline preload="auto" disablePictureInPicture
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.40 }}
        >
          <source src="/videos/driverskills.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(3,8,15,0.45) 0%, rgba(3,8,15,0.15) 35%, rgba(3,8,15,0.70) 80%, #03080F 100%)"
        }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to right, rgba(3,8,15,0.55) 0%, transparent 50%, rgba(3,8,15,0.55) 100%)"
        }} />
      </div>

      {/* ── Grid texture ── */}
      <div className="absolute inset-0 grid-tex" style={{ opacity: .65 }} />

      {/* ── Scanline ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="scan-beam" />
      </div>

      {/* ── Ambient glow ── */}
      <div className="absolute pointer-events-none" style={{
        top: "6%", left: "50%",
        transform: `translateX(-50%) translateY(${scrollY * 0.14}px)`,
        width: 1000, height: 520,
        background: "radial-gradient(ellipse at center, rgba(27,110,243,0.12) 0%, transparent 68%)",
        filter: "blur(30px)",
      }} />

      {/* ════════ NAV ════════ */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 lg:px-16"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: "var(--blue)", boxShadow: "0 0 18px var(--blue-glow)" }}>
            <CarFront style={{ width: 17, height: 17, color: "#fff" }} />
            <div className="absolute inset-0 rounded-lg"
              style={{ border: "1px solid var(--blue)", animation: "pulsRng 2.8s ease-out infinite" }} />
          </div>
          <div>
            <span className="display font-bold tracking-[.14em] text-white text-sm">ROXA</span>
            <div className="flex items-center gap-1" style={{ marginTop: -2 }}>
              <MapPin style={{ width: 9, height: 9, color: "var(--blue-bright)" }} />
              <span className="mono" style={{ fontSize: 9, color: "var(--tx-muted)", letterSpacing: ".06em" }}>JORDAN</span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {[ "#accidents-dashboard", "#how-it-works", "#features" ].map((href, i) => (
            <a key={href} href={href} className="nav-a">
              {[ "Accidents Dashboard","How It Works","Features"][i]}
            </a>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          <div className="hidden md:block mr-2" style={{
            width: 1, height: 36,
            background: "linear-gradient(to bottom, transparent, var(--border), transparent)"
          }} />
          <Link href="/auth/login">
            <button className="btn-g px-4 py-2 rounded-lg text-sm font-medium">Sign In</button>
          </Link>
          <Link href="/auth/sign-up">
            <button className="btn-p px-4 py-2 rounded-lg text-sm flex items-center gap-1.5">
              Get Started <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </Link>
        </div>
      </nav>

      {/* ════════ HERO ════════ */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-10 lg:pt-28 lg:px-16">
        {mounted && (
          <>
            {/* Badge */}
            <div className="rise-1 mb-7 inline-flex items-center gap-2 rounded-full px-4 py-2"
              style={{ background: "rgba(255,255,255,0.042)", border: "1px solid rgba(255,255,255,0.088)" }}>
              <CheckCircle2 style={{ width: 13, height: 13, color: "#4ade80" }} />
              <span className="mono" style={{ fontSize: 11, letterSpacing: ".05em", color: "var(--tx-sec)" }}>
                TRUSTED BY JORDANIAN DRIVERS · AI-POWERED EVALUATION
              </span>
            </div>

            {/* Headline */}
            <h1 className="rise-2 display max-w-4xl leading-[1.02] tracking-tight"
              style={{ fontSize: "clamp(40px,7vw,76px)", color: "var(--tx-primary)" }}>
              Drive With{" "}
              <span style={{ color: "var(--blue-bright)", textShadow: "0 0 48px rgba(27,110,243,0.5)" }}>
                Confidence.
              </span>
              <br />
              Pass With{" "}
              <span style={{ color: "rgba(255,255,255,0.35)" }}>Proof.</span>
            </h1>

            {/* Sub */}
            <p className="rise-3 mt-6 max-w-xl text-base leading-relaxed md:text-lg"
              style={{ color: "var(--tx-sec)" }}>
              A professional AI assessment platform for Jordan's driving license.
              Upload your test video — seven computer vision models analyze behavior,
              parking, and road driving, replacing examiner bias with hard data.
            </p>

            {/* CTAs */}
            <div className="rise-4 mt-9 flex flex-col sm:flex-row gap-3">
              <Link href="/auth/sign-up">
                <button className="btn-p px-7 py-3.5 rounded-xl text-sm flex items-center gap-2">
                  Start Free Today <ArrowRight style={{ width: 15, height: 15 }} />
                </button>
              </Link>
              <Link href="/auth/login">
                <button className="btn-g px-7 py-3.5 rounded-xl text-sm">Sign In</button>
              </Link>
            </div>

            {/* Tech pills */}
            <div className="rise-5 mt-10 flex flex-wrap gap-2">
              {techPillars.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
                  <Icon style={{ width: 12, height: 12, color: "var(--blue-bright)" }} />
                  <span className="mono" style={{ fontSize: 11, color: "rgba(255,255,255,0.58)", letterSpacing: ".04em" }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ════════ STATS ════════ */}
      {mounted && (
        <div className="rise-5 relative z-10 mx-auto max-w-7xl px-6 pb-16 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl px-5 py-4"
                style={{ background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
                <div className="display font-bold text-white" style={{ fontSize: 26 }}>{s.value}</div>
                <div className="mono mt-1" style={{ fontSize: 11, color: "var(--tx-muted)", letterSpacing: ".04em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ TICKER ════════ */}
      <div className="relative z-10 py-3.5 overflow-hidden"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(27,110,243,0.035)" }}>
        <div className="ticker whitespace-nowrap">
          {[0, 1].map((i) => (
            <span key={i} className="inline-flex">
              {["VIDEO ANALYSIS", "THEORY EXAM PREP", "DRIVING SIMULATOR", "LANE DETECTION", "CHATBOT ASSISTANT", "BOOK AN INSTRUCTOR", "OBJECT RECOGNITION", "BIAS-FREE SCORING", "APPOINTMENT BOOKING", "RESULT ANALYTICS"].map((t) => (
                <span key={t} className="inline-flex items-center gap-4 px-7 mono"
                  style={{ fontSize: 11, letterSpacing: ".12em", color: "rgba(255,255,255,0.27)" }}>
                  <span style={{ color: "var(--blue-bright)", marginRight: 14 }}>—</span>{t}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ════════ FEATURES ════════ */}
      <div id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-16">
        <div className="mb-3 flex items-center gap-4">
          <div style={{ width: 22, height: 1, background: "var(--blue-bright)" }} />
          <span className="eyebrow">Platform Features</span>
        </div>
        <h2 className="display font-bold text-white mb-12" style={{ fontSize: "clamp(26px,4vw,40px)" }}>
          Everything You Need to Pass
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
                  <f.icon style={{ width: 20, height: 20, color: "var(--blue-bright)" }} />
                </div>
                <span className="tag">{f.tag}</span>
              </div>
              <div>
                <h3 className="display font-semibold text-white text-base mb-2">{f.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--tx-sec)" }}>{f.desc}</p>
              </div>
              <div className="mt-auto pt-2 flex items-center gap-1.5"
                style={{ fontSize: 12, color: "rgba(74,144,255,0.65)" }}>
                <span>Learn more</span>
                <ArrowRight style={{ width: 11, height: 11 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ HOW IT WORKS ════════ */}
      <div id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-6 pb-28 lg:px-16">
        <div className="mb-3 flex items-center gap-4">
          <div style={{ width: 22, height: 1, background: "var(--blue-bright)" }} />
          <span className="eyebrow">How It Works</span>
        </div>
        <h2 className="display font-bold text-white mb-14" style={{ fontSize: "clamp(26px,4vw,40px)" }}>
          From Prep to Proof in 4 Steps
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          {steps.map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="card rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
                  <Icon style={{ width: 18, height: 18, color: "var(--blue-bright)" }} />
                </div>
                <span className="mono font-bold" style={{ fontSize: 11, color: "var(--blue-bright)", letterSpacing: ".1em" }}>
                  STEP {step}
                </span>
              </div>
              <div className="display font-bold absolute top-4 right-4"
                style={{ fontSize: 52, color: "rgba(255,255,255,0.03)", lineHeight: 1, userSelect: "none" }}>{step}</div>
              <h3 className="display font-semibold text-white text-base mb-2">{title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--tx-sec)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ AI ANALYSIS CALLOUT ════════ */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-28 lg:px-16">
        <div className="card-accent rounded-2xl overflow-hidden">
          <div style={{ height: 2, background: "linear-gradient(90deg, var(--blue), rgba(27,110,243,0.08))" }} />
          <div className="p-8 md:p-10 grid md:grid-cols-2 gap-10 items-center">
            {/* Left */}
            <div>
              <span className="eyebrow block mb-3">AI Video Analysis</span>
              <h3 className="display font-bold text-white mb-4" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
                Upload Once.<br />Get Scored Objectively.
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.72, color: "var(--tx-sec)", marginBottom: 20 }}>
                Upload your driving test footage after your exam. Seven specialized models run in sequence —
                face &amp; seatbelt behavior, parallel parking, and road driving — covering all 65 AI-graded marks.
                No live stream. No rush.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {["Face & Behavior · 4 marks", "Parking · 5 marks", "Road Driving · 56 marks"].map((t) => (
                  <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
                ))}
              </div>
              <Link href="/auth/sign-up">
                <button className="btn-p px-6 py-3 rounded-xl text-sm flex items-center gap-2">
                  Try AI Analysis <PlayCircle style={{ width: 15, height: 15 }} />
                </button>
              </Link>
            </div>

            {/* Right: score mockup */}
            <div className="rounded-xl p-5" style={{
              background: "rgba(3,8,15,0.55)", border: "1px solid rgba(27,110,243,0.18)"
            }}>
              <div className="mono mb-4" style={{ fontSize: 10, color: "var(--tx-muted)", letterSpacing: ".08em" }}>
                SAMPLE ANALYSIS RESULT
              </div>
              {[
                { label: "Face & Behavior", score: 4, max: 4, pct: 100 },
                { label: "Parking Alignment", score: 2, max: 3, pct: 67 },
                { label: "Lane Keeping", score: 3, max: 4, pct: 75 },
                { label: "Sign Awareness", score: 4, max: 4, pct: 100 },
                { label: "Pedestrian Handling", score: 3, max: 4, pct: 75 },
                { label: "Obstacle Response", score: 4, max: 4, pct: 100 },
              ].map(({ label, score, max, pct }) => (
                <div key={label} className="mb-3 last:mb-0">
                  <div className="flex justify-between mb-1.5">
                    <span style={{ fontSize: 12, color: "var(--tx-sec)" }}>{label}</span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--blue-bright)" }}>{score}/{max}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${pct}%`,
                      background: pct === 100 ? "#22c55e" : "var(--blue)",
                    }} />
                  </div>
                </div>
              ))}
              <div className="mt-5 pt-4 flex justify-between items-center"
                style={{ borderTop: "1px solid var(--border)" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--tx-muted)" }}>AI TOTAL</span>
                <span className="display font-bold text-white" style={{ fontSize: 22 }}>
                  58<span style={{ fontSize: 14, color: "var(--tx-muted)", fontFamily: "inherit" }}>/65</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ ACCIDENTS DASHBOARD ════════ */}
      <div id="accidents-dashboard" className="relative z-10 mx-auto max-w-7xl px-6 pb-28 lg:px-16">
        <div className="mb-3 flex items-center gap-4">
          <div style={{ width: 22, height: 1, background: "var(--blue-bright)" }} />
          <span className="eyebrow">Traffic Data · Jordan</span>
        </div>
        <h2 className="display font-bold text-white mb-4" style={{ fontSize: "clamp(26px,4vw,40px)" }}>
          Accidents Dashboard
        </h2>
        <p className="mb-10" style={{ fontSize: 14, color: "var(--tx-sec)", maxWidth: 520, lineHeight: 1.72 }}>
          Interactive analytics covering traffic incidents, hotspot zones, and accident trends across Jordan —
          built on real data to help drivers understand the roads they're practicing on.
        </p>

        <a
          href="https://public.tableau.com/views/shahed_17780220434450/Dashboard1?%3AshowVizHome=no&%3Aembed=true&%3Alanguage=en-US"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", display: "block" }}
        >
          <div className="card rounded-2xl overflow-hidden" style={{ cursor: "pointer" }}>
            <div style={{ height: 2, background: "linear-gradient(90deg, var(--blue), rgba(27,110,243,0.08))" }} />
            <div className="flex flex-col md:flex-row items-stretch">

              {/* Left: icon + info */}
              <div className="flex-1 p-8 md:p-10 flex flex-col justify-between gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl flex-shrink-0"
                      style={{ background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
                      <BarChart3 style={{ width: 26, height: 26, color: "var(--blue-bright)" }} />
                    </div>
                    <div>
                      <div className="mono mb-1" style={{ fontSize: 10, color: "var(--blue-bright)", letterSpacing: ".08em" }}>
                        TABLEAU · PUBLIC · LIVE
                      </div>
                      <h3 className="display font-bold text-white" style={{ fontSize: 20 }}>
                        Jordan Traffic Accidents
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Accident Density", "Time of Day", "Road Type", "Governorate", "Injury Severity"].map((t) => (
                      <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2" style={{ fontSize: 13, color: "rgba(74,144,255,0.7)" }}>
                  <span>Open interactive dashboard</span>
                  <ArrowRight style={{ width: 13, height: 13 }} />
                </div>
              </div>

              {/* Right: decorative bar chart */}
              <div className="flex items-end justify-center gap-2 px-10 py-10 md:border-l"
                style={{ borderColor: "rgba(255,255,255,0.06)", minWidth: 160 }}>
                {[55, 80, 45, 95, 65, 70, 40, 85].map((h, i) => (
                  <div key={i} className="rounded-sm w-4" style={{
                    height: `${h}px`,
                    background: i === 3 || i === 7 ? "var(--blue-bright)" : "rgba(27,110,243,0.35)",
                  }} />
                ))}
              </div>
            </div>
          </div>
        </a>
      </div>

      {/* ════════ FOOTER ════════ */}
      <footer className="relative z-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.055)", background: "rgba(0,0,0,0.35)" }}>

        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10">

            {/* Brand — spans 2 cols */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: "var(--blue)" }}>
                  <CarFront style={{ width: 15, height: 15, color: "#fff" }} />
                </div>
                <span className="display font-bold tracking-[.14em] text-white text-sm">ROXA</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.72, color: "var(--tx-muted)", maxWidth: 280, marginBottom: 20 }}>
                AI-powered driving license assessment for Jordanian applicants.
                Objective scoring through computer vision — eliminating bias from the exam process.
              </p>
              <div className="flex items-center gap-1.5 mono" style={{ fontSize: 12, color: "var(--tx-muted)" }}>
                <MapPin style={{ width: 12, height: 12, color: "var(--blue-bright)" }} />
                Amman, Jordan · Graduation Project 2026
              </div>
            </div>

            {/* Platform */}
            <div>
              <div className="eyebrow mb-5" style={{ fontSize: 10 }}>Platform</div>
              <ul className="space-y-3">
                {["Theory Practice", "AI Video Analysis", "Driving Simulator", "Exam Chatbot", "Result Analytics"].map((item) => (
                  <li key={item}>
                    <a href="#"
                      style={{ fontSize: 13, color: "var(--tx-sec)", textDecoration: "none", transition: "color .2s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--tx-primary)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--tx-sec)" }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <div className="eyebrow mb-5" style={{ fontSize: 10 }}>Services</div>
              <ul className="space-y-3">
                {["Book Exam Slot", "Find an Instructor", "Learning Resources", "Traffic Dashboard"].map((item) => (
                  <li key={item}>
                    <a href="#"
                      style={{ fontSize: 13, color: "var(--tx-sec)", textDecoration: "none", transition: "color .2s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--tx-primary)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--tx-sec)" }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sources */}
            <div>
              <div className="eyebrow mb-5" style={{ fontSize: 10, textDecoration: "underline", textUnderlineOffset: 4 }}>Sources</div>
              <ul className="space-y-4">
                <li>
                  <a
                    href="https://www.dvld.gov.jo/Default/Ar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 group"
                    style={{ textDecoration: "none" }}
                  >
                    <ExternalLink style={{ width: 12, height: 12, color: "var(--blue-bright)", marginTop: 2, flexShrink: 0 }} />
                    <span
                      style={{ fontSize: 13, color: "var(--tx-sec)", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(74,144,255,0.35)", transition: "color .2s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--blue-bright)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--tx-sec)" }}
                    >
                      Driver Licensing Dept. (DVLD)
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.psd.gov.jo/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 group"
                    style={{ textDecoration: "none" }}
                  >
                    <ExternalLink style={{ width: 12, height: 12, color: "var(--blue-bright)", marginTop: 2, flexShrink: 0 }} />
                    <span
                      style={{ fontSize: 13, color: "var(--tx-sec)", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(74,144,255,0.35)", transition: "color .2s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--blue-bright)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--tx-sec)" }}
                    >
                      Public Security Directorate (PSD)
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <div className="eyebrow mb-5" style={{ fontSize: 10 }}>Contact Us</div>
              <ul className="space-y-4">
                {/* Email */}
                <li>
                  <a
                    href="mailto:platformroxa@gmail.com"
                    className="flex items-center gap-2"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0"
                      style={{ background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
                      <Mail style={{ width: 12, height: 12, color: "var(--blue-bright)" }} />
                    </div>
                    <span
                      style={{ fontSize: 13, color: "var(--tx-sec)", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(74,144,255,0.35)", transition: "color .2s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--blue-bright)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--tx-sec)" }}
                    >
                      platformroxa@gmail.com
                    </span>
                  </a>
                </li>
                {/* Instagram */}
                <li>
                  <a
                    href="https://www.instagram.com/roxaplatform/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                    style={{ textDecoration: "none" }}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0"
                      style={{ background: "var(--blue-dim)", border: "1px solid var(--blue-border)" }}>
                      <Instagram style={{ width: 12, height: 12, color: "var(--blue-bright)" }} />
                    </div>
                    <span
                      style={{ fontSize: 13, color: "var(--tx-sec)", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "rgba(74,144,255,0.35)", transition: "color .2s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--blue-bright)" }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "var(--tx-sec)" }}
                    >
                      @platformroxa
                    </span>
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="mx-auto max-w-7xl px-6 py-5 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="mono" style={{ fontSize: 11, color: "var(--tx-muted)" }}>
              © 2026 ROXA · Yarmouk University
            </span>
            <div className="flex items-center gap-2">
              <div className="status-dot rounded-full" style={{ width: 7, height: 7, background: "#4ade80" }} />
              <span className="mono" style={{ fontSize: 11, color: "var(--tx-muted)" }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Scroll hint ── */}
      {mounted && (
        <div className="scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
          <span className="mono" style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--tx-muted)" }}>SCROLL</span>
          <ChevronDown style={{ width: 13, height: 13, color: "rgba(255,255,255,0.22)" }} />
        </div>
      )}
    </div>
  )
}