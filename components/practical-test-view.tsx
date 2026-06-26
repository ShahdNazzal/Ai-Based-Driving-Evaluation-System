"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Client } from "@gradio/client"

interface PracticalTestViewProps {
  userId: string
  theoryScore: number | null
  hasBookedTest: boolean
  isWithinTestWindow: boolean
}

// ─── Polling helper: wake up a sleeping HF Space, then call predict ───────────
async function connectWithWakeup(spaceName: string, maxWaitMs = 120_000) {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    try {
      const client = await Client.connect(spaceName, { events: ["data", "status"] })
      return client
    } catch (err: any) {
      const msg = String(err?.message || "")
      if (msg.includes("503") || msg.includes("loading") || msg.includes("building")) {
        await new Promise((r) => setTimeout(r, 5_000))
        continue
      }
      throw err
    }
  }
  throw new Error("Space did not wake up within 2 minutes. Please try again.")
}

// ─── Timer hook ───────────────────────────────────────────────────────────────
function useElapsedTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) { setElapsed(0); return }
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  return elapsed
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

// ─── Map Arabic category names → English display labels ──────────────────────
const ROAD_CATEGORY_LABELS: Record<string, string> = {
  "الظروف المحيطة":          "Surroundings",
  "التموضع":                  "Positioning",
  "الحفاظ على المسرب":        "Lane Keeping",
  "الدوران":                  "Turning",
  "إشارات الطريق":            "Sign Awareness",
  "حركة المرور":              "Traffic Awareness",
  "العلامات الأرضية":         "Ground Marks",
  "المقاطعات":                "Intersections",
  "الوقوف الطبيعي":           "Normal Stop",
  "الوقوف المفاجئ":           "Sudden Stop",
  "مسافة أمان التقاطع":       "Intersect Safety",
  "الالتزام بإشارات الوقوف":  "Stop Compliance",
  "التعامل مع المشاة":        "Pedestrians",
  "التعامل مع المركبات":      "Vehicles",
  "بيئة الطريق والسرعة":      "Road Env",
  "التعامل مع العوائق":       "Obstacles",
}

const ROAD_NAME_TO_KEY: Record<string, string> = {
  "الظروف المحيطة":          "surroundings",
  "التموضع":                  "positioning",
  "الحفاظ على المسرب":        "lane_keeping",
  "الدوران":                  "turning",
  "إشارات الطريق":            "sign_awareness",
  "حركة المرور":              "traffic_aware",
  "العلامات الأرضية":         "ground_marks",
  "المقاطعات":                "intersections",
  "الوقوف الطبيعي":           "normal_stop",
  "الوقوف المفاجئ":           "sudden_stop",
  "مسافة أمان التقاطع":       "intersect_safety",
  "الالتزام بإشارات الوقوف":  "stop_compliance",
  "التعامل مع المشاة":        "pedestrians",
  "التعامل مع المركبات":      "vehicles",
  "بيئة الطريق والسرعة":      "road_env",
  "التعامل مع العوائق":       "obstacles",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Face & Seatbelt" },
    { num: 2, label: "Parking" },
    { num: 3, label: "Road Drive" },
    { num: 4, label: "Review" },
  ]
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                currentStep > s.num
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : currentStep === s.num
                  ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-200"
                  : "bg-gray-100 text-gray-400 border border-gray-200"
              }`}
            >
              {currentStep > s.num ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.num
              )}
            </div>
            <span
              className={`text-xs font-medium hidden sm:block whitespace-nowrap ${
                currentStep >= s.num ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${
                currentStep > s.num ? "bg-blue-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ elapsed, estimateSec }: { elapsed: number; estimateSec: number }) {
  const pct = Math.min(100, Math.round((elapsed / estimateSec) * 100))
  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-blue-600">Elapsed: {fmt(elapsed)}</span>
        <span className="text-gray-400">Est. ~{fmt(estimateSec)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {elapsed > estimateSec && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Taking longer than usual — the space may be waking up…
        </p>
      )}
    </div>
  )
}

