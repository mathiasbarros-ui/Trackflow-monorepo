"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import InventoryNav from "@/components/inventory/InventoryNav";
import { useAuth } from "@/hooks/useAuth";
import { listProducts } from "@/lib/inventory";
import type { SKU } from "@/types/inventory";
import styles from "@/app/backoffice/inventory/inventory.module.css";

function stockClass(stock: number) {
  if (stock <= 5) return `${styles.badge} ${styles.low}`;
  if (stock <= 15) return `${styles.badge} ${styles.warning}`;
  return `${styles.badge} ${styles.healthy}`;
}

function stockLabel(stock: number) {
  if (stock <= 5) return "Bajo";
  if (stock <= 15) return "Atención";
  return "Saludable";
}

export default function ProductsPage() {
  const { authFetch } = useAuth();
  const [products, setProducts] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    listProducts(authFetch)
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el inventario.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authFetch]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Inventario</p>
          <h1 className={styles.title}>SKUs</h1>
          <p className={styles.description}>Existencias actuales por SKU y almacén.</p>
        </div>
        <div className={styles.actions}>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/backoffice/inventory/orders/inbound">
            Registrar entrada
          </Link>
          <Link className={styles.button} href="/backoffice/inventory/orders/outbound">
            Registrar salida
          </Link>
        </div>
      </header>

      <InventoryNav />

      {loading && <p className={styles.state} role="status">Cargando inventario...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {!loading && !error && products.length === 0 && (
        <div className={styles.state}>
          <h2 className={styles.stateTitle}>No hay SKUs cargados</h2>
          <p className={styles.stateText}>
            La API respondió correctamente, pero no devolvió productos. Verificá que el seed de inventario esté cargado en el backend.
          </p>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Producto / SKU</th>
                <th scope="col">Cliente</th>
                <th scope="col">Categoría</th>
                <th scope="col">Almacén</th>
                <th scope="col">Stock actual</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <span className={styles.primaryCell}>{product.name}</span>
                    <span className={styles.secondaryCell}>{product.sku}</span>
                  </td>
                  <td>{product.client_name}</td>
                  <td>{product.category}</td>
                  <td><span className={styles.warehouseTag}>{product.warehouse}</span></td>
                  <td>
                    <span className={stockClass(product.current_stock)}>
                      {product.current_stock} · {stockLabel(product.current_stock)}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link
                        className={styles.actionLink}
                        href={`/backoffice/inventory/orders/inbound?productId=${product.id}`}
                      >
                        Entrada
                      </Link>
                      <Link
                        className={styles.actionLink}
                        href={`/backoffice/inventory/orders/outbound?productId=${product.id}`}
                      >
                        Salida
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}