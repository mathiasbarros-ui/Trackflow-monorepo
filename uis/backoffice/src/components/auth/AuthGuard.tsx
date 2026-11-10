"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { transferSession } from "../../../../shared/session";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, isAuthenticated, user, token, navigate } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated && !["admin", "superadmin"].includes(user?.role ?? "") && token) {
      localStorage.removeItem("access_token");
      transferSession(process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000", token);
      return;
    }

    if (!loading && !isAuthenticated && !isPublicRoute(pathname)) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate, pathname, token, user]);

  if (loading && !isPublicRoute(pathname)) {
    return null;
  }

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return null;
  }

  if (isAuthenticated && !["admin", "superadmin"].includes(user?.role ?? "")) {
    return null;
  }

  return <>{children}</>;
}
