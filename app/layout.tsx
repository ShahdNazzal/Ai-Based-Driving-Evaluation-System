import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Mono } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"

import ChatBubble from "@/components/ChatBubble";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
})

export const metadata: Metadata = {
  title: "Driver Skill Assessment",
  description:
    "Professional driving assessment platform for Jordanian drivers. Theory tests, practical evaluations, and interactive training.",
}

export const viewport: Viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceMono.variable}`}>
      
      
      <body className="font-sans antialiased">
  {children}
  <Toaster position="top-right" richColors />

  {/* 💬 الشات بوت */}
  <ChatBubble />
</body>


    </html>
  )
}



