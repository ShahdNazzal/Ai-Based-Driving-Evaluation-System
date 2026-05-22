"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()

    setLoading(true)
    setMessage("")
    setError("")

    const supabase = createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,   
         })

    if (error) {
      setError(error.message)
    } else {
      setMessage("Password reset link has been sent to your email.")
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <Card className="w-full max-w-md bg-background shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>

        <CardContent>
          {message && (
            <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link href="/auth/login" className="text-primary hover:underline">
              Back to Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}