"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
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
      setError("Las contrasenas no coinciden.");
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
        throw new Error(data?.detail ?? "Token invalido o expirado.");
      }
      router.push("/login?reset=success");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card authCard">
        <h1>Restablecer contrasena</h1>
        {token ? <form className="authForm" onSubmit={handleSubmit}>
          <label>Nueva contrasena<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <label>Confirmar contrasena<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></label>
          <button type="submit" disabled={loading}>{loading ? "Guardando..." : "Cambiar contrasena"}</button>
        </form> : <p className="error">El enlace no contiene un token valido.</p>}
        {error ? <p className="error">{error}</p> : null}
        <p className="authFootnote"><Link href="/forgot-password">Solicitar otro enlace</Link></p>
      </section>
    </main>
  );
}