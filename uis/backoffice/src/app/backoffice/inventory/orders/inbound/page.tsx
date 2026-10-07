"use client";

import { useEffect, useState, type FormEvent } from "react";

import InventoryNav from "@/components/inventory/InventoryNav";
import { useAuth } from "@/hooks/useAuth";
import { createInboundOrder, listProducts } from "@/lib/inventory";
import type { SKU } from "@/types/inventory";
import styles from "@/app/backoffice/inventory/inventory.module.css";

export default function InboundPage() {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<SKU[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedProduct = products.find((product) => String(product.id) === productId) ?? null;

  useEffect(() => {
    let active = true;

    listProducts(authFetch)
      .then((data) => {
        if (!active) return;
        setProducts(data);
        const preselectedId = new URLSearchParams(window.location.search).get("productId");
        if (preselectedId && data.some((product) => String(product.id) === preselectedId)) {
          setProductId(preselectedId);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los SKUs.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authFetch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const parsedQuantity = Number(quantity);
    if (!selectedProduct) {
      setError("Seleccioná un SKU válido.");
      return;
    }
    if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("La cantidad debe ser un número entero mayor que cero.");
      return;
    }
    if (!reference.trim()) {
      setError("Ingresá la referencia de recepción.");
      return;
    }

    setSubmitting(true);
    try {
      await createInboundOrder(authFetch, {
        sku_id: selectedProduct.id,
        quantity: parsedQuantity,
        reference: reference.trim(),
        warehouse: selectedProduct.warehouse,
      });
      setSuccess("Entrada registrada correctamente.");
      setProductId("");
      setQuantity("");
      setReference("");
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar la entrada.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Inventario / Movimientos</p>
          <h1 className={styles.title}>Registrar entrada</h1>
          <p className={styles.description}>Sumá unidades recibidas al almacén asociado al SKU.</p>
        </div>
      </header>
      <InventoryNav />

      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      {!loading && !error && products.length === 0 && (
        <p className={styles.state}>No hay SKUs disponibles. Verificá que el seed de inventario esté cargado.</p>
      )}

      {loading ? (
        <p className={styles.state} role="status">Cargando SKUs...</p>
      ) : products.length > 0 && !error ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>SKU</span>
            <select value={productId} onChange={(event) => setProductId(event.target.value)} required>
              <option value="">Seleccioná un SKU</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.sku}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Cantidad</span>
            <input
              min="1"
              step="1"
              type="number"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Referencia de recepción</span>
            <input
              autoComplete="off"
              maxLength={120}
              placeholder="PO-2026-0098"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Almacén del SKU</span>
            <input aria-readonly="true" value={selectedProduct?.warehouse ?? ""} readOnly />
            <span className={styles.fieldHint}>El movimiento se registra en este almacén.</span>
          </label>

          <button className={`${styles.button} ${styles.buttonPrimary}`} disabled={submitting} type="submit">
            {submitting ? "Guardando..." : "Registrar entrada"}
          </button>
        </form>
      ) : null}
    </main>
  );
}