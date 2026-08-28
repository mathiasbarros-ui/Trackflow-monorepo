"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";

const PUBLIC_ROUTES = ["/login", "/register"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, isAuthenticated, navigate } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated && !isPublicRoute(pathname)) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate, pathname]);

  if (loading) {
    return null;
  }

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return null;
  }

  return <>{children}</>;
}