function VideoPreview({ file, label }: { file: File | null; label: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    } else {
      setUrl(null)
    }
  }, [file])

  if (!url) return null
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <p className="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-b font-medium">{label}</p>
      <video src={url} controls className="w-full max-h-56 object-contain bg-black" />
    </div>
  )
}

function ResultVideo({ url, label }: { url: string | null; label: string }) {
  if (!url) return null
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-blue-200 shadow-sm">
      <p className="text-xs text-blue-600 px-3 py-2 bg-blue-50 border-b font-semibold flex items-center gap-1.5">
        <span>🎬</span> {label}
      </p>
      <video src={url} controls autoPlay muted className="w-full max-h-64 object-contain bg-black" />
    </div>
  )
}

function VideoUploader({
  onChange,
  label,
  captureType = "user",
  file,
}: {
  onChange: (f: File) => void
  label: string
  captureType?: string
  file: File | null
}) {
  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          file
            ? "border-blue-400 bg-blue-50 hover:bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
          {file ? (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-blue-600 font-semibold">✅ {file.name}</p>
              <p className="text-xs text-blue-400">Click to replace</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">Short video (&lt; 15 s) for faster results</p>
              </div>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept="video/*"
          capture={captureType as any}
          onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
        />
      </label>
      <VideoPreview file={file} label="Uploaded video preview" />
    </div>
  )
}

function ScoreBadge({ score, max, label }: { score: number | string; max: number; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-800">
        {score}<span className="text-gray-400 font-normal">/{max}</span>
      </span>
    </div>
  )
}

function SectionDone({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-green-700">Completed</span>
      </div>
      {children}
    </div>
  )
}

// ─── Video Section Component (Cloudinary iframe) ─────────────────────────────


function VideoSection() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        marginTop: "0px",
        padding: "30px 40px 80px 40px",
        background: "#0b1b3a",
        borderRadius: "30px",
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "40px",
          flexWrap: "wrap",
        }}
      >
        {/* TEXT SIDE */}
        <div style={{ flex: "1", minWidth: "280px" }}>
          <h2 style={{ fontSize: "40px", marginBottom: "20px" }}>
            How Video Analysis Works
          </h2>

          <p
            style={{
              fontSize: "18px",
              color: "#cbd5f5",
              marginBottom: "25px",
            }}
          >
            The system analyzes video in real time using artificial intelligence,
            detecting objects and showing results instantly.
          </p>

          <button
            onClick={() => setOpen(true)}
            style={{
              padding: "12px 22px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            AI Powered Analysis
          </button>
        </div>

        {/* VIDEO PREVIEW */}
        <div
          style={{
            flex: "1",
            minWidth: "300px",
            position: "relative",
            aspectRatio: "16 / 9",
            borderRadius: "25px",
            overflow: "hidden",
            boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
          }}
        >
          <iframe
            src="https://player.cloudinary.com/embed/?cloud_name=dmx6r8aop&public_id=tmpy7h2nows_1_lcgkiq"
            width="100%"
            height="100%"
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            style={{ border: "none", position: "absolute", top: 0, left: 0 }}
            title="Video Analysis Demo"
          />
        </div>
      </div>

      {/* FULLSCREEN MODAL */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "90%",
              height: "80%",
              position: "relative",
              borderRadius: "20px",
              overflow: "hidden",
              background: "#000",
            }}
          >
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                zIndex: 10,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <iframe
              src="https://player.cloudinary.com/embed/?cloud_name=dmx6r8aop&public_id=tmpy7h2nows_1_lcgkiq"
              width="100%"
              height="100%"
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              style={{ border: "none" }}
              title="Video Fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoSection;

// ─── Main component ───────────────────────────────────────────────────────────
export function PracticalTestView({
  userId,
  theoryScore,
  hasBookedTest,
  isWithinTestWindow,
}: PracticalTestViewProps) {
  const router = useRouter()

  const [step, setStep] = useState(1)

  const [faceVideo, setFaceVideo] = useState<File | null>(null)
  const [parkingVideo, setParkingVideo] = useState<File | null>(null)
  const [roadVideo, setRoadVideo] = useState<File | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzingType, setAnalyzingType] = useState<"face" | "parking" | "road" | null>(null)
  const [analysisError, setAnalysisError] = useState("")

  const [faceResult, setFaceResult] = useState<any>(null)
  const [parkingResult, setParkingResult] = useState<any>(null)
  const [roadResult, setRoadResult] = useState<any>(null)

  const [faceOutputVideoUrl, setFaceOutputVideoUrl] = useState<string | null>(null)
  const [parkingOutputVideoUrl, setParkingOutputVideoUrl] = useState<string | null>(null)
  const [roadOutputVideoUrl, setRoadOutputVideoUrl] = useState<string | null>(null)

  const elapsed = useElapsedTimer(isAnalyzing)

  const ESTIMATE_SECS: Record<string, number> = { face: 45, parking: 60, road: 90 }

  const [manualScores, setManualScores] = useState({
    seat_adjust: 0,
    mirror_adjust: 0,
    start_move: 0,
    gear: 0,
    steering: 0,
    indicator_turn: 0,
    indicator: 0,
    overtake_place: 0,
    overtake_signal: 0,
    overtake_watch: 0,
    overtake_return: 0,
    reverse_look: 0,
    reverse_watch: 0,
  })

  function extractVideoUrl(value: any): string | null {
    if (!value) return null
    if (typeof value === "string" && (value.startsWith("http") || value.startsWith("/"))) return value
    if (typeof value === "object") {
      return value.url || value.path || null
    }
    return null
  }

  function parseParkingScore(value: string | number | undefined): number {
    if (value === undefined || value === null) return 0
    if (typeof value === "number") return value
    if (typeof value === "string" && value.includes("/")) {
      return parseFloat(value.split("/")[0]) || 0
    }
    return parseFloat(String(value)) || 0
  }

  const getRoadScore = (key: string): number => {
    const categories = roadResult?.categories
    if (!categories) return 0
    const found = categories.find((c: any) => {
      const nameKey = ROAD_NAME_TO_KEY[c.name] || ""
      return nameKey === key
    })
    return found ? parseInt(found.score) || 0 : 0
  }

  const handleAnalyze = async (type: "face" | "parking" | "road") => {
  setIsAnalyzing(true)
  setAnalyzingType(type)
  setAnalysisError("")

  try {
    const formData = new FormData()

    if (type === "face" && faceVideo) {
      formData.append("video", faceVideo)
      const res = await fetch("/api/analyze/face", { method: "POST", body: formData })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setFaceResult(Array.isArray(json.data) ? json.data[0] : json.data)
      if (Array.isArray(json.data) && json.data[1]) setFaceOutputVideoUrl(extractVideoUrl(json.data[1]))
      setStep(2)

    } else if (type === "parking" && parkingVideo) {
      formData.append("video", parkingVideo)
      const res = await fetch("/api/analyze/parking", { method: "POST", body: formData })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setParkingResult(Array.isArray(json.data) ? json.data[1] : json.data)
      if (Array.isArray(json.data) && json.data[0]) setParkingOutputVideoUrl(extractVideoUrl(json.data[0]))
      setStep(3)

    } else if (type === "road" && roadVideo) {
      formData.append("video", roadVideo)
      const res = await fetch("/api/analyze/road", { method: "POST", body: formData })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setRoadResult(Array.isArray(json.data) ? json.data[1] : json.data)
      if (Array.isArray(json.data) && json.data[0]) setRoadOutputVideoUrl(extractVideoUrl(json.data[0]))
      setStep(4)
    }

  } catch (error: any) {
    setAnalysisError(error.message || "Failed to analyze. Please try again.")
  } finally {
    setIsAnalyzing(false)
    setAnalyzingType(null)
  }
}

  const submitFinalTest = async () => {
    setIsAnalyzing(true)

    try {
      const aiBehavior = faceResult?.behavior_score?.score_out_of_2 || 0
      const aiSeatbelt = faceResult?.seatbelt_score?.score_out_of_2 || 0
      const aiParkingAlignment = parseParkingScore(parkingResult?.alignment)
      const aiParkingStability = parseParkingScore(parkingResult?.stability)
      const aiSurroundings    = getRoadScore("surroundings")
      const aiPositioning     = getRoadScore("positioning")
      const aiLaneKeeping     = getRoadScore("lane_keeping")
      const aiTurning         = getRoadScore("turning")
      const aiSignAwareness   = getRoadScore("sign_awareness")
      const aiTrafficAware    = getRoadScore("traffic_aware")
      const aiGroundMarks     = getRoadScore("ground_marks")
      const aiIntersections   = getRoadScore("intersections")
      const aiNormalStop      = getRoadScore("normal_stop")
      const aiSuddenStop      = getRoadScore("sudden_stop")
      const aiIntersectSafety = getRoadScore("intersect_safety")
      const aiStopCompliance  = getRoadScore("stop_compliance")
      const aiPedestrians     = getRoadScore("pedestrians")
      const aiVehicles        = getRoadScore("vehicles")
      const aiRoadEnv         = getRoadScore("road_env")
      const aiObstacles       = getRoadScore("obstacles")

      const aiTotalScore = aiBehavior + aiSeatbelt + aiParkingAlignment + aiParkingStability +
        aiSurroundings + aiPositioning + aiLaneKeeping + aiTurning + aiSignAwareness +
        aiTrafficAware + aiGroundMarks + aiIntersections + aiNormalStop + aiSuddenStop +
        aiIntersectSafety + aiStopCompliance + aiPedestrians + aiVehicles + aiRoadEnv + aiObstacles

      const {
        seat_adjust, mirror_adjust, start_move, gear, steering,
        indicator_turn, indicator, overtake_place, overtake_signal,
        overtake_watch, overtake_return, reverse_look, reverse_watch,
      } = manualScores

      const manualTotalScore = seat_adjust + mirror_adjust + start_move + gear + steering +
        indicator_turn + indicator + overtake_place + overtake_signal +
        overtake_watch + overtake_return + reverse_look + reverse_watch

      const totalScore = aiTotalScore + manualTotalScore

      const supabase = createClient()

      const insertData: Record<string, any> = {
        user_id: userId,
        behavior_score: aiBehavior,
        seatbelt_score: aiSeatbelt,
        parking_alignment_score: aiParkingAlignment,
        parking_safe_stop_score: aiParkingStability,
        surroundings_score:    aiSurroundings,
        positioning_score:     aiPositioning,
        lane_keeping_score:    aiLaneKeeping,
        turning_score:         aiTurning,
        sign_awareness_score:  aiSignAwareness,
        traffic_aware_score:   aiTrafficAware,
        ground_marks_score:    aiGroundMarks,
        intersections_score:   aiIntersections,
        normal_stop_score:     aiNormalStop,
        sudden_stop_score:     aiSuddenStop,
        intersect_safety_score: aiIntersectSafety,
        stop_compliance_score: aiStopCompliance,
        pedestrians_score:     aiPedestrians,
        vehicles_score:        aiVehicles,
        road_env_score:        aiRoadEnv,
        obstacles_score:       aiObstacles,
        seat_adjust_score:     seat_adjust,
        mirror_adjust_score:   mirror_adjust,
        start_move_score:      start_move,
        gear_score:            gear,
        steering_score:        steering,
        indicator_turn_score:  indicator_turn,
        indicator_score:       indicator,
        overtake_place_score:  overtake_place,
        overtake_signal_score: overtake_signal,
        overtake_watch_score:  overtake_watch,
        overtake_return_score: overtake_return,
        reverse_look_score:    reverse_look,
        reverse_watch_score:   reverse_watch,
        ai_total_score:     aiTotalScore,
        manual_total_score: manualTotalScore,
        total_score:        totalScore,
        face_model_raw:    faceResult,
        parking_model_raw: parkingResult,
        road_model_raw:    roadResult,
        created_at:        new Date().toISOString(),
      }

      const { error } = await supabase.from("practical_test_grades").insert(insertData)

      if (error) {
        console.error("Database error:", error)
        throw new Error(error.message)
      }

      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error saving grades:", error)
      alert(`حصل خطأ أثناء حفظ العلامات النهائية: ${error.message}`)
      setIsAnalyzing(false)
    }
  }

  // ─── Guard: not within test window ────────────────────────────────────────
  if (!isWithinTestWindow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-10 max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Not Within Test Window</h2>
          <p className="text-gray-500 leading-relaxed">
            The practical test is only available during your scheduled test time. Please come back during your booked time slot.
          </p>
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practical Test Evaluation</h1>
          <p className="text-sm text-gray-500 mt-1">Complete all steps to submit your driving assessment</p>
        </div>
        <StepIndicator currentStep={step} />
      </div>

      {/* Error banner */}
      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-700">Analysis Failed</p>
            <p className="text-sm text-red-600 break-words">{analysisError}</p>
            <p className="text-xs text-red-400">If the Space is waking up, please wait ~30s then try again.</p>
          </div>
        </div>
      )}

      {/* ── STEP 1: Face & Seatbelt ────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">1</div>
              <div>
                <h2 className="text-white font-semibold">Driver Face & Seatbelt</h2>
                <p className="text-blue-200 text-xs mt-0.5">AI Analysis · 4 marks</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-500 leading-relaxed">
Record a short video of the driver's face using the front camera.
            </p>

            <VideoUploader
              onChange={setFaceVideo}
              label="Record Face Video"
              captureType="user"
              file={faceVideo}
            />

            {isAnalyzing && analyzingType === "face" && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-700">Analyzing video…</span>
                </div>
                <ProgressBar elapsed={elapsed} estimateSec={ESTIMATE_SECS.face} />
              </div>
            )}

            <button
              disabled={!faceVideo || isAnalyzing}
              onClick={() => handleAnalyze("face")}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isAnalyzing && analyzingType === "face" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing… ({fmt(elapsed)})
                </>
              ) : (
                <>
                  Analyze & Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Parking ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">2</div>
              <div>
                <h2 className="text-white font-semibold">Parking Test</h2>
                <p className="text-blue-200 text-xs mt-0.5">AI Analysis · 5 marks</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-500 leading-relaxed">
Recording the parking process using the rear camera
            </p>

            <SectionDone>
              <div className="space-y-1.5">
                <ScoreBadge
                  score={faceResult?.behavior_score?.score_out_of_2 ?? 0}
                  max={2}
                  label="Behavior"
                />
                <ScoreBadge
                  score={faceResult?.seatbelt_score?.score_out_of_2 ?? 0}
                  max={2}
                  label="Seatbelt"
                />
              </div>
            </SectionDone>

            <ResultVideo url={faceOutputVideoUrl} label="Face analysis output" />

            <VideoUploader
              onChange={setParkingVideo}
              label="Record Parking Video"
              captureType="environment"
              file={parkingVideo}
            />

            {isAnalyzing && analyzingType === "parking" && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-700">Analyzing parking video…</span>
                </div>
                <ProgressBar elapsed={elapsed} estimateSec={ESTIMATE_SECS.parking} />
              </div>
            )}

            <button
              disabled={!parkingVideo || isAnalyzing}
              onClick={() => handleAnalyze("parking")}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isAnalyzing && analyzingType === "parking" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing… ({fmt(elapsed)})
                </>
              ) : (
                <>
                  Analyze & Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Road ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">3</div>
              <div>
                <h2 className="text-white font-semibold">Road Driving</h2>
                <p className="text-blue-200 text-xs mt-0.5">AI Analysis · 56 marks</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-sm text-gray-500 leading-relaxed">Record a video of driving on the road</p>

            <SectionDone>
              <div className="space-y-1.5">
                <ScoreBadge
                  score={(faceResult?.behavior_score?.score_out_of_2 ?? 0) + (faceResult?.seatbelt_score?.score_out_of_2 ?? 0)}
                  max={4}
                  label="Face & Seatbelt"
                />
                <ScoreBadge score={parkingResult?.alignment ?? "–"} max={3} label="Parking Alignment" />
                <ScoreBadge score={parkingResult?.stability ?? "–"} max={2} label="Parking Stability" />
              </div>
            </SectionDone>

            <ResultVideo url={parkingOutputVideoUrl} label="Parking analysis output" />

            <VideoUploader
              onChange={setRoadVideo}
              label="Record Road Driving Video"
              captureType="environment"
              file={roadVideo}
            />

            {isAnalyzing && analyzingType === "road" && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-700">Analyzing road video…</span>
                </div>
                <ProgressBar elapsed={elapsed} estimateSec={ESTIMATE_SECS.road} />
              </div>
            )}

            <button
              disabled={!roadVideo || isAnalyzing}
              onClick={() => handleAnalyze("road")}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isAnalyzing && analyzingType === "road" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing… ({fmt(elapsed)})
                </>
              ) : (
                <>
                  Analyze & Go to Final Review
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Final Review ───────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">4</div>
                <div>
                  <h2 className="text-white font-semibold">Final Review & Manual Grading</h2>
                  <p className="text-blue-200 text-xs mt-0.5">Review AI scores and enter manual marks</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <ResultVideo url={roadOutputVideoUrl} label="Road analysis output" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* AI Scores */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="font-semibold text-gray-800">AI Grades</h3>
                <span className="ml-auto text-sm font-bold text-blue-600">65 marks</span>
              </div>
              <div className="p-5 space-y-4">
                {/* Face */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Face & Behavior · 4 marks</p>
                  <div className="space-y-1.5">
                    <ScoreBadge score={faceResult?.behavior_score?.score_out_of_2 ?? 0} max={2} label="Behavior" />
                    <ScoreBadge score={faceResult?.seatbelt_score?.score_out_of_2 ?? 0} max={2} label="Seatbelt" />
                  </div>
                </div>
                {/* Parking */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Parking · 5 marks</p>
                  <div className="space-y-1.5">
                    <ScoreBadge score={parkingResult?.alignment ?? "0/3"} max={3} label="Alignment" />
                    <ScoreBadge score={parkingResult?.stability ?? "0/2"} max={2} label="Stability" />
                  </div>
                </div>
                {/* Road */}
                {roadResult?.categories ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Road Model · {roadResult.achieved_marks ?? 0}/{roadResult.total_marks ?? 56} marks
                    </p>
                    <div className="space-y-1">
                      {roadResult.categories.map((cat: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-3 rounded-lg bg-gray-50 text-xs">
                          <span className="text-gray-600">{ROAD_CATEGORY_LABELS[cat.name] ?? cat.name}</span>
                          <span className="font-semibold text-gray-700">{cat.score}/{cat.max}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">Road API result missing.</p>
                )}
              </div>
            </div>

            {/* Manual Scores */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <h3 className="font-semibold text-gray-800">Manual Marks</h3>
                <span className="ml-auto text-sm font-bold text-orange-600">35 marks</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["seat_adjust",     "Seat Adjust",       2],
                      ["mirror_adjust",   "Mirror Adjust",     2],
                      ["start_move",      "Start Move",        2],
                      ["gear",            "Gear Shift",        4],
                      ["steering",        "Steering",          4],
                      ["indicator_turn",  "Signal/Turns",      3],
                      ["indicator",       "Signal/Rules",      3],
                      ["overtake_place",  "Overtake Spot",     3],
                      ["overtake_signal", "Overtake Signal",   2],
                      ["overtake_watch",  "Overtake Monitor",  3],
                      ["overtake_return", "Overtake Return",   2],
                      ["reverse_look",    "Look Back",         2],
                      ["reverse_watch",   "Reverse Monitor",   3],
                    ] as [keyof typeof manualScores, string, number][]
                  ).map(([key, label, max]) => (
                    <div
                      key={key}
                      className={`${key === "reverse_watch" ? "col-span-2" : ""} space-y-1`}
                    >
                      <label className="text-xs font-medium text-gray-600">
                        {label} <span className="text-gray-400">(/{max})</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={max}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        value={manualScores[key]}
                        onChange={(e) =>
                          setManualScores({ ...manualScores, [key]: Number(e.target.value) })
                        }
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-medium">Manual Total</span>
                  <span className="text-sm font-bold text-orange-600">
                    {Object.values(manualScores).reduce((a, b) => a + b, 0)}/35
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            disabled={isAnalyzing}
            onClick={submitFinalTest}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-sm shadow-green-200"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving to Dashboard…
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Submit Final Test (100/100)
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Video Section: How analysis works ──────────────────────────────── */}
      <VideoSection />

    </div>
  )
}