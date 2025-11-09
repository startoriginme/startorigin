"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import { Lightbulb, ArrowLeft, Mail } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // ✅ НОРМАЛИЗАЦИЯ USERNAME
      const normalizedUsername = username.toLowerCase().trim()

      // Проверяем формат username
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
        throw new Error("Username can only contain letters, numbers, and underscores")
      }

      // ✅ ПРОВЕРЯЕМ СУЩЕСТВУЕТ ЛИ USERNAME ПЕРЕД РЕГИСТРАЦИЕЙ
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", normalizedUsername)
        .single()

      if (existingProfile) {
        throw new Error(`Username "${normalizedUsername}" is already taken. Please choose a different one.`)
      }

      // Регистрируем пользователя
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}`,
          data: {
            display_name: displayName,
            username: normalizedUsername, // ✅ Сохраняем нормализованный
          },
        },
      })
      
      if (error) {
        // Обрабатываем специфичные ошибки Supabase
        if (error.message.includes("already registered")) {
          throw new Error("This email is already registered. Please sign in instead.")
        } else if (error.message.includes("password")) {
          throw new Error("Password should be at least 6 characters long.")
        } else {
          throw error
        }
      }
      
      setIsSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred during registration")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">StartOrigin</span>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">Check your email!</CardTitle>
              <CardDescription className="text-center">
                Confirm your account via Supabase and then you can sign in to StartOrigin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  We've sent a confirmation email to <strong className="text-foreground">{email}</strong>. Please check
                  your inbox and click the confirmation link.
                </div>
                <Link href="/auth/login">
                  <Button className="w-full">Go to Sign In</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full bg-transparent">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
        </div>

        <div className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">StartOrigin</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Join StartOrigin to share and discover problems</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSignUp}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    pattern="[a-zA-Z0-9_]+"
                    title="Only letters, numbers, and underscores allowed"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only letters, numbers, and underscores. <span className="text-blue-500">Case-insensitive.</span>
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters</p>
                </div>
                {error && (
                  <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/auth/login" className="underline underline-offset-4 text-primary hover:text-primary/80">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
