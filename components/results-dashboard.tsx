"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, CheckCircle2, XCircle } from "lucide-react"

type Props = {
  onAnalyze: (file: File) => Promise<any>
}

export function ResultsDashboard({ onAnalyze }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle")

  const [result, setResult] = useState<any>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setStatus("idle")
    }
  }

  const analyze = async () => {
    if (!file) return

    try {
      setStatus("uploading")

      const formData = new FormData()

      if (file.type.startsWith("video")) {
        formData.append("video", file)
      } else {
        formData.append("image", file)
      }

      setStatus("processing")

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!data.success) {
        setStatus("error")
        setResult(data)
        return
      }

      setStatus("done")
      setResult(data.result)
    } catch (err) {
      setStatus("error")
      setResult({ error: "Request failed" })
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* LEFT SIDE */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Input</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFile}
          />

          {file && (
            <div className="text-sm text-muted-foreground">
              Selected: {file.name}
            </div>
          )}

          <Button onClick={analyze} disabled={!file || status === "processing"}>
            {status === "processing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>

          {/* STATUS */}
          <div className="pt-4 space-y-2">

            {status === "done" && (
              <div className="text-green-600 flex items-center gap-2">
                <CheckCircle2 /> Done successfully
              </div>
            )}

            {status === "error" && (
              <div className="text-red-500 flex items-center gap-2">
                <XCircle /> Failed to analyze
              </div>
            )}

          </div>

        </CardContent>
      </Card>

      {/* RIGHT SIDE - RESULTS */}
      <Card>
        <CardHeader>
          <CardTitle>Results (AI Output)</CardTitle>
        </CardHeader>

        <CardContent>

          {!result && (
            <div className="text-muted-foreground">
              No results yet...
            </div>
          )}

          {result && (
            <pre className="text-xs bg-black text-green-400 p-4 rounded-lg overflow-auto max-h-[400px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

        </CardContent>
      </Card>

    </div>
  )
}