"use client";

import { usePreferences } from "@/hooks/usePreferences";

import Link from "next/link";
import { Suspense, FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const { t } = usePreferences();
  const { login } = useAuth();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    setResetSuccess(searchParams.get("reset") === "success");
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("No se pudo iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("Iniciar sesión")} description={t("Usa tu email y contraseña para entrar al backoffice.")}>
        {resetSuccess ? <p className="success">{t("Contraseña actualizada. Ya puedes iniciar sesión.")}</p> : null}

        <form className="authForm" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>{t(" Contraseña ")}<input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? t("Entrando...") : t("Entrar")}
          </button>
        </form>

        {error ? <p className="error">{t(error)}</p> : null}

        <p className="authFootnote">{t(" ¿No tienes cuenta? ")}<Link href="/register">{t("Regístrate aquí")}</Link>
        </p>
        <p className="authFootnote">
          <Link href="/forgot-password">{t("¿Olvidaste tu contraseña?")}</Link>
        </p>
    </AuthCard>
  );
}
