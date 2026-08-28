"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id?: string;
  user_id?: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
};

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  profile?: Profile | null;
};

type RegisterInput = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
};

type AuthContextValue = {
  token: string | null;
  user: CurrentUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  navigate: (to: string) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<CurrentUser>;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "access_token";

function buildApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/backend/")) {
    return path;
  }

  return `/backend${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
  return payload?.detail ?? fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useCallback(
    (to: string) => {
      router.push(to);
    },
    [router],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const headers = new Headers(init.headers ?? {});

      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }

      const response = await fetch(buildApiUrl(input), {
        ...init,
        headers,
        cache: "no-store",
      });

      if (response.status === 401) {
        logout();
        throw new Error("Sesion expirada. Volve a iniciar sesion.");
      }

      return response;
    },
    [logout],
  );

  const fetchMe = useCallback(async (): Promise<CurrentUser> => {
    const response = await authFetch("/auth/me", {
      method: "GET",
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, "No se pudo cargar tu perfil");
      throw new Error(message);
    }

    const me = (await response.json()) as CurrentUser;
    setUser(me);
    return me;
  }, [authFetch]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Credenciales invalidas");
        throw new Error(message);
      }

      const data = (await response.json()) as {
        access_token: string;
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      setToken(data.access_token);
      await fetchMe();
      navigate("/suppliers");
    },
    [fetchMe, navigate],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const registerResponse = await fetch(buildApiUrl("/users"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!registerResponse.ok) {
        const message = await parseErrorMessage(registerResponse, "No se pudo registrar la cuenta");
        throw new Error(message);
      }

      await login(input.email, input.password);
    },
    [login],
  );

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!stored) {
      setLoading(false);
      return;
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, stored);
    setToken(stored);

    void fetchMe()
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      navigate,
      login,
      register,
      logout,
      fetchMe,
      authFetch,
    }),
    [authFetch, fetchMe, loading, login, logout, navigate, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
