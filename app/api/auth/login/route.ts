import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/database.types"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const formData = await request.formData()
  const email = String(formData.get("email") || "")
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?erro=vazio", request.url), 303)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch (e) {
              console.error("[LOGIN] cookie set error:", name, e)
            }
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("[LOGIN] signIn error:", error.message, error.status)
    return NextResponse.redirect(
      new URL(`/login?erro=${encodeURIComponent(error.message)}`, request.url),
      303
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[LOGIN] user:", user?.id, user?.email)

  if (!user) {
    return NextResponse.redirect(new URL("/login?erro=sessao", request.url), 303)
  }

  const { data: profile, error: profileError } = await supabase
    .from("usuarios")
    .select("papel, ativo, email")
    .eq("id", user.id)
    .single()

  console.log("[LOGIN] profile query result:", profile, "error:", profileError)

  if (!profile || !profile.ativo) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/login?erro=perfil", request.url), 303)
  }

  const destino = profile.papel === "admin" ? "/admin" : "/cliente"

  // Constrói o redirect copiando os cookies setados pelo Supabase
  const response = NextResponse.redirect(new URL(destino, request.url), 303)
  cookieStore.getAll().forEach((c) => {
    response.cookies.set(c)
  })

  return response
}
