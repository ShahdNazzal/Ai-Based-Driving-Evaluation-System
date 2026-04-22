"use client"


{/*


import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Camera,
  AlertTriangle,
  Play,
  Square,
  Shield,
  Gauge,
  ParkingSquare,
  ArrowUpDown,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export function PracticalTestView({
  userId,
  theoryScore,
  hasBookedTest,
  isWithinTestWindow,
}: {
  userId: string
  theoryScore: number | null
  hasBookedTest: boolean
  isWithinTestWindow: boolean
}) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [scores, setScores] = useState({
    parking: 0,
    speed: 0,
    seatbelt: 0,
    lane: 0,
  })
  const [elapsed, setElapsed] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Check if user passed theory test
  const passedTheory = theoryScore !== null && theoryScore >= 50

  // Simulate DL score updates while recording
  useEffect(() => {
    if (!isRecording) return
    const interval = setInterval(() => {
      setElapsed((e) => e + 1)
      setScores((prev) => ({
        parking: Math.min(25, prev.parking + Math.floor(Math.random() * 3)),
        speed: Math.min(25, prev.speed + Math.floor(Math.random() * 3)),
        seatbelt: Math.min(25, prev.seatbelt + Math.floor(Math.random() * 4)),
        lane: Math.min(25, prev.lane + Math.floor(Math.random() * 3)),
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [isRecording])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsRecording(true)
      setElapsed(0)
      setScores({ parking: 0, speed: 0, seatbelt: 0, lane: 0 })
      toast.success("Camera started. AI analysis is running.")
    } catch {
      toast.error(
        "Could not access camera. Please grant camera permissions."
      )
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsRecording(false)

    // Submit scores to Supabase
    setSubmitting(true)
    const supabase = createClient()
    const totalScore = scores.parking + scores.speed + scores.seatbelt + scores.lane
    const { error } = await supabase.from("practical_test_grades").insert({
      user_id: userId,
      parking_score: scores.parking,
      speed_score: scores.speed,
      seatbelt_score: scores.seatbelt,
      lane_score: scores.lane,
      total_score: totalScore,
    })

    setSubmitting(false)
    if (error) {
      toast.error("Failed to save scores. Please try again.")
    } else {
      toast.success("Practical test scores saved successfully!")
      setSubmitted(true)
      router.refresh()
    }
  }, [scores, userId, router])

  // Not passed theory
  if (!passedTheory) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
            Practical Test
          </h1>
        </div>
        <Card className="mx-auto max-w-lg border-destructive/30 bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-card-foreground">
              Theory Test Required
            </h2>
            <p className="max-w-sm text-center text-muted-foreground leading-relaxed">
              You must pass the theory test first to access the practical test.
              {theoryScore !== null
                ? ` Your current score is ${theoryScore}/100 (minimum 50 required).`
                : " Your theory score has not been entered yet."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not within test window
  if (!hasBookedTest || !isWithinTestWindow) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
            Practical Test
          </h1>
        </div>
        <Card className="mx-auto max-w-lg border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-card-foreground">
              {!hasBookedTest
                ? "No Test Date Booked"
                : "Not Within Test Window"}
            </h2>
            <p className="max-w-sm text-center text-muted-foreground leading-relaxed">
              {!hasBookedTest
                ? "Please book a practical test date first from the Test Dates page."
                : "The practical test is only available during your scheduled test time. Please come back during your booked time slot."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalScore =
    scores.parking + scores.speed + scores.seatbelt + scores.lane

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
          Practical Test
        </h1>
        <p className="mt-1 text-muted-foreground">
          Start the camera and the AI model will assess your driving in real
          time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
       
        <div className="lg:col-span-2">
          <Card className="border-border bg-card overflow-hidden">
            <div className="relative aspect-video bg-foreground/5">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {!isRecording && !submitted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click Start to begin the practical test
                  </p>
                </div>
              )}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-destructive/90 px-3 py-1 text-xs font-medium text-destructive-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-destructive-foreground" />
                  RECORDING - {elapsed}s
                </div>
              )}
            </div>
            <CardContent className="flex items-center justify-between p-4">
              {!submitted ? (
                <>
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start Test
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      className="gap-2 border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      {submitting ? "Saving..." : "Stop & Submit"}
                    </Button>
                  )}
                  <span className="text-sm font-mono text-muted-foreground">
                    Total: {totalScore}/100
                  </span>
                </>
              ) : (
                <div className="flex w-full items-center justify-center gap-2 text-accent">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    Test completed and scores saved!
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

       
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Live AI Scores
          </h2>
          {[
            {
              label: "Parking",
              value: scores.parking,
              icon: ParkingSquare,
              color: "text-primary",
            },
            {
              label: "Speed Control",
              value: scores.speed,
              icon: Gauge,
              color: "text-accent",
            },
            {
              label: "Seatbelt",
              value: scores.seatbelt,
              icon: Shield,
              color: "text-chart-3",
            },
            {
              label: "Lane Control",
              value: scores.lane,
              icon: ArrowUpDown,
              color: "text-chart-4",
            },
          ].map((item) => (
            <Card key={item.label} className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <item.icon className={`h-5 w-5 shrink-0 ${item.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold text-card-foreground">
                      {item.value}/25
                    </span>
                  </div>
                  <Progress
                    value={(item.value / 25) * 100}
                    className="mt-1.5 h-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Score</p>
              <p className="text-3xl font-bold text-foreground">
                {totalScore}/100
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}



*/}






















