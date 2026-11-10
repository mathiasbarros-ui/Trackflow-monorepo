"use client";

import { usePreferences } from "@/hooks/usePreferences";

import Link from "next/link";
import { FormEvent, useState } from "react";

import AuthCard from "@/components/auth/AuthCard";
import { useAuth } from "@/hooks/useAuth";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function RegisterPage() {
  const { t } = usePreferences();
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
      nextErrors.email = "Ingresa un email válido";
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
    <AuthCard title={t("Crear cuenta")} description={t("Completa tus datos para registrarte y acceder.")}>
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
            {fieldErrors.email ? <small className="fieldError">{t(fieldErrors.email)}</small> : null}
          </label>

          <label>{t(" Contraseña ")}<input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
            {fieldErrors.password ? <small className="fieldError">{t(fieldErrors.password)}</small> : null}
          </label>

          <label>{t(" Nombre ")}<input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label>{t(" Teléfono ")}<input type="text" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>

          <label>{t(" Dirección ")}<input type="text" value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? t("Registrando...") : t("Crear cuenta")}
          </button>
        </form>

        {error ? <p className="error">{t(error)}</p> : null}

        <p className="authFootnote">{t(" ¿Ya tienes cuenta? ")}<Link href="/login">{t("Inicia sesión")}</Link>
        </p>
    </AuthCard>
  );
}
