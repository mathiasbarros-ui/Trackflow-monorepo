"use client";

import { usePreferences } from "@/components/Preferences";

import Link from "next/link";

export default function Home() {
  const { t } = usePreferences();
  return (
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" />{t(" ALMACENES Y ÚLTIMA MILLA PARA E-COMMERCE")}</p>
          <h1>{t("Tu marca vende.")}<br />{t("La logística,")}<br /><span>{t("con TrackFlow.")}</span></h1>
          <p className="hero-description">{t("Detrás de cada compra hay una promesa de entrega. Gestionamos el almacén y la última milla de marcas de e-commerce en Los Ángeles y Zaragoza, conectando sus productos con quienes los esperan.")}</p>
          <div className="hero-note"><span className="check-mark">✓</span>{t(" Dos almacenes. Más de 2.000 envíos por semana.")}</div>
        </div>
        <div className="flow-visual" aria-label={t("Recorrido de tus productos desde el almacén hasta tu hogar")}>
          <div className="visual-top"><span className="status-dot" />{t(" TUS PRODUCTOS, EN BUEN CAMINO ")}<span>01 — 03</span></div>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="flow-center" aria-hidden="true">tf<span>↗</span></div>
          <div className="float-card report-card"><span className="card-icon">↗</span><div><strong>{t("Los Ángeles · LA")}</strong><small>{t("Nuestro punto en EE. UU.")}</small></div></div>
          <div className="float-card team-card"><span className="card-icon dark">◎</span><div><strong>Zaragoza · ZGZ</strong><small>{t("Conectados desde España")}</small></div></div>
          <div className="visual-bottom"><strong>{t("Del almacén a tu casa.")}</strong><span aria-hidden="true">↗</span></div>
        </div>
      </section>
      <section className="value-band"><div className="container value-content"><span>{t("Inventario con orden.")}</span><span>{t("Transportistas con criterio.")}</span><span>{t("Última milla con propósito.")}</span></div></section>
      <section id="como-funciona" className="container section">
        <div className="section-heading"><div><p className="eyebrow">{t("EL MOTOR DETRÁS DE CADA PEDIDO")}</p><h2>{t("Del stock disponible")}<br />{t("a la entrega final.")}</h2></div><p>{t("Espacio, coordinación y distribución.")}<br />{t("Cada etapa tiene su trabajo.")}</p></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">{t("01 / GESTIÓN DE ALMACENES")}</span><h3>{t("Cada unidad cuenta.")}</h3><p>{t("Moda, electrónica, cosmética y hogar: productos distintos necesitan una operación organizada. Gestionamos existencias, ubicaciones y movimientos para conectar lo que entra al almacén con lo que sale hacia el cliente.")}</p></article>
          <article className="step-card featured"><span className="step-number">{t("02 / COORDINACIÓN LOGÍSTICA")}</span><h3>{t("No todos los envíos son iguales.")}</h3><p>{t("El peso, la distancia y la urgencia cambian de un pedido a otro. Nuestro trabajo es coordinar transportistas teniendo en cuenta costo, velocidad y confiabilidad, sin olvidar el cuidado que requieren los productos frágiles.")}</p></article>
          <article className="step-card"><span className="step-number">{t("03 / ÚLTIMA MILLA")}</span><h3>{t("El último tramo importa.")}</h3><p>{t("Una compra no termina al salir del almacén. Gestionamos la entrega final al cliente y, si surge un inconveniente, podés registrar una incidencia con su número de referencia para que nuestro equipo la identifique.")}</p><Link href="/incidents/new">{t("Necesito ayuda con mi pedido ↗")}</Link></article>
        </div>
      </section>
      <section id="nuestras-regiones" className="container section">
        <div className="section-heading"><div><p className="eyebrow">{t("PRESENCIA EN DOS MERCADOS")}</p><h2>{t("Los Ángeles y Zaragoza.")}<br />{t("Una misma forma de operar.")}</h2></div><p>{t("Estados Unidos y España.")}<br />{t("Logística cerca de cada operación.")}</p></div>
        <div className="steps-grid">
          <article className="step-card"><span className="step-number">{t("LA / ESTADOS UNIDOS")}</span><h3>{t("Los Ángeles.")}</h3><p>{t("Nuestro almacén en Estados Unidos forma parte de la operación de TrackFlow para marcas de e-commerce. Aquí se unen la gestión del inventario y la coordinación de pedidos para clientes del mercado estadounidense.")}</p></article>
          <article className="step-card"><span className="step-number">{t("ZGZ / ESPAÑA")}</span><h3>Zaragoza.</h3><p>{t("Desde nuestro almacén en Zaragoza gestionamos productos y entregas en España. Otra ubicación, el mismo reto: organizar las existencias y conectar cada pedido con su destino final.")}</p></article>
          <article id="nuestro-enfoque" className="step-card featured"><span className="step-number">{t("TRACKFLOW TECH / TRANSFORMACIÓN DIGITAL")}</span><h3>{t("Menos tareas manuales.")}<br />{t("Más foco en la operación.")}</h3><p>{t("Nuestro equipo de tecnología impulsa la digitalización del inventario, los costos de envío y la selección de transportistas. El objetivo: dar a gerentes y coordinadores mejores herramientas para trabajar con miles de pedidos.")}</p><Link href="/register">{t("Creá tu cuenta en TrackFlow ↗")}</Link></article>
        </div>
      </section>
      <section className="container"><div className="cta-panel"><div><p className="eyebrow">{t("DETRÁS DEL PEDIDO, HAY PERSONAS")}</p><h2>{t("Si algo se frena,")}<br />{t("contanos qué pasó.")}</h2></div><Link className="button button-dark" href="/incidents/new">{t("Reportar un problema con mi pedido ↗")}</Link></div></section>
    </main>
  );
}
