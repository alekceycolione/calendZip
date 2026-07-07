import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  console.log('[PROXY]', pathname, 'user:', user?.id || 'null')

  const isAuthRoute = pathname === "/login" || pathname === "/recuperar-senha" || pathname.startsWith("/auth");
  const isProtectedRoute =
    pathname.startsWith("/cliente") || pathname.startsWith("/admin");

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("usuarios")
      .select("papel, ativo")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.ativo) {
      console.log('[PROXY] protected route, no valid profile, signing out')
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (user && isAuthRoute) {
    const { data: profile } = await supabase
      .from("usuarios")
      .select("papel, ativo")
      .eq("id", user.id)
      .single();

    console.log('[PROXY] auth route, profile:', profile)

    // Se não houver perfil (migração/trigger ausente) ou estiver inativo, faz logout
    if (!profile || !profile.ativo) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = profile.papel === "admin" ? "/admin" : "/cliente";
    console.log('[PROXY] redirecting to', url.pathname)
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
