"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/backend/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("No se pudo enviar la solicitud.");
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card authCard">
        <h1>Recuperar contrasena</h1>
        {sent ? (
          <p className="success">Si esa direccion esta registrada, recibiras un enlace en breve.</p>
        ) : (
          <form className="authForm" onSubmit={handleSubmit}>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
            <button type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar enlace"}</button>
          </form>
        )}
        {error ? <p className="error">{error}</p> : null}
        <p className="authFootnote"><Link href="/login">Volver al inicio de sesion</Link></p>
      </section>
    </main>
  );
}