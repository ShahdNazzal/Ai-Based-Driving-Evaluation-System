import { NextRequest, NextResponse } from "next/server"
import { Client } from "@gradio/client"

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const video = formData.get("video") as File
  try {
    const client = await Client.connect("shahednazzal/parking")
    const result = await client.predict("/analyze_video", { video_input: video })
    return NextResponse.json({ success: true, data: result.data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}