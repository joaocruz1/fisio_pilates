import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Refresh de sessão no proxy (antigo middleware — renomeado no Next 16).
 * Mantém os cookies de auth atualizados a cada request. Redirects aqui são
 * apenas UX/otimistas — a autorização real vive nas RLS policies do banco.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANTE: getClaims/getUser força o refresh do token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Telas de auth (sem sessão). /redefinir-senha é exceção: precisa de sessão
  // ativa (o link de recuperação cria uma) — não redirecionar dela.
  const isAuthEntry =
    pathname === "/login" || pathname === "/cadastro" || pathname === "/recuperar-senha";
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    isAuthEntry ||
    pathname === "/redefinir-senha";

  // Sem sessão em rota protegida → login, preservando o destino.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Com sessão numa tela de entrada de auth → dashboard.
  if (user && isAuthEntry) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
