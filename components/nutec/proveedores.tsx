"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "react-aria-components";
import { LOCALE } from "@/lib/formato";

/**
 * Configuración regional es-MX para los componentes de React Aria (fechas,
 * calendario, números). Los textos de control de BoardUI (Cancelar, Aplicar,
 * etc.) se tradujeron directamente en cada componente instalado.
 */
export function Proveedores({ children }: { children: ReactNode }) {
  return <I18nProvider locale={LOCALE}>{children}</I18nProvider>;
}
