/**
 * Filas de las tablas de nutec_marts, con los mismos nombres de columna.
 * Fuente: docs/01_Analitica_Modelo_Datos_BigQuery.md, sección 4.
 *
 * Las columnas DATE se representan como texto ISO ("2026-11-05").
 */

import type { FechaISO } from "@/lib/fechas";

// ── Dimensiones ───────────────────────────────────────────────────────────

export type DimCluster = {
  cluster_id: string;
  numero: number;
  nombre: string;
  /** Familia de producto que agrupa varios clusters (por ejemplo "Blankets"); vacío si va solo. */
  familia: string | null;
  etiqueta_semrush: string;
  url_objetivo: string;
  path_objetivo: string;
};

export type DimKeyword = {
  /** Identificador de la búsqueda en SEMrush (campo Pi), como texto. */
  keyword_id: string;
  cluster_id: string;
  keyword: string;
  rol: "primaria" | "secundaria" | "variante";
  /** Búsquedas mensuales estimadas por SEMrush. */
  volumen: number | null;
};

export type TipoPagina = "home" | "categoria" | "producto" | "blog" | "otro";

export type DimPagina = {
  path: string;
  url_completa: string;
  tipo: TipoPagina;
  /** Vacío a propósito cuando la página no pertenece a ningún cluster. */
  cluster_id: string | null;
};

// ── Hechos de SEMrush ─────────────────────────────────────────────────────

/**
 * Una fila por búsqueda y día medido. Sin fila = ese día no se midió;
 * `posicion` vacía = se midió y NUTEC no apareció en el top 100.
 * `citado_en_aio` vacío = no se verificó; false = verificado sin cita.
 */
export type FactRankDaily = {
  fecha: FechaISO;
  keyword_id: string;
  dispositivo: string;
  posicion: number | null;
  url_rankeada: string | null;
  path_rankeado: string | null;
  serp_tiene_aio: boolean | null;
  citado_en_aio: boolean | null;
  aio_verificado: boolean;
  fuente: string;
};

// ── Hechos de Search Console (ya filtrados a search_type = 'web') ─────────

export type FactGscSitioDia = {
  fecha: FechaISO;
  pais: string;
  dispositivo: string;
  impresiones: number;
  clics: number;
  posicion_gsc: number;
};

export type FactGscPaginaDia = FactGscSitioDia & {
  path: string;
  url_completa: string;
};

// ── Hechos de GA4 (por página de entrada) ─────────────────────────────────

export type FactGa4PaginaDia = {
  fecha: FechaISO;
  /** Página de entrada (landingPage), normalizada. */
  path: string;
  canal: string;
  sesiones: number;
  sesiones_con_engagement: number;
  conversiones: number;
  sesiones_con_conversion: number;
  /** userEngagementDuration de GA4: segundos de interacción de esas sesiones. */
  segundos_interaccion: number;
};

// ── Valores acordados con analítica ───────────────────────────────────────

/** Valor de `canal` para búsqueda orgánica (sessionDefaultChannelGroup de GA4). */
export const CANAL_ORGANICO = "Organic Search";
