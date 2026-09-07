import type {
  Metadata
} from "next";
import type {
  ReactNode
} from "react";

import AppShell from "@/components/auth/AppShell";
import Providers from "@/app/providers";

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
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>

      </body>

    </html>

  );

}
