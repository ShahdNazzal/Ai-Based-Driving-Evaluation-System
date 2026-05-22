import { NextResponse } from "next/server"
import { Client } from "@gradio/client"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const image = formData.get("image") as File | null
    const video = formData.get("video") as File | null

    const client = await Client.connect("shahednazzal/behavior-system")

    let result

    if (video) {
      result = await client.predict("/predict_video", {
        video,
      })
    }

    if (image) {
      result = await client.predict("/predict_image", {
        image,
      })
    }

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "API failed",
    })
  }
}