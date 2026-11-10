"use client";

import { usePreferences } from "@/hooks/usePreferences";

import Link from "next/link";
import { FormEvent, useState } from "react";

import AuthCard from "@/components/auth/AuthCard";
import { useAuth } from "@/hooks/useAuth";

export default function ChangePasswordPage() {
  const { t } = usePreferences();
  const { authFetch } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const response = await authFetch("/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(data?.detail ?? "No se pudo cambiar la contraseña.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Contraseña actualizada correctamente.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("Cambiar contraseña")}>
        <form className="authForm" onSubmit={handleSubmit}>
          <label>{t("Contraseña actual")}<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required autoComplete="current-password" /></label>
          <label>{t("Nueva contraseña")}<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <label>{t("Confirmar nueva contraseña")}<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <button type="submit" disabled={loading}>{loading ? t("Guardando...") : t("Cambiar contraseña")}</button>
        </form>
        {error ? <p className="error">{t(error)}</p> : null}
        {success ? <p className="success">{t(success)}</p> : null}
        <p className="authFootnote"><Link href="/account/profile">{t("Volver al perfil")}</Link></p>
    </AuthCard>
  );
}