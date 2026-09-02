"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";

type ProfileForm = {
  name: string;
  phone: string;
  address: string;
};

const initialForm: ProfileForm = {
  name: "",
  phone: "",
  address: "",
};

export default function AccountProfilePage() {
  const { user, fetchMe, authFetch } = useAuth();

  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      const me = await fetchMe();
      setForm({
        name: me.profile?.name ?? "",
        phone: me.profile?.phone ?? "",
        address: me.profile?.address ?? "",
      });
    } catch (loadError) {
      if (loadError instanceof Error) {
        setError(loadError.message);
      } else {
        setError("No se pudo cargar el perfil");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await authFetch("/profiles/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name || null,
          phone: form.phone || null,
          address: form.address || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(data?.detail ?? "No se pudo actualizar el perfil");
      }

      await fetchMe();
      setSuccess("Perfil actualizado correctamente");
    } catch (saveError) {
      if (saveError instanceof Error) {
        setError(saveError.message);
      } else {
        setError("No se pudo actualizar el perfil");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container">
      <section className="pageHeader">
        <h1>Mi perfil</h1>
        <p>Gestiona tu informacion de cuenta.</p>
      </section>

      <section className="card">
        <h2>Cuenta</h2>
        <p>
          <strong>Email:</strong> {user?.email ?? "-"}
        </p>
      </section>

      <section className="card">
        <h2>Datos de contacto</h2>

        {loading ? (
          <p>Cargando perfil...</p>
        ) : (
          <form className="authForm" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label>
              Telefono
              <input
                type="text"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </label>

            <label>
              Direccion
              <input
                type="text"
                value={form.address}
                onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        )}

        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        <p className="authFootnote">
          <Link href="/account/change-password">Cambiar contrasena</Link>
        </p>
      </section>
    </main>
  );
}
