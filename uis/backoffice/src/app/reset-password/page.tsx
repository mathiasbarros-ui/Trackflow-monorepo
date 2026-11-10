"use client";

import { usePreferences } from "@/hooks/usePreferences";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

function ResetPasswordPageContent() {
  const { t } = usePreferences();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/backend/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(data?.detail ?? "Token inválido o expirado.");
      }
      router.push("/login?reset=success");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("Restablecer contraseña")}>
        {token ? <form className="authForm" onSubmit={handleSubmit}>
          <label>{t("Nueva contraseña")}<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <label>{t("Confirmar contraseña")}<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <button type="submit" disabled={loading}>{loading ? t("Guardando...") : t("Cambiar contraseña")}</button>
        </form> : <p className="error">{t("El enlace no contiene un token válido.")}</p>}
        {error ? <p className="error">{t(error)}</p> : null}
        <p className="authFootnote"><Link href="/forgot-password">{t("Solicitar otro enlace")}</Link></p>
    </AuthCard>
  );
}