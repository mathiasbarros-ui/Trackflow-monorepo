"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { useAuth } from "@/hooks/useAuth";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function RegisterPage() {
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    if (!email.includes("@")) {
      nextErrors.email = "Ingresa un email valido";
    }

    if (password.length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      await register({
        email,
        password,
        name: name || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("No se pudo registrar la cuenta");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card authCard">
        <h1>Crear cuenta</h1>
        <p>Completa tus datos para registrarte y acceder.</p>

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
            {fieldErrors.email ? <small className="fieldError">{fieldErrors.email}</small> : null}
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
            {fieldErrors.password ? <small className="fieldError">{fieldErrors.password}</small> : null}
          </label>

          <label>
            Nombre
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label>
            Telefono
            <input type="text" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>

          <label>
            Direccion
            <input type="text" value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Registrando..." : "Crear cuenta"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <p className="authFootnote">
          Ya tienes cuenta? <Link href="/login">Inicia sesion</Link>
        </p>
      </section>
    </main>
  );
}
