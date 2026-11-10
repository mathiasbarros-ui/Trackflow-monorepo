"use client";

import { usePreferences } from "@/hooks/usePreferences";

import { useEffect, useState } from "react";

import InventoryNav from "@/components/inventory/InventoryNav";
import { useAuth } from "@/hooks/useAuth";
import { listOrders } from "@/lib/inventory";
import type { StockMovement } from "@/types/inventory";
import styles from "@/app/backoffice/inventory/inventory.module.css";

export default function OrdersPage() {
  const { t, language } = usePreferences();
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
          <p className={styles.eyebrow}>{t("Inventario / Movimientos")}</p>
          <h1 className={styles.title}>{t("Historial")}</h1>
          <p className={styles.description}>{t("Movimientos registrados. Esta vista es de solo lectura.")}</p>
        </div>
      </header>
      <InventoryNav />

      {loading && <p className={styles.state} role="status">{t("Cargando historial...")}</p>}
      {error && <p className={styles.error} role="alert">{t(error)}</p>}
      {!loading && !error && sortedOrders.length === 0 && (
        <p className={styles.state}>{t("Todavía no hay movimientos de inventario.")}</p>
      )}

      {!loading && !error && sortedOrders.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t("Producto / SKU")}</th>
                <th scope="col">{t("Almacén")}</th>
                <th scope="col">{t("Cantidad")}</th>
                <th scope="col">{t("Movimiento")}</th>
                <th scope="col">{t("Fecha")}</th>
                <th scope="col">{t("Usuario")}</th>
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
                      {order.movement_type === "inbound" ? t("Entrada") : t("Salida")}
                    </span>
                  </td>
                  <td>{new Date(order.created_at).toLocaleString(language === "en" ? "en-US" : "es-AR")}</td>
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