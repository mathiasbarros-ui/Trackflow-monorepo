"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
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
  refreshUser: () => Promise<CurrentUser>;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "access_token";

type AuthState = {
  token: string | null;
  user: CurrentUser | null;
  loading: boolean;
};

type AuthAction =
  | { type: "LOGIN_SUCCESS"; payload: { token: string; user: CurrentUser } }
  | { type: "UPDATE_USER"; payload: CurrentUser }
  | { type: "LOGOUT" }
  | { type: "HYDRATION_COMPLETE" };

const initialState: AuthState = {
  token: null,
  user: null,
  loading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return { token: action.payload.token, user: action.payload.user, loading: false };
    case "UPDATE_USER":
      return { ...state, user: action.payload, loading: false };
    case "LOGOUT":
      return { token: null, user: null, loading: false };
    case "HYDRATION_COMPLETE":
      return { ...state, loading: false };
  }
}

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
  const [state, dispatch] = useReducer(authReducer, initialState);

  function navigate(to: string) {
    router.push(to);
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    dispatch({ type: "LOGOUT" });
    navigate("/login");
  }

  async function authFetch(input: string, init: RequestInit = {}) {
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
  }

  async function fetchMe(): Promise<CurrentUser> {
    const response = await authFetch("/auth/me", {
      method: "GET",
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response, "No se pudo cargar tu perfil");
      throw new Error(message);
    }

    const me = (await response.json()) as CurrentUser;
    dispatch({ type: "UPDATE_USER", payload: me });
    return me;
  }

  async function login(email: string, password: string) {
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
        user: CurrentUser;
      };

      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      dispatch({ type: "LOGIN_SUCCESS", payload: { token: data.access_token, user: data.user } });
      navigate("/suppliers");
  }

  async function register(input: RegisterInput) {
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
  }

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!stored) {
      dispatch({ type: "HYDRATION_COMPLETE" });
      return;
    }

    void fetch(buildApiUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${stored}` },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sesion invalida");
        const user = (await response.json()) as CurrentUser;
        dispatch({ type: "LOGIN_SUCCESS", payload: { token: stored, user } });
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        dispatch({ type: "LOGOUT" });
      });
  }, []);

  const value: AuthContextValue = {
    token: state.token,
    user: state.user,
    loading: state.loading,
    isAuthenticated: Boolean(state.token),
    navigate,
    login,
    register,
    logout,
    fetchMe,
    refreshUser: fetchMe,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
