import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "@/styles/globals.css";
import { Proveedores } from "@/components/nutec/proveedores";
import { ClerkProvider } from "@clerk/nextjs";
import { esMX } from "@clerk/localizations";
import { ACCESO_ACTIVO, RUTA_INGRESO, RUTA_REGISTRO } from "@/lib/acceso";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Dashboard SEO · NUTEC",
  description: "Desempeño orgánico de NUTEC en Google: Search Console, GA4 y SEMrush.",
  // Tablero privado: que ningún buscador lo indexe.
  robots: { index: false, follow: false },
};

// Tema de BoardUI: aplica la clase .dark antes de pintar, según la preferencia guardada.
const scriptTema =
  '(function(){try{var dark=localStorage.getItem("boardui:theme")==="dark";document.documentElement.classList.toggle("dark",dark)}catch(e){document.documentElement.classList.remove("dark")}})();';

export default function RootLayout({ children }: LayoutProps<"/">) {
  const contenido = <Proveedores>{children}</Proveedores>;
  return (
    <html lang="es-MX" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-background-full">
        <Script id="boardui-theme" strategy="beforeInteractive">
          {scriptTema}
        </Script>
        {ACCESO_ACTIVO ? (
          <ClerkProvider localization={esMX} signInUrl={RUTA_INGRESO} signUpUrl={RUTA_REGISTRO}>
            {contenido}
          </ClerkProvider>
        ) : (
          contenido
        )}
      </body>
    </html>
  );
}
