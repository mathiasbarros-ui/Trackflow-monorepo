import type {
  Metadata
} from "next";
import type {
  ReactNode
} from "react";


import Link from "next/link";

import "./globals.css";


export const metadata: Metadata = {

  title:
    "Trackflow Backoffice",

  description:
    (
      "Panel interno "
      + "de Trackflow"
    ),

};


export default function RootLayout({

  children,

}: Readonly<{

  children:
    ReactNode;

}>) {

  return (

    <html lang="es">

      <body>

        <nav className="navbar">

          <div className="navContent">

            <Link
              href="/"
              className="logo"
            >
              TRACKFLOW
            </Link>


            <div className="navLinks">

              <Link href="/">
                Inicio
              </Link>

              <Link href="/incidents">
                Incidencias
              </Link>

              <Link href="/suppliers">
                Proveedores
              </Link>

            </div>

          </div>

        </nav>


        {children}

      </body>

    </html>

  );

}
