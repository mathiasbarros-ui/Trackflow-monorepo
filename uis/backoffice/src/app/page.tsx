"use client";

import { usePreferences } from "@/hooks/usePreferences";

import Link from "next/link";


export default function Home() {
  const { t } = usePreferences();

  return (

    <main className="container">

      <section className="hero">

        <span className="eyebrow">
          TRACKFLOW DIGITAL
        </span>


        <h1>{t(" Backoffice operativo ")}</h1>


        <p>{t(" Herramientas internas para gestión y análisis de operaciones. ")}</p>


        <Link
          href="/incidents"
          className="button"
        >{t(" Analizar incidencias ")}</Link>

        <Link
          href="/suppliers"
          className="button"
        >{t(" Administrar proveedores ")}</Link>

        <Link
          href="/incidents"
          className="button"
          style={{ marginLeft: "12px" }}
        >{t(" Analizar incidencias ")}</Link>

      </section>

    </main>

  );

}
