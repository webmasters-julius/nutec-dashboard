import "server-only";

import { BigQuery, type Query } from "@google-cloud/bigquery";
import { cacheLife } from "next/cache";
import type { FechaISO } from "@/lib/fechas";
import type { Fuente, Ventana } from "@/lib/periodos";
import type {
  FilaGa4Dia,
  FilaGa4Pagina,
  FilaGscDia,
  FilaGscPagina,
  RepositorioMarts,
} from "@/lib/datos/repositorio";
import type { DimCluster, DimKeyword, FactRankDaily } from "@/lib/datos/tipos";

/**
 * Acceso a BigQuery. Solo se ejecuta en el servidor: el navegador nunca recibe
 * credenciales ni consulta BigQuery. La aplicación lee únicamente nutec_marts.
 *
 * Variables de entorno:
 *   BQ_PROJECT_ID            proyecto de Google Cloud
 *   BQ_DATASET               por defecto "nutec_marts"
 *   BQ_LOCATION              ubicación del dataset (opcional)
 *   BQ_CREDENTIALS_JSON      JSON de la cuenta de servicio (opcional; si no,
 *                            se usa GOOGLE_APPLICATION_CREDENTIALS)
 */

/** Cuántos días hacia atrás se busca el último día con datos. */
const DIAS_BUSQUEDA_ULTIMO_DIA = 45;

let cliente: BigQuery | null = null;

function bigquery(): BigQuery {
  if (cliente) return cliente;
  const projectId = process.env.BQ_PROJECT_ID;
  if (!projectId) throw new Error("Falta BQ_PROJECT_ID para consultar BigQuery.");
  const json = process.env.BQ_CREDENTIALS_JSON;
  cliente = new BigQuery({
    projectId,
    location: process.env.BQ_LOCATION || undefined,
    credentials: json ? leerCredenciales(json) : undefined,
  });
  return cliente;
}

/** El error de JSON.parse cita parte del texto: no debe llegar a los registros con un pedazo de la llave. */
function leerCredenciales(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error("BQ_CREDENTIALS_JSON no es un JSON válido. Pega la llave completa de la cuenta de servicio en una sola línea.");
  }
}

/** Tope de bytes que puede leer una consulta; si lo rebasa, BigQuery la rechaza sin cobrarla. */
const BYTES_MAXIMOS = process.env.BQ_MAX_BYTES_BILLED || String(2 * 1024 ** 3);

function tabla(nombre: string): string {
  const dataset = process.env.BQ_DATASET || "nutec_marts";
  if (!dataset.startsWith("nutec_marts")) {
    // La aplicación nunca lee staging, raw ni el dataset de Fivetran.
    throw new Error(`Dataset no permitido: ${dataset}. La aplicación solo lee nutec_marts.`);
  }
  return `\`${process.env.BQ_PROJECT_ID}.${dataset}.${nombre}\``;
}

/** Convierte DATE de BigQuery ({ value: "2026-11-02" }) a texto ISO. */
function aFecha(valor: unknown): FechaISO {
  if (valor && typeof valor === "object" && "value" in valor) return String((valor as { value: string }).value);
  return String(valor);
}

const n = (v: unknown) => Number(v ?? 0);

async function consultar<T>(query: Query): Promise<T[]> {
  const [filas] = await bigquery().query({ ...query, useLegacySql: false, maximumBytesBilled: BYTES_MAXIMOS });
  return filas as T[];
}

const TABLA_ULTIMO_DIA: Record<Fuente, string> = {
  gsc: "fact_gsc_sitio_dia",
  ga4: "fact_ga4_pagina_dia",
  semrush: "fact_rank_daily",
};

async function ultimoDia(fuente: Fuente, hoy: FechaISO): Promise<FechaISO | null> {
  "use cache";
  cacheLife("hours");
  const filas = await consultar<{ ultimo: unknown }>({
    query: `SELECT MAX(fecha) AS ultimo FROM ${tabla(TABLA_ULTIMO_DIA[fuente])}
            WHERE fecha BETWEEN DATE_SUB(@hoy, INTERVAL ${DIAS_BUSQUEDA_ULTIMO_DIA} DAY) AND @hoy`,
    params: { hoy },
    types: { hoy: "DATE" },
  });
  return filas[0]?.ultimo ? aFecha(filas[0].ultimo) : null;
}

const SUMAS_GSC = `SUM(impresiones) AS impresiones, SUM(clics) AS clics,
                   SUM(posicion_gsc * impresiones) AS posicion_por_impresiones`;
const SUMAS_GA4 = `SUM(sesiones) AS sesiones, SUM(sesiones_con_engagement) AS sesiones_con_engagement,
                   SUM(conversiones) AS conversiones, SUM(sesiones_con_conversion) AS sesiones_con_conversion,
                   SUM(segundos_interaccion) AS segundos_interaccion`;

type CrudaGsc = { impresiones: unknown; clics: unknown; posicion_por_impresiones: unknown };
type CrudaGa4 = {
  sesiones: unknown;
  sesiones_con_engagement: unknown;
  conversiones: unknown;
  sesiones_con_conversion: unknown;
  segundos_interaccion: unknown;
};

const sumasGsc = (f: CrudaGsc) => ({
  impresiones: n(f.impresiones),
  clics: n(f.clics),
  posicionPorImpresiones: n(f.posicion_por_impresiones),
});
const sumasGa4 = (f: CrudaGa4) => ({
  sesiones: n(f.sesiones),
  sesionesConEngagement: n(f.sesiones_con_engagement),
  conversiones: n(f.conversiones),
  sesionesConConversion: n(f.sesiones_con_conversion),
  segundosInteraccion: n(f.segundos_interaccion),
});

