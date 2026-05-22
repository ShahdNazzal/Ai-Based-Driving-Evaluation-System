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

// ─── Estimate labels per step ─────────────────────────────────────────────────
const ESTIMATES: Record<string, string> = {
  face: "~30 – 60 seconds",
  parking: "~45 – 90 seconds",
  road: "~60 – 120 seconds",
}

// ─── Map Arabic category names → English display labels ──────────────────────
// Keys match what the road model returns in cat.name (Arabic)
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

// Map Arabic name → internal key (must match EXAM_CRITERIA keys in app.py)
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

// ─── Small sub-components ─────────────────────────────────────────────────────
function ProgressBar({ elapsed, estimateSec }: { elapsed: number; estimateSec: number }) {
  const pct = Math.min(100, Math.round((elapsed / estimateSec) * 100))
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Elapsed: {fmt(elapsed)}</span>
        <span>Est. ~{fmt(estimateSec)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      {elapsed > estimateSec && (
        <p className="text-xs text-amber-600 mt-1 animate-pulse">
          Taking longer than usual — the space may be waking up…
        </p>
      )}
    </div>
  )
}

function VideoPreview({ file, label }: { file: File | null; label: string }) {
  const url = file ? URL.createObjectURL(file) : null
  if (!url) return null
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <p className="text-xs text-gray-500 px-3 py-1 bg-gray-50 border-b">{label}</p>
      <video src={url} controls className="w-full max-h-56 object-contain bg-black" />
    </div>
  )
}

function ResultVideo({ url, label }: { url: string | null; label: string }) {
  if (!url) return null
  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-blue-200 shadow-sm">
      <p className="text-xs text-blue-600 px-3 py-1 bg-blue-50 border-b font-semibold">
        🎬 {label}
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
      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg
            className="w-10 h-10 mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mb-1 text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span>
          </p>
          <p className="text-xs text-gray-400">Short video (&lt; 15 s) for faster results</p>
        </div>
        <input
          type="file"
          className="hidden"
          accept="video/*"
          capture={captureType as any}
          onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
        />
        {file && (
          <span className="mt-1 text-sm text-green-600 font-medium pb-2">✅ {file.name}</span>
        )}
        {!file && (
          <span className="mt-1 text-sm text-blue-600 font-medium pb-2">{label}</span>
        )}
      </label>
      <VideoPreview file={file} label="Uploaded video preview" />
    </div>
  )
}

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

  // Manual scores matching database columns
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

  // ── FIXED: Parse parking score from "2/3" string format ─────────────────
  function parseParkingScore(value: string | number | undefined): number {
    if (value === undefined || value === null) return 0
    if (typeof value === "number") return value
    // Handle "2/3" format
    if (typeof value === "string" && value.includes("/")) {
      return parseFloat(value.split("/")[0]) || 0
    }
    return parseFloat(String(value)) || 0
  }

  // ── FIXED: getRoadScore reads from roadResult.categories (no road_evaluation wrapper) ──
  const getRoadScore = (key: string): number => {
    // roadResult is returned directly from process_video, shape:
    // { achieved_marks, total_marks, percentage, categories: [{name (Arabic), score, max}], ... }
    const categories = roadResult?.categories
    if (!categories) return 0
    const found = categories.find((c: any) => {
      const nameKey = ROAD_NAME_TO_KEY[c.name] || ""
      return nameKey === key
    })
    return found ? parseInt(found.score) || 0 : 0
  }

  // ── Analyze handlers ──────────────────────────────────────────────────────
  const handleAnalyze = async (type: "face" | "parking" | "road") => {
    setIsAnalyzing(true)
    setAnalyzingType(type)
    setAnalysisError("")

    try {
      if (type === "face" && faceVideo) {
        const client = await connectWithWakeup("taimaa47/behavior-seatbelt")
        const result = await client.predict("/predict_combined_video", {
          video_file: faceVideo,
        })
        const data: any = result.data
        const scores = Array.isArray(data) ? data[0] : data
        setFaceResult(scores)
        if (Array.isArray(data) && data[1]) setFaceOutputVideoUrl(extractVideoUrl(data[1]))
        setStep(2)
      } else if (type === "parking" && parkingVideo) {
        const client = await connectWithWakeup("shahednazzal/parking")
        const result = await client.predict("/analyze_video", {
          video_input: parkingVideo,
        })
        const data: any = result.data
        // parking model returns [out_path, report] — report is data[1], video is data[0]
        const scores = Array.isArray(data) ? data[1] : data
        setParkingResult(scores)
        if (Array.isArray(data) && data[0]) setParkingOutputVideoUrl(extractVideoUrl(data[0]))
        setStep(3)
      } else if (type === "road" && roadVideo) {
        const client = await connectWithWakeup("shahednazzal/road_model")
        const result = await client.predict("/process_video", {
          video_path: roadVideo,
        })
        const data: any = result.data
        // road model returns [out_path, result_dict]
        const scores = Array.isArray(data) ? data[1] : data
        setRoadResult(scores)
        if (Array.isArray(data) && data[0]) setRoadOutputVideoUrl(extractVideoUrl(data[0]))
        setStep(4)
      }
    } catch (error: any) {
      setAnalysisError(error.message || "Failed to connect to AI model. Please try again.")
    } finally {
      setIsAnalyzing(false)
      setAnalyzingType(null)
    }
  }

  // ── Submit final test ────────────────────────────────────────────────────────
  const submitFinalTest = async () => {
    setIsAnalyzing(true)

    try {
      // AI Scores from Face/Behavior Model (4 marks total)
      const aiBehavior = faceResult?.behavior_score?.score_out_of_2 || 0
      const aiSeatbelt = faceResult?.seatbelt_score?.score_out_of_2 || 0

      // AI Scores from Parking Model (5 marks total) — FIXED: parse "2/3" strings
      const aiParkingAlignment = parseParkingScore(parkingResult?.alignment)
      const aiParkingStability = parseParkingScore(parkingResult?.stability)

      // AI Scores from Road Model (56 marks total)
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

      // Calculate AI Total (65 marks)
      const aiTotalScore = aiBehavior + aiSeatbelt + aiParkingAlignment + aiParkingStability +
        aiSurroundings + aiPositioning + aiLaneKeeping + aiTurning + aiSignAwareness +
        aiTrafficAware + aiGroundMarks + aiIntersections + aiNormalStop + aiSuddenStop +
        aiIntersectSafety + aiStopCompliance + aiPedestrians + aiVehicles + aiRoadEnv + aiObstacles

      // Manual Total (35 marks)
      const {
        seat_adjust, mirror_adjust, start_move, gear, steering,
        indicator_turn, indicator, overtake_place, overtake_signal,
        overtake_watch, overtake_return, reverse_look, reverse_watch,
      } = manualScores

      const manualTotalScore = seat_adjust + mirror_adjust + start_move + gear + steering +
        indicator_turn + indicator + overtake_place + overtake_signal +
        overtake_watch + overtake_return + reverse_look + reverse_watch

      // Total Score (100 marks)
      const totalScore = aiTotalScore + manualTotalScore

      const supabase = createClient()

      const insertData: Record<string, any> = {
        user_id: userId,
        // Face/Behavior Model (4 marks)
        behavior_score: aiBehavior,
        seatbelt_score: aiSeatbelt,
        // Parking Model (5 marks)
        parking_alignment_score: aiParkingAlignment,
        parking_safe_stop_score: aiParkingStability,
        // Road Model (56 marks)
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
        // Manual Scores (35 marks)
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
        // Totals
        ai_total_score:     aiTotalScore,
        manual_total_score: manualTotalScore,
        total_score:        totalScore,
        // Raw JSON data from models
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gray-50 rounded-xl border border-red-200">
        <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Not Within Test Window</h2>
        <p className="text-gray-600 max-w-md">
          The practical test is only available during your scheduled test time. Please come back during your booked time slot.
        </p>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Practical Test Evaluation</h1>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= s ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {analysisError && (
        <div className="bg-red-100 text-red-700 p-4 rounded border border-red-300 text-sm whitespace-pre-wrap break-words">
          <strong>Error:</strong> {analysisError}
          <br />
          <span className="text-xs text-red-500">
            If the Space is waking up, please wait ~30 s then try again — the app will retry automatically.
          </span>
        </div>
      )}

      {/* ── STEP 1: Face & Seatbelt ────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-xl font-semibold">1. Driver Face & Seatbelt (AI) — 4 marks</h2>
          <p className="text-gray-500 text-sm">تسجيل فيديو قصير لوجه السائق (الكاميرا الأمامية).</p>

          <VideoUploader
            onChange={setFaceVideo}
            label="Record Face Video"
            captureType="user"
            file={faceVideo}
          />

          {isAnalyzing && analyzingType === "face" && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <ProgressBar elapsed={elapsed} estimateSec={ESTIMATE_SECS.face} />
            </div>
          )}

          <button
            disabled={!faceVideo || isAnalyzing}
            onClick={() => handleAnalyze("face")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full hover:bg-blue-700 transition"
          >
            {isAnalyzing && analyzingType === "face"
              ? `Analyzing… (${fmt(elapsed)})`
              : "Analyze & Go to Step 2"}
          </button>
        </div>
      )}

      {/* ── STEP 2: Parking ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-xl font-semibold">2. Parking Test (AI) — 5 marks</h2>
          <p className="text-gray-500 text-sm">تسجيل فيديو عملية الاصطفاف (استخدم الكاميرا الخلفية).</p>

          <VideoUploader
            onChange={setParkingVideo}
            label="Record Parking Video"
            captureType="environment"
            file={parkingVideo}
          />

          <div className="bg-green-50 p-3 rounded border text-sm space-y-1">
            <p>
              ✅ Face AI Done — Behavior:{" "}
              <strong>{faceResult?.behavior_score?.score_out_of_2 ?? 0}/2</strong> · Seatbelt:{" "}
              <strong>{faceResult?.seatbelt_score?.score_out_of_2 ?? 0}/2</strong>
            </p>
            <p className="text-xs text-gray-500">Total: {(faceResult?.behavior_score?.score_out_of_2 ?? 0) + (faceResult?.seatbelt_score?.score_out_of_2 ?? 0)}/4</p>
          </div>
          <ResultVideo url={faceOutputVideoUrl} label="Face analysis output" />

          {isAnalyzing && analyzingType === "parking" && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <ProgressBar elapsed={elapsed} estimateSec={ESTIMATE_SECS.parking} />
            </div>
          )}

          <button
            disabled={!parkingVideo || isAnalyzing}
            onClick={() => handleAnalyze("parking")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full hover:bg-blue-700 transition"
          >
            {isAnalyzing && analyzingType === "parking"
              ? `Analyzing… (${fmt(elapsed)})`
              : "Analyze & Go to Step 3"}
          </button>
        </div>
      )}

      {/* ── STEP 3: Road ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-xl font-semibold">3. Road Driving (AI) — 56 marks</h2>
          <p className="text-gray-500 text-sm">تسجيل فيديو القيادة على الطريق.</p>

          <VideoUploader
            onChange={setRoadVideo}
            label="Record Road Video"
            captureType="environment"
            file={roadVideo}
          />

          <div className="bg-green-50 p-3 rounded border text-sm space-y-1">
            <p>
              ✅ Face AI:{" "}
              {(faceResult?.behavior_score?.score_out_of_2 ?? 0) +
                (faceResult?.seatbelt_score?.score_out_of_2 ?? 0)}
              /4
            </p>
            <p>
              ✅ Parking AI — Alignment: {parkingResult?.alignment ?? "–"} · Stability:{" "}
              {parkingResult?.stability ?? "–"}
            </p>
          </div>
          <ResultVideo url={parkingOutputVideoUrl} label="Parking analysis output" />

          {isAnalyzing && analyzingType === "road" && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <ProgressBar elapsed={elapsed} estimateSec={ESTIMATE_SECS.road} />
            </div>
          )}

          <button
            disabled={!roadVideo || isAnalyzing}
            onClick={() => handleAnalyze("road")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full hover:bg-blue-700 transition"
          >
            {isAnalyzing && analyzingType === "road"
              ? `Analyzing… (${fmt(elapsed)})`
              : "Analyze & Go to Final Review"}
          </button>
        </div>
      )}

      {/* ── STEP 4: Final Review ───────────────────────────────────────────── */}
      {step === 4 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-6">
          <h2 className="text-xl font-bold">4. Final Review & Manual Grading</h2>

          <ResultVideo url={roadOutputVideoUrl} label="Road analysis output" />

          <div className="grid md:grid-cols-2 gap-6">
            {/* AI scores */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-green-700 border-b pb-2">AI Grades (65/100)</h3>
              <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                <p className="font-semibold text-blue-600">Face & Behavior (4 marks):</p>
                <p className="pl-4">Behavior: {faceResult?.behavior_score?.score_out_of_2 ?? 0}/2</p>
                <p className="pl-4">Seatbelt: {faceResult?.seatbelt_score?.score_out_of_2 ?? 0}/2</p>

                <p className="font-semibold text-blue-600 mt-3">Parking (5 marks):</p>
                {/* FIXED: show raw string values from parking model directly */}
                <p className="pl-4">Alignment: {parkingResult?.alignment ?? "0/3"}</p>
                <p className="pl-4">Stability: {parkingResult?.stability ?? "0/2"}</p>

                {/* FIXED: roadResult.categories (no road_evaluation wrapper) */}
                {roadResult?.categories && (
                  <div className="mt-4 border-t pt-2">
                    <p className="font-bold text-blue-600">
                      Road Model: {roadResult.achieved_marks ?? 0}/{roadResult.total_marks ?? 56}
                    </p>
                    {roadResult.categories.map((cat: any, idx: number) => (
                      <p key={idx} className="pl-4 text-gray-600 text-xs">
                        {/* Display English label, fallback to original name */}
                        {ROAD_CATEGORY_LABELS[cat.name] ?? cat.name}: {cat.score}/{cat.max}
                      </p>
                    ))}
                  </div>
                )}
                {!roadResult?.categories && (
                  <p className="text-red-500 mt-2">Road API result missing.</p>
                )}
              </div>
            </div>

            {/* Manual scores */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-orange-700 border-b pb-2">
                Manual Marks (35/100)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                  <label
                    key={key}
                    className={key === "reverse_watch" ? "col-span-2" : ""}
                  >
                    {label} ({max})
                    <input
                      type="number"
                      min={0}
                      max={max}
                      className="w-full border p-1 rounded mt-1"
                      value={manualScores[key]}
                      onChange={(e) =>
                        setManualScores({ ...manualScores, [key]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Manual Total: {Object.values(manualScores).reduce((a, b) => a + b, 0)}/35
              </p>
            </div>
          </div>

          <button
            disabled={isAnalyzing}
            onClick={submitFinalTest}
            className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg w-full hover:bg-green-700 transition disabled:opacity-50"
          >
            {isAnalyzing ? "Saving to Dashboard…" : "Submit Final Test (100/100)"}
          </button>
        </div>
      )}
    </div>
  )
}