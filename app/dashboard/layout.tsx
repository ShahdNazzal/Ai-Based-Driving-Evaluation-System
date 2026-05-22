import React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardShell } from "@/components/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <DashboardShell
      user={{
        id: user.id,
        email: user.email ?? "",
        fullName: profile?.full_name ?? user.user_metadata?.full_name ?? "Driver",
      }}
    >
      {children}
    </DashboardShell>
  )
}
