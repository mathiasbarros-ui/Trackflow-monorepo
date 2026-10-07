"use client";

import { useEffect, useState, type FormEvent } from "react";

import InventoryNav from "@/components/inventory/InventoryNav";
import { useAuth } from "@/hooks/useAuth";
import {
  createOutboundOrder,
  getProduct,
  InventoryApiError,
  listProducts,
} from "@/lib/inventory";
import type { SKU } from "@/types/inventory";
import styles from "@/app/backoffice/inventory/inventory.module.css";

export default function OutboundPage() {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<SKU[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [exitType, setExitType] = useState<"dispatch" | "loss">("dispatch");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedProduct = products.find((product) => String(product.id) === productId) ?? null;
  const parsedQuantity = Number(quantity);
  const exceedsStock = quantity !== "" && currentStock !== null && parsedQuantity > currentStock;

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
        if (active) setLoadingProducts(false);
      });

    return () => {
      active = false;
    };
  }, [authFetch]);

  useEffect(() => {
    if (!productId) {
      setCurrentStock(null);
      setLoadingStock(false);
      setQuantityError("");
      return;
    }

    let active = true;
    setCurrentStock(null);
    setLoadingStock(true);
    setQuantityError("");

    getProduct(authFetch, Number(productId))
      .then((product) => {
        if (active) setCurrentStock(product.current_stock);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "No se pudo consultar el stock.");
      })
      .finally(() => {
        if (active) setLoadingStock(false);
      });

    return () => {
      active = false;
    };
  }, [authFetch, productId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setQuantityError("");
    setSuccess("");

    if (!selectedProduct) {
      setError("Seleccioná un SKU válido.");
      return;
    }
    if (!Number.isSafeInteger(parsedQuantity) || parsedQuantity < 1) {
      setQuantityError("La cantidad debe ser un número entero mayor que cero.");
      return;
    }
    if (currentStock === null || loadingStock) {
      setError("Esperá a que se consulte el stock antes de registrar la salida.");
      return;
    }
    if (exitType === "dispatch" && !trackingNumber.trim()) {
      setError("Ingresá el número de tracking para un despacho.");
      return;
    }

    setSubmitting(true);
    try {
      await createOutboundOrder(authFetch, {
        sku_id: selectedProduct.id,
        quantity: parsedQuantity,
        exit_type: exitType,
        tracking_number: exitType === "dispatch" ? trackingNumber.trim() : null,
        warehouse: selectedProduct.warehouse,
      });
      setSuccess("Salida registrada correctamente.");
      setProductId("");
      setQuantity("");
      setCurrentStock(null);
      setExitType("dispatch");
      setTrackingNumber("");
    } catch (submitError: unknown) {
      if (submitError instanceof InventoryApiError && submitError.status === 400) {
        setQuantityError(submitError.message);
      } else {
        setError(submitError instanceof Error ? submitError.message : "No se pudo registrar la salida.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Inventario / Movimientos</p>
          <h1 className={styles.title}>Registrar salida</h1>
          <p className={styles.description}>Consultá el stock por SKU y almacén antes de confirmar.</p>
        </div>
      </header>
      <InventoryNav />

      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      {!loadingProducts && !error && products.length === 0 && (
        <p className={styles.state}>No hay SKUs disponibles. Verificá que el seed de inventario esté cargado.</p>
      )}

      {loadingProducts ? (
        <p className={styles.state} role="status">Cargando SKUs...</p>
      ) : products.length > 0 && !error ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>SKU</span>
            <select
              value={productId}
              onChange={(event) => {
                setProductId(event.target.value);
                setError("");
                setQuantityError("");
              }}
              required
            >
              <option value="">Seleccioná un SKU</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.sku}
                </option>
              ))}
            </select>
          </label>

          {selectedProduct && (
            <div aria-live="polite" className={styles.stockPanel}>
              <span>Stock disponible en {selectedProduct.warehouse}</span>
              <strong className={styles.stockValue}>
                {loadingStock ? "Consultando..." : currentStock ?? "No disponible"}
              </strong>
            </div>
          )}

          <label className={styles.field}>
            <span>Cantidad</span>
            <input
              aria-describedby={quantityError ? "outbound-quantity-error" : undefined}
              min="1"
              step="1"
              type="number"
              value={quantity}
              onChange={(event) => {
                setQuantity(event.target.value);
                setQuantityError("");
              }}
              required
            />
          </label>

          {exceedsStock && (
            <p className={styles.inlineWarning}>
              La cantidad supera el stock mostrado. El backend volverá a validar la disponibilidad al confirmar.
            </p>
          )}
          {quantityError && <p className={styles.error} id="outbound-quantity-error" role="alert">{quantityError}</p>}

          <label className={styles.field}>
            <span>Tipo de salida</span>
            <select
              value={exitType}
              onChange={(event) => {
                const nextType = event.target.value as "dispatch" | "loss";
                setExitType(nextType);
                if (nextType === "loss") setTrackingNumber("");
                setError("");
              }}
            >
              <option value="dispatch">Despacho</option>
              <option value="loss">Pérdida</option>
            </select>
          </label>

          {exitType === "dispatch" && (
            <label className={styles.field}>
              <span>Número de tracking</span>
              <input
                autoComplete="off"
                maxLength={120}
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                required
              />
              <span className={styles.fieldHint}>Obligatorio para despacho; no se envía en una pérdida.</span>
            </label>
          )}

          <label className={styles.field}>
            <span>Almacén del SKU</span>
            <input aria-readonly="true" value={selectedProduct?.warehouse ?? ""} readOnly />
          </label>

          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={submitting || loadingStock || !selectedProduct}
            type="submit"
          >
            {submitting ? "Guardando..." : "Registrar salida"}
          </button>
        </form>
      ) : null}
    </main>
  );
}