import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Client } from "@gradio/client" // المكتبة الرسمية من Hugging Face

interface PracticalTestViewProps {
  userId: string
  theoryScore: number | null
  hasBookedTest: boolean
  isWithinTestWindow: boolean
}

export function PracticalTestView({
  userId,
  theoryScore,
  hasBookedTest,
  isWithinTestWindow,
}: PracticalTestViewProps) {
  const router = useRouter()

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

  const [step, setStep] = useState(1)
  const [faceVideo, setFaceVideo] = useState<File | null>(null)
  const [parkingVideo, setParkingVideo] = useState<File | null>(null)
  const [roadVideo, setRoadVideo] = useState<File | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState("")

  const [faceResult, setFaceResult] = useState<any>(null)
  const [parkingResult, setParkingResult] = useState<any>(null)
  const [roadResult, setRoadResult] = useState<any>(null)

  const [manualScores, setManualScores] = useState({
    chair: 0, mirrors: 0, monitoring: 0, gear: 0, steering: 0, 
    signalTurns: 0, signalRules: 0, overtakingSpot: 0, overtakingSignal: 0,
    overtakingMonitor: 0, overtakingReturn: 0, lookBack: 0, reverseMonitor: 0
  })

  // دالة الاتصال السحرية (المكتبة تعمل كل شيء)
  const analyzeMedia = async (file: File, spaceName: string, apiName: string) => {
    // 1. الاتصال بالـ Space (المكتبة بتنتظره لو كان نايم)
    const client = await Client.connect(spaceName);
    
    // 2. إرسال الملف مباشرة كأول argument
    const result = await client.predict(apiName, [file]);
    
    // 3. إرجاع البيانات الخام
    return result.data;
  }

  const handleAnalyze = async (type: "face" | "parking" | "road") => {
    setIsAnalyzing(true)
    setAnalysisError("")
    
    try {
      if (type === "face" && faceVideo) {
        // رابط الفيس بالـ HF
        const data = await analyzeMedia(faceVideo, "taimaa47/behavior-seatbelt", "/predict_combined_video")
        setFaceResult(data)
        setStep(2)
      } else if (type === "parking" && parkingVideo) {
        // رابط الباركينغ بالـ HF
        const data = await analyzeMedia(parkingVideo, "shahednazzal/parking", "/analyze_video")
        setParkingResult(data[1]) // الباركينغ يرجع [فيديو، JSON]
        setStep(3)
      } else if (type === "road" && roadVideo) {
        // ضع اسم المستخدم والـ Space الخاص بالـ Road هنا
        const data = await analyzeMedia(roadVideo, "your-road-space", "/process_video")
        setRoadResult(data[1]) // الطريق يرجع [فيديو، JSON]
        setStep(4)
      }
    } catch (error: any) {
      setAnalysisError(error.message || "Failed to connect to AI model.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const submitFinalTest = async () => {
    setIsAnalyzing(true)
    
    try {
      const aiBehavior = faceResult?.behavior_score?.score_out_of_2 || 0
      const aiSeatbelt = faceResult?.seatbelt_score?.score_out_of_2 || 0
      const aiParkingAlignment = parseFloat(parkingResult?.alignment) || 0
      const aiParkingStability = parseFloat(parkingResult?.stability) || 0

      const roadCategories = roadResult?.road_evaluation?.categories || {}
      const roadControl = parseInt(roadCategories["Control & Steering"]?.score) || 0
      const roadTurns = parseInt(roadCategories["Turns & Curves"]?.score) || 0
      const roadRules = parseInt(roadCategories["Traffic Rules"]?.score) || 0
      const roadStopping = parseInt(roadCategories["Stopping & Safety"]?.score) || 0
      const roadElements = parseInt(roadCategories["Traffic Elements"]?.score) || 0

      const { chair, mirrors, monitoring, gear, steering, signalTurns, signalRules, overtakingSpot, overtakingSignal, overtakingMonitor, overtakingReturn, lookBack, reverseMonitor } = manualScores
      
      const finalSeatbeltScore = aiBehavior + aiSeatbelt 
      const finalParkingScore = (aiParkingAlignment + aiParkingStability) + (lookBack + reverseMonitor)
      const finalLaneScore = (roadControl + roadTurns) + (steering + signalTurns)
      const manualSpeedRest = chair + mirrors + monitoring + gear + signalRules + overtakingSpot + overtakingSignal + overtakingMonitor + overtakingReturn
      const finalSpeedScore = (roadRules + roadStopping + roadElements) + manualSpeedRest

      const totalScore = finalSeatbeltScore + finalParkingScore + finalLaneScore + finalSpeedScore

      const supabase = createClient()
      const { error } = await supabase
        .from("practical_test_grades")
        .insert({
          user_id: userId,
          seatbelt_score: finalSeatbeltScore,
          parking_score: finalParkingScore,
          lane_score: finalLaneScore,
          speed_score: finalSpeedScore,
          total_score: totalScore,
          created_at: new Date().toISOString()
        })

      if (error) throw error
      router.push("/dashboard")
    } catch (error) {
      console.error("Error saving grades:", error)
      alert("حصل خطأ أثناء حفظ العلامات النهائية")
      setIsAnalyzing(false)
    }
  }

  const VideoUploader = ({ onChange, label, captureType = "user" }: { onChange: (f: File) => void, label: string, captureType?: string }) => (
    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300">
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
        <p className="text-xs text-gray-400">فيديو صغير (أقل من 15 ثانية) للحصول على نتائج أسرع</p>
      </div>
      <input type="file" className="hidden" accept="video/*" capture={captureType as any} onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
      <span className="mt-2 text-sm text-blue-600 font-medium">{label}</span>
    </label>
  )

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Practical Test Evaluation</h1>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{s}</div>
          ))}
        </div>
      </div>

      {analysisError && (
        <div className="bg-red-100 text-red-700 p-4 rounded border border-red-300 text-sm whitespace-pre-wrap break-words">
          <strong>Error Details:</strong> {analysisError}
        </div>
      )}

      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-xl font-semibold">1. Driver Face & Seatbelt (AI)</h2>
          <p className="text-gray-500 text-sm">تسجيل فيديو قصير لوجه السائق (الكاميرا الأمامية).</p>
          <VideoUploader onChange={setFaceVideo} label={faceVideo?.name || "Record Face Video"} captureType="user" />
          <button disabled={!faceVideo || isAnalyzing} onClick={() => handleAnalyze("face")} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full">
            {isAnalyzing ? "Analyzing Face Video (May take 30 secs)..." : "Analyze & Go to Step 2"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-xl font-semibold">2. Parking Test (AI)</h2>
          <p className="text-gray-500 text-sm">تسجيل فيديو عملية الاصطفاف (استخدم الكاميرا الخلفية).</p>
          <VideoUploader onChange={setParkingVideo} label={parkingVideo?.name || "Record Parking Video"} captureType="environment" />
          
          <div className="bg-green-50 p-3 rounded border text-sm">
            <p>✅ Face AI Done: Behavior ({faceResult?.behavior_score?.score_out_of_2 || 0}/2) - Seatbelt ({faceResult?.seatbelt_score?.score_out_of_2 || 0}/2)</p>
          </div>

          <button disabled={!parkingVideo || isAnalyzing} onClick={() => handleAnalyze("parking")} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full">
            {isAnalyzing ? "Analyzing Parking Video..." : "Analyze & Go to Step 3"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-xl font-semibold">3. Road Environment (AI - 56 Marks)</h2>
          <p className="text-gray-500 text-sm">تسجيل فيديو القيادة على الطريق.</p>
          <VideoUploader onChange={setRoadVideo} label={roadVideo?.name || "Record Road Video"} captureType="environment" />
          
          <div className="bg-green-50 p-3 rounded border text-sm space-y-1">
            <p>✅ Face AI: {((faceResult?.behavior_score?.score_out_of_2 || 0) + (faceResult?.seatbelt_score?.score_out_of_2 || 0))}/4</p>
            <p>✅ Parking AI: {parkingResult?.alignment}/3 Alignment - {parkingResult?.stability}/2 Stability</p>
          </div>

          <button disabled={!roadVideo || isAnalyzing} onClick={() => handleAnalyze("road")} className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 w-full">
            {isAnalyzing ? "Analyzing Road Video (May take a minute)..." : "Analyze & Go to Final Review"}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white p-6 rounded-xl shadow border space-y-6">
          <h2 className="text-xl font-bold">4. Final Review & Manual Grading (35 Marks)</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-green-700 border-b pb-2">Auto AI Grades (65/100)</h3>
              <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                <p><strong>Seatbelt/Behavior:</strong> {((faceResult?.behavior_score?.score_out_of_2 || 0) + (faceResult?.seatbelt_score?.score_out_of_2 || 0))}/4</p>
                <p><strong>Parking Total:</strong> {(parseFloat(parkingResult?.alignment)||0) + (parseFloat(parkingResult?.stability)||0)}/5</p>
                
                {roadResult?.road_evaluation && (
                  <div className="mt-4 border-t pt-2 space-y-1">
                    <p className="font-bold text-blue-600">Road Marks: {roadResult.road_evaluation.achieved_marks}/56</p>
                    {Object.entries(roadResult.road_evaluation.categories).map(([key, val]: any) => (
                      <p key={key} className="pl-4 text-gray-600">- {key}: {val.score}/{val.max}</p>
                    ))}
                  </div>
                )}
                {!roadResult && <p className="text-red-500 mt-2">Road API result missing.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg text-orange-700 border-b pb-2">Manual Marks (35/100)</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label>Chair (2) <input type="number" max={2} className="w-full border p-1 rounded" value={manualScores.chair} onChange={e => setManualScores({...manualScores, chair: Number(e.target.value)})}/></label>
                <label>Mirrors (2) <input type="number" max={2} className="w-full border p-1 rounded" value={manualScores.mirrors} onChange={e => setManualScores({...manualScores, mirrors: Number(e.target.value)})}/></label>
                <label>Monitoring (2) <input type="number" max={2} className="w-full border p-1 rounded" value={manualScores.monitoring} onChange={e => setManualScores({...manualScores, monitoring: Number(e.target.value)})}/></label>
                <label>Gear Shift (4) <input type="number" max={4} className="w-full border p-1 rounded" value={manualScores.gear} onChange={e => setManualScores({...manualScores, gear: Number(e.target.value)})}/></label>
                <label>Steering (4) <input type="number" max={4} className="w-full border p-1 rounded" value={manualScores.steering} onChange={e => setManualScores({...manualScores, steering: Number(e.target.value)})}/></label>
                <label>Signals/Turns (3) <input type="number" max={3} className="w-full border p-1 rounded" value={manualScores.signalTurns} onChange={e => setManualScores({...manualScores, signalTurns: Number(e.target.value)})}/></label>
                <label>Signals/Rules (3) <input type="number" max={3} className="w-full border p-1 rounded" value={manualScores.signalRules} onChange={e => setManualScores({...manualScores, signalRules: Number(e.target.value)})}/></label>
                <label>Overtaking Spot (3) <input type="number" max={3} className="w-full border p-1 rounded" value={manualScores.overtakingSpot} onChange={e => setManualScores({...manualScores, overtakingSpot: Number(e.target.value)})}/></label>
                <label>Overtaking Signal (2) <input type="number" max={2} className="w-full border p-1 rounded" value={manualScores.overtakingSignal} onChange={e => setManualScores({...manualScores, overtakingSignal: Number(e.target.value)})}/></label>
                <label>Overtaking Monitor (3) <input type="number" max={3} className="w-full border p-1 rounded" value={manualScores.overtakingMonitor} onChange={e => setManualScores({...manualScores, overtakingMonitor: Number(e.target.value)})}/></label>
                <label>Overtaking Return (2) <input type="number" max={2} className="w-full border p-1 rounded" value={manualScores.overtakingReturn} onChange={e => setManualScores({...manualScores, overtakingReturn: Number(e.target.value)})}/></label>
                <label>Look Back (2) <input type="number" max={2} className="w-full border p-1 rounded" value={manualScores.lookBack} onChange={e => setManualScores({...manualScores, lookBack: Number(e.target.value)})}/></label>
                <label>Reverse Monitor (3) <input type="number" max={3} className="w-full border p-1 rounded col-span-2" value={manualScores.reverseMonitor} onChange={e => setManualScores({...manualScores, reverseMonitor: Number(e.target.value)})}/></label>
              </div>
            </div>
          </div>

          <button 
            disabled={isAnalyzing} 
            onClick={submitFinalTest} 
            className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg w-full hover:bg-green-700 transition disabled:opacity-50"
          >
            {isAnalyzing ? "Saving to Dashboard..." : "Submit Final Test (100/100)"}
          </button>
        </div>
      )}
    </div>
  )
}