const RANGO = { types: { desde: "DATE", hasta: "DATE" } } as const;

async function gscSitioPorDia(v: Ventana): Promise<FilaGscDia[]> {
  "use cache";
  cacheLife("hours");
  const filas = await consultar<CrudaGsc & { fecha: unknown }>({
    query: `SELECT fecha, ${SUMAS_GSC} FROM ${tabla("fact_gsc_sitio_dia")}
            WHERE fecha BETWEEN @desde AND @hasta GROUP BY fecha ORDER BY fecha`,
    params: { desde: v.desde, hasta: v.hasta },
    ...RANGO,
  });
  return filas.map((f) => ({ fecha: aFecha(f.fecha), ...sumasGsc(f) }));
}

async function gscPorPagina(v: Ventana): Promise<FilaGscPagina[]> {
  "use cache";
  cacheLife("hours");
  const filas = await consultar<CrudaGsc & { path: string; url_completa: string }>({
    query: `SELECT path, ANY_VALUE(url_completa) AS url_completa, ${SUMAS_GSC}
            FROM ${tabla("fact_gsc_pagina_dia")}
            WHERE fecha BETWEEN @desde AND @hasta GROUP BY path`,
    params: { desde: v.desde, hasta: v.hasta },
    ...RANGO,
  });
  return filas.map((f) => ({ path: f.path, url_completa: f.url_completa, ...sumasGsc(f) }));
}

async function ga4PorDia(v: Ventana, canal: string): Promise<FilaGa4Dia[]> {
  "use cache";
  cacheLife("hours");
  const filas = await consultar<CrudaGa4 & { fecha: unknown }>({
    query: `SELECT fecha, ${SUMAS_GA4} FROM ${tabla("fact_ga4_pagina_dia")}
            WHERE fecha BETWEEN @desde AND @hasta AND canal = @canal GROUP BY fecha ORDER BY fecha`,
    params: { desde: v.desde, hasta: v.hasta, canal },
    types: { ...RANGO.types, canal: "STRING" },
  });
  return filas.map((f) => ({ fecha: aFecha(f.fecha), ...sumasGa4(f) }));
}

async function ga4PorPagina(v: Ventana, canal: string): Promise<FilaGa4Pagina[]> {
  "use cache";
  cacheLife("hours");
  const filas = await consultar<CrudaGa4 & { path: string }>({
    query: `SELECT path, ${SUMAS_GA4} FROM ${tabla("fact_ga4_pagina_dia")}
            WHERE fecha BETWEEN @desde AND @hasta AND canal = @canal GROUP BY path`,
    params: { desde: v.desde, hasta: v.hasta, canal },
    types: { ...RANGO.types, canal: "STRING" },
  });
  return filas.map((f) => ({ path: f.path, ...sumasGa4(f) }));
}

// ── SEMrush ───────────────────────────────────────────────────────────────

/** Tabla de dimensión (tres filas): no está particionada por fecha. */
async function clusters(): Promise<DimCluster[]> {
  "use cache";
  cacheLife("hours");
  return consultar<DimCluster>({
    query: `SELECT cluster_id, numero, nombre, familia, etiqueta_semrush, url_objetivo, path_objetivo
            FROM ${tabla("dim_cluster")} ORDER BY numero`,
  });
}

/** Tabla de dimensión (las búsquedas rastreadas): no está particionada por fecha. */
async function keywords(): Promise<DimKeyword[]> {
  "use cache";
  cacheLife("hours");
  const filas = await consultar<Omit<DimKeyword, "volumen"> & { volumen: unknown }>({
    query: `SELECT keyword_id, cluster_id, keyword, rol, volumen FROM ${tabla("dim_keyword")}`,
  });
  return filas.map((f) => ({ ...f, keyword_id: String(f.keyword_id), volumen: f.volumen === null ? null : n(f.volumen) }));
}

async function rankDiario(v: Ventana): Promise<FactRankDaily[]> {
  "use cache";
  cacheLife("hours");
  const filas = await consultar<Omit<FactRankDaily, "fecha" | "posicion"> & { fecha: unknown; posicion: unknown }>({
    query: `SELECT fecha, keyword_id, dispositivo, posicion, url_rankeada, path_rankeado,
                   serp_tiene_aio, citado_en_aio, aio_verificado, fuente
            FROM ${tabla("fact_rank_daily")}
            WHERE fecha BETWEEN @desde AND @hasta AND dispositivo = @dispositivo`,
    // La llave de la tabla incluye el dispositivo: sin este filtro, el día en
    // que se rastree también en celular cada búsqueda contaría dos veces.
    params: { desde: v.desde, hasta: v.hasta, dispositivo: "desktop" },
    types: { ...RANGO.types, dispositivo: "STRING" },
  });
  return filas.map((f) => ({
    ...f,
    fecha: aFecha(f.fecha),
    keyword_id: String(f.keyword_id),
    posicion: f.posicion === null || f.posicion === undefined ? null : n(f.posicion),
  }));
}

export const repositorioBigQuery: RepositorioMarts = {
  ultimoDia,
  gscSitioPorDia,
  gscPorPagina,
  ga4PorDia,
  ga4PorPagina,
  clusters,
  keywords,
  rankDiario,
};
