"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        setError("No se pudo iniciar sesion");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card authCard">
        <h1>Iniciar sesion</h1>
        <p>Usa tu email y contrasena para entrar al backoffice.</p>

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

          <label>
            Contrasena
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <p className="authFootnote">
          No tienes cuenta? <Link href="/register">Registrate aqui</Link>
        </p>
      </section>
    </main>
  );
}
