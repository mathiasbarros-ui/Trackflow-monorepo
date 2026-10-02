"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "@/app/backoffice/inventory/inventory.module.css";

const inventoryRoutes = [
  { href: "/backoffice/inventory/products", label: "Productos" },
  { href: "/backoffice/inventory/orders/inbound", label: "Nueva entrada" },
  { href: "/backoffice/inventory/orders/outbound", label: "Nueva salida" },
  { href: "/backoffice/inventory/orders", label: "Historial" },
];

export default function InventoryNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de inventario" className={styles.nav}>
      {inventoryRoutes.map(({ href, label }) => {
        const isCurrent = pathname === href;

        return (
          <Link
            aria-current={isCurrent ? "page" : undefined}
            className={isCurrent ? styles.navLinkActive : styles.navLink}
            href={href}
            key={href}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}