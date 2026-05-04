import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

function isAdminUser(user: { app_metadata?: Record<string, unknown> } | null) {
  const role = user?.app_metadata?.role;
  return role === "admin" || role === "superadmin";
}

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname === "/login" && user && isAdminUser(user)) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (isAdminPath(request.nextUrl.pathname) && !isAdminUser(user)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
