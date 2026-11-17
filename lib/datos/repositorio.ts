/**
 * Interfaz única de acceso a nutec_marts.
 *
 * Devuelve solo cantidades sumables, ya agrupadas; los porcentajes y promedios
 * se calculan después, en un solo lugar (lib/metricas.ts). Toda consulta
 * recibe un rango de fechas: las tablas de hechos están particionadas por
 * `fecha` y una consulta sin ese filtro recorre la tabla completa.
 */

import type { FechaISO } from "@/lib/fechas";
import type { SumasGa4, SumasGsc } from "@/lib/metricas";
import type { Fuente, Ventana } from "@/lib/periodos";
import type { DimCluster, DimKeyword, FactRankDaily } from "@/lib/datos/tipos";

export type FilaGscDia = SumasGsc & { fecha: FechaISO };
export type FilaGscPagina = SumasGsc & { path: string; url_completa: string };
export type FilaGa4Dia = SumasGa4 & { fecha: FechaISO };
export type FilaGa4Pagina = SumasGa4 & { path: string };

export interface RepositorioMarts {
  /** Último día con datos de la fuente, buscado en los últimos días (con filtro de fecha). */
  ultimoDia(fuente: Fuente, hoy: FechaISO): Promise<FechaISO | null>;

  /** fact_gsc_sitio_dia sumada por día (todos los países y dispositivos). */
  gscSitioPorDia(v: Ventana): Promise<FilaGscDia[]>;
  /** fact_gsc_pagina_dia sumada por página. */
  gscPorPagina(v: Ventana): Promise<FilaGscPagina[]>;

  /** fact_ga4_pagina_dia de un canal, sumada por día. */
  ga4PorDia(v: Ventana, canal: string): Promise<FilaGa4Dia[]>;
  /** fact_ga4_pagina_dia de un canal, sumada por página de entrada. */
  ga4PorPagina(v: Ventana, canal: string): Promise<FilaGa4Pagina[]>;

  /** dim_cluster completa (tres filas; tabla de dimensión, sin partición). */
  clusters(): Promise<DimCluster[]>;
  /** dim_keyword completa (las búsquedas rastreadas). */
  keywords(): Promise<DimKeyword[]>;
  /** fact_rank_daily del rango: una fila por búsqueda y día medido. */
  rankDiario(v: Ventana): Promise<FactRankDaily[]>;

}
