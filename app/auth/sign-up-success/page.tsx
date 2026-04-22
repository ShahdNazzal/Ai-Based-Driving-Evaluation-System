import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-foreground px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-background/10 bg-background shadow-2xl text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-2xl font-bold text-card-foreground">
            Account Created
          </CardTitle>
          <CardDescription>
            Please check your email for a confirmation link to activate your account, then sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Go to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
