"use client"

import React from "react"
import { Phone } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CarFront,
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart3,
  Gamepad2,
  BookMarked,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/auth/actions"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/practical", label: "Practical Test", icon: Camera },
  { href: "/dashboard/test-dates", label: "Test Dates", icon: Calendar },
  { href: "/dashboard/game", label: "Book a Driving Instructor", icon: Phone },

  { href: "/dashboard/training", label: "Theory Training", icon: BookOpen },

  { href: "/dashboard/scores", label: "My Scores", icon: BarChart3 },
  { href: "/dashboard/analysis", label: "Driving Analysis", icon: BarChart3 },

  { href: "/dashboard/book", label: "Learning resources", icon: BookMarked },
  { href: "/dashboard/game2", label: "Driving Game", icon: Gamepad2 },

]

export function DashboardShell({
  user,
  children,
}: {
  user: { id: string; email: string; fullName: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false)
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}







        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <CarFront className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold text-card-foreground">
             ROXA
            </span>
          </Link>
          <button
            className="rounded-md p-1 text-muted-foreground hover:text-card-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>








        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-card-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {isActive && (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-lg bg-secondary/50 p-3">
            <p className="text-sm font-medium text-card-foreground truncate">
              {user.fullName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
              size="sm"
            >
              <LogOut className="h-5 w-5"/>
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <button
            className="rounded-md p-2 text-muted-foreground hover:text-card-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}