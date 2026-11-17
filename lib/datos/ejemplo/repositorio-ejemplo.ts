import { sumarDias, type FechaISO } from "@/lib/fechas";
import { SUMAS_GA4_VACIAS, SUMAS_GSC_VACIAS, sumarGa4, sumarGsc, type SumasGa4, type SumasGsc } from "@/lib/metricas";
import type { Fuente, Ventana } from "@/lib/periodos";
import type { RepositorioMarts } from "@/lib/datos/repositorio";
import type { FactGa4PaginaDia, FactGscSitioDia } from "@/lib/datos/tipos";
import { generarMarts, type MartsDeEjemplo } from "@/lib/datos/ejemplo/generador";

/**
 * Implementación en memoria de RepositorioMarts sobre los datos de ejemplo.
 * Aplica exactamente los mismos filtros y agrupaciones que las consultas de
 * BigQuery (lib/datos/bigquery.ts), para que cambiar de fuente no cambie cifras.
 */

const cache = new Map<FechaISO, MartsDeEjemplo>();

function marts(hoy: FechaISO): MartsDeEjemplo {
  let m = cache.get(hoy);
  if (!m) {
    m = generarMarts(hoy);
    cache.clear();
    cache.set(hoy, m);
  }
  return m;
}

/** El repositorio de ejemplo trabaja siempre sobre los datos generados para "hoy". */
export function crearRepositorioEjemplo(hoy: FechaISO): RepositorioMarts {
  const m = () => marts(hoy);
  const enVentana = (f: { fecha: FechaISO }, v: Ventana) => f.fecha >= v.desde && f.fecha <= v.hasta;

  const gsc = (f: FactGscSitioDia): SumasGsc => ({
    impresiones: f.impresiones,
    clics: f.clics,
    posicionPorImpresiones: f.posicion_gsc * f.impresiones,
  });
  const ga4 = (f: FactGa4PaginaDia): SumasGa4 => ({
    sesiones: f.sesiones,
    sesionesConEngagement: f.sesiones_con_engagement,
    conversiones: f.conversiones,
    sesionesConConversion: f.sesiones_con_conversion,
    segundosInteraccion: f.segundos_interaccion,
  });

  function agrupar<F, S>(filas: F[], llave: (f: F) => string, sumas: (f: F) => S, sumar: (a: S, b: S) => S, vacio: S) {
    const grupos = new Map<string, { primera: F; s: S }>();
    for (const f of filas) {
      const k = llave(f);
      const g = grupos.get(k);
      if (g) g.s = sumar(g.s, sumas(f));
      else grupos.set(k, { primera: f, s: sumar(vacio, sumas(f)) });
    }
    return [...grupos.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, g]) => g);
  }

  return {
    async ultimoDia(fuente: Fuente, diaHoy: FechaISO) {
      const desde = sumarDias(diaHoy, -45);
      const filas: { fecha: FechaISO }[] =
        fuente === "gsc" ? m().fact_gsc_sitio_dia : fuente === "ga4" ? m().fact_ga4_pagina_dia : m().fact_rank_daily;
      let ultimo: FechaISO | null = null;
      for (const f of filas) if (f.fecha >= desde && f.fecha <= diaHoy && (!ultimo || f.fecha > ultimo)) ultimo = f.fecha;
      return ultimo;
    },

    async gscSitioPorDia(v) {
      const filas = m().fact_gsc_sitio_dia.filter((f) => enVentana(f, v));
      return agrupar(filas, (f) => f.fecha, gsc, sumarGsc, SUMAS_GSC_VACIAS).map((g) => ({ fecha: g.primera.fecha, ...g.s }));
    },

    async gscPorPagina(v) {
      const filas = m().fact_gsc_pagina_dia.filter((f) => enVentana(f, v));
      return agrupar(filas, (f) => f.path, gsc, sumarGsc, SUMAS_GSC_VACIAS).map((g) => ({
        path: g.primera.path,
        url_completa: g.primera.url_completa,
        ...g.s,
      }));
    },

    async ga4PorDia(v, canal) {
      const filas = m().fact_ga4_pagina_dia.filter((f) => enVentana(f, v) && f.canal === canal);
      return agrupar(filas, (f) => f.fecha, ga4, sumarGa4, SUMAS_GA4_VACIAS).map((g) => ({ fecha: g.primera.fecha, ...g.s }));
    },

    async clusters() {
      return m().dim_cluster;
    },

    async keywords() {
      return m().dim_keyword;
    },

    async rankDiario(v) {
      return m().fact_rank_daily.filter((f) => enVentana(f, v));
    },

    async ga4PorPagina(v, canal) {
      const filas = m().fact_ga4_pagina_dia.filter((f) => enVentana(f, v) && f.canal === canal);
      return agrupar(filas, (f) => f.path, ga4, sumarGa4, SUMAS_GA4_VACIAS).map((g) => ({ path: g.primera.path, ...g.s }));
    },
  };
}
