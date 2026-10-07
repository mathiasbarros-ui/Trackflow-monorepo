"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";


type SupplierStatus = "activo" | "suspendido";
type SupplierCategory = "electronics" | "logistics" | "metals";

type Supplier = {
  id: number;
  name: string;
  country: "US" | "ES";
  category: SupplierCategory;
  rate: number;
  status: SupplierStatus;
  updated_at: string;
};

type SupplierForm = {
  name: string;
  country: "US" | "ES";
  category: SupplierCategory;
  rate: string;
  status: SupplierStatus;
};

const CATEGORY_OPTIONS: SupplierCategory[] = [
  "electronics",
  "logistics",
  "metals",
];


const STATUS_OPTIONS: SupplierStatus[] = [
  "activo",
  "suspendido",
];


const initialForm: SupplierForm = {
  name: "",
  country: "US",
  category: "electronics",
  rate: "",
  status: "activo",
};


export default function SuppliersPage() {
  const { authFetch } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [countryFilter, setCountryFilter] = useState<"" | "US" | "ES">("");
  const [categoryFilter, setCategoryFilter] = useState<"" | SupplierCategory>("");
  const [form, setForm] = useState<SupplierForm>(initialForm);
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadSuppliers();
  }, [countryFilter, categoryFilter]);

  async function loadSuppliers() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (countryFilter) params.set("country", countryFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const queryString = params.toString();
      const url = queryString
        ? `/backend/suppliers?${queryString}`
        : "/backend/suppliers";

      const response = await authFetch(url, { method: "GET" });
      const data = (await response.json().catch(() => null)) as Supplier[] | { detail?: string } | null;

      if (!response.ok) {
        throw new Error((data as { detail?: string })?.detail ?? "No se pudo cargar proveedores");
      }

      const rows = data as Supplier[];
      setSuppliers(rows);

      const nextRateDrafts: Record<number, string> = {};
      rows.forEach((supplier) => {
        nextRateDrafts[supplier.id] = String(supplier.rate);
      });
      setRateDrafts(nextRateDrafts);
    } catch (loadError) {
      if (loadError instanceof Error) {
        setError(loadError.message);
      } else {
        setError("Error inesperado al cargar proveedores");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const parsedRate = Number(form.rate);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setError("La tarifa debe ser mayor que 0");
      return;
    }

    try {
      const response = await authFetch("/backend/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          country: form.country,
          category: form.category,
          rate: parsedRate,
          status: form.status,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "No se pudo crear proveedor");
      }

      setForm(initialForm);
      await loadSuppliers();
    } catch (createError) {
      if (createError instanceof Error) {
        setError(createError.message);
      } else {
        setError("Error inesperado al crear proveedor");
      }
    }
  }

  async function updateSupplierRate(supplierId: number) {
    setError("");

    const parsedRate = Number(rateDrafts[supplierId]);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      setError("La tarifa debe ser mayor que 0");
      return;
    }

    try {
      const response = await authFetch(`/backend/suppliers/${supplierId}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: parsedRate }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail ?? "No se pudo actualizar tarifa");
      }

      await loadSuppliers();
    } catch (rateError) {
      if (rateError instanceof Error) {
        setError(rateError.message);
      } else {
        setError("Error inesperado al actualizar tarifa");
      }
    }
  }

  async function toggleSupplierStatus(supplier: Supplier) {
    setError("");
    const nextStatus: SupplierStatus = supplier.status === "activo" ? "suspendido" : "activo";

    try {
      const response = await authFetch(`/backend/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail ?? "No se pudo actualizar estado");
      }

      await loadSuppliers();
    } catch (statusError) {
      if (statusError instanceof Error) {
        setError(statusError.message);
      } else {
        setError("Error inesperado al actualizar estado");
      }
    }
  }

  return (
    <main className="container">
      <section className="pageHeader">
        <h1>Directorio de proveedores</h1>
        <p>Administra proveedores, estado y tarifa de trabajo.</p>
      </section>

      <section className="card">
        <h2>Registrar proveedor</h2>
        <form className="supplierForm" onSubmit={handleCreateSupplier}>
          <input
            type="text"
            placeholder="Nombre"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <select
            value={form.country}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value as "US" | "ES" }))}
          >
            <option value="US">US</option>
            <option value="ES">ES</option>
          </select>

          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as SupplierCategory }))}
          >
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Tarifa"
            value={form.rate}
            onChange={(event) => setForm((prev) => ({ ...prev, rate: event.target.value }))}
            required
          />

          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as SupplierStatus }))}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button type="submit">Crear</button>
        </form>
      </section>

      <section className="card">
        <h2>Filtros</h2>
        <div className="supplierFilters">
          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value as "" | "US" | "ES")}
          >
            <option value="">Todos los países</option>
            <option value="US">US</option>
            <option value="ES">ES</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as "" | SupplierCategory)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && <p className="error">{error}</p>}

      <section className="card">
        <h2>Listado</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : suppliers.length === 0 ? (
          <p>No hay proveedores.</p>
        ) : (
          <ul className="supplierList">
            {suppliers.map((supplier) => (
              <li key={supplier.id} className="supplierRow">
                <div>
                  <strong>{supplier.name}</strong>
                  <div className="supplierMeta">
                    {supplier.country} · {supplier.category}
                  </div>
                  <span className={`statusBadge ${supplier.status === "activo" ? "isActive" : "isSuspended"}`}>
                    {supplier.status}
                  </span>
                </div>

                <div className="supplierActions">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={rateDrafts[supplier.id] ?? ""}
                    onChange={(event) =>
                      setRateDrafts((prev) => ({
                        ...prev,
                        [supplier.id]: event.target.value,
                      }))
                    }
                  />
                  <button type="button" onClick={() => void updateSupplierRate(supplier.id)}>
                    Guardar tarifa
                  </button>
                  <button type="button" onClick={() => void toggleSupplierStatus(supplier)}>
                    {supplier.status === "activo" ? "Suspender" : "Activar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
