"use client";

import { useEffect, useState } from "react";

import InventoryNav from "@/components/inventory/InventoryNav";
import { useAuth } from "@/hooks/useAuth";
import { listOrders } from "@/lib/inventory";
import type { StockMovement } from "@/types/inventory";
import styles from "@/app/backoffice/inventory/inventory.module.css";

export default function OrdersPage() {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    listOrders(authFetch)
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authFetch]);

  const sortedOrders = [...orders].sort(
    (first, second) => Date.parse(second.created_at) - Date.parse(first.created_at),
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Inventario / Movimientos</p>
          <h1 className={styles.title}>Historial</h1>
          <p className={styles.description}>Movimientos registrados. Esta vista es de solo lectura.</p>
        </div>
      </header>
      <InventoryNav />

      {loading && <p className={styles.state} role="status">Cargando historial...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && sortedOrders.length === 0 && (
        <p className={styles.state}>Todavía no hay movimientos de inventario.</p>
      )}

      {!loading && !error && sortedOrders.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Producto / SKU</th>
                <th scope="col">Almacén</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Movimiento</th>
                <th scope="col">Fecha</th>
                <th scope="col">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => (
                <tr key={`${order.movement_type}-${order.id}`}>
                  <td>
                    <span className={styles.primaryCell}>{order.sku.name}</span>
                    <span className={styles.secondaryCell}>{order.sku.sku}</span>
                  </td>
                  <td><span className={styles.warehouseTag}>{order.sku.warehouse}</span></td>
                  <td>{order.quantity}</td>
                  <td>
                    <span className={`${styles.movementTag} ${order.movement_type === "inbound" ? styles.movementInbound : styles.movementOutbound}`}>
                      {order.movement_type === "inbound" ? "Entrada" : "Salida"}
                    </span>
                  </td>
                  <td>{new Date(order.created_at).toLocaleString("es-AR")}</td>
                  <td>{order.user_uuid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}