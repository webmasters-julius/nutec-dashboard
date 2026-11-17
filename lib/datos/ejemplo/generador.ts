/**
 * Datos de ejemplo con la estructura exacta de nutec_marts, para trabajar
 * mientras analítica termina las tablas. Son deterministas: la misma fecha de
 * "hoy" produce siempre las mismas filas.
 *
 * Casos difíciles incluidos a propósito:
 * - Retrasos reales: Search Console llega hasta hace 3 días y GA4 hasta ayer.
 * - Un día sin datos de GA4 (14 de octubre de 2026): ninguna fila ese día.
 * - Una página solo en GA4 (/es/productos/mantas-ceramicas) y una solo en
 *   Search Console (/blog/ceramic-fiber-vs-mineral-wool).
 * - Páginas sin cluster (cluster_id vacío).
 * - Búsquedas ocultas por privacidad: el total del sitio es mayor que la suma
 *   por página, y hay países que solo aparecen en el total del sitio.
 * - Canales de GA4 distintos del orgánico, que el resumen no debe sumar.
 */

import { diasDelRango, sumarDias, type FechaISO } from "@/lib/fechas";
import { PRIMER_DIA } from "@/lib/periodos";
import {
  CANAL_ORGANICO,
  type DimPagina,
  type FactGa4PaginaDia,
  type FactGscPaginaDia,
  type FactGscSitioDia,
  type TipoPagina,
} from "@/lib/datos/tipos";
import { generarSemrush, type MartsSemrush } from "@/lib/datos/ejemplo/generador-semrush";

export type MartsDeEjemplo = MartsSemrush & {
  dim_pagina: DimPagina[];
  fact_gsc_sitio_dia: FactGscSitioDia[];
  fact_gsc_pagina_dia: FactGscPaginaDia[];
  fact_ga4_pagina_dia: FactGa4PaginaDia[];
};

export const RETRASO_DIAS = { gsc: 3, ga4: 1 } as const;
export const DIA_SIN_DATOS_GA4: FechaISO = "2026-10-14";

const DOMINIO = "https://www.nutec.com";

type PerfilPagina = {
  path: string;
  tipo: TipoPagina;
  cluster: string | null;
  /** Impresiones diarias de base en Search Console (0 = no aparece en Search Console). */
  impresiones: number;
  ctr: number;
  posicion: number;
  /** Sesiones orgánicas diarias que no vienen de Google (otros buscadores) o sin clic registrado. */
  sesionesExtra: number;
  /** Proporción de sesiones con al menos una conversión. */
  conversion: number;
  /** Sesiones diarias de otros canales. */
  otrosCanales: number;
  /** La página aparece en Search Console pero GA4 no registra ninguna sesión que entre por ella. */
  sinSesiones?: true;
};

const PAGINAS: PerfilPagina[] = [
  { path: "/", tipo: "home", cluster: "1", impresiones: 950, ctr: 0.041, posicion: 7.8, sesionesExtra: 4, conversion: 0.018, otrosCanales: 40 },
  { path: "/products-engineering/blankets", tipo: "categoria", cluster: "2", impresiones: 640, ctr: 0.024, posicion: 13.6, sesionesExtra: 2, conversion: 0.022, otrosCanales: 6 },
  { path: "/products-engineering/blankets/maxwool-2300", tipo: "producto", cluster: "3", impresiones: 260, ctr: 0.021, posicion: 17.9, sesionesExtra: 1, conversion: 0.035, otrosCanales: 3 },
  { path: "/products/ceramic-fiber-blanket-8-pcf", tipo: "producto", cluster: "2", impresiones: 310, ctr: 0.019, posicion: 15.2, sesionesExtra: 1, conversion: 0.028, otrosCanales: 2 },
  { path: "/products/ceramic-fiber-board", tipo: "producto", cluster: null, impresiones: 220, ctr: 0.017, posicion: 19.4, sesionesExtra: 1, conversion: 0.02, otrosCanales: 2 },
  { path: "/products/ceramic-fiber-paper", tipo: "producto", cluster: null, impresiones: 140, ctr: 0.016, posicion: 21.1, sesionesExtra: 0.5, conversion: 0.015, otrosCanales: 1 },
  { path: "/products/vacuum-formed-shapes", tipo: "producto", cluster: null, impresiones: 90, ctr: 0.022, posicion: 16.3, sesionesExtra: 0.5, conversion: 0.04, otrosCanales: 1 },
  { path: "/products/insulating-fire-brick", tipo: "producto", cluster: null, impresiones: 120, ctr: 0.012, posicion: 27.5, sesionesExtra: 0.3, conversion: 0.01, otrosCanales: 1 },
  { path: "/blog/what-is-ceramic-fiber", tipo: "blog", cluster: null, impresiones: 820, ctr: 0.031, posicion: 9.2, sesionesExtra: 3, conversion: 0.004, otrosCanales: 3 },
  { path: "/blog/high-temperature-insulation-guide", tipo: "blog", cluster: null, impresiones: 540, ctr: 0.026, posicion: 11.8, sesionesExtra: 2, conversion: 0.006, otrosCanales: 2 },
  { path: "/blog/ceramic-fiber-blanket-density", tipo: "blog", cluster: "2", impresiones: 380, ctr: 0.028, posicion: 10.4, sesionesExtra: 1, conversion: 0.008, otrosCanales: 1 },
  // Solo en Search Console: aparece en Google pero no registra sesiones orgánicas.
  { path: "/blog/ceramic-fiber-vs-mineral-wool", tipo: "blog", cluster: null, impresiones: 160, ctr: 0.006, posicion: 24.8, sesionesExtra: 0, conversion: 0, otrosCanales: 0, sinSesiones: true },
  { path: "/industries/steel", tipo: "otro", cluster: null, impresiones: 110, ctr: 0.02, posicion: 18.7, sesionesExtra: 0.4, conversion: 0.03, otrosCanales: 1 },
  { path: "/industries/petrochemical", tipo: "otro", cluster: null, impresiones: 70, ctr: 0.018, posicion: 22.4, sesionesExtra: 0.3, conversion: 0.025, otrosCanales: 1 },
  { path: "/about-us", tipo: "otro", cluster: null, impresiones: 60, ctr: 0.05, posicion: 6.1, sesionesExtra: 0.5, conversion: 0.01, otrosCanales: 4 },
  { path: "/contact-us", tipo: "otro", cluster: null, impresiones: 45, ctr: 0.07, posicion: 4.3, sesionesExtra: 0.5, conversion: 0.22, otrosCanales: 5 },
  { path: "/request-a-quote", tipo: "otro", cluster: null, impresiones: 20, ctr: 0.06, posicion: 5.2, sesionesExtra: 0.4, conversion: 0.35, otrosCanales: 3 },
  { path: "/es", tipo: "home", cluster: null, impresiones: 180, ctr: 0.035, posicion: 9.6, sesionesExtra: 1, conversion: 0.012, otrosCanales: 4 },
  // Solo en GA4: recibe visitas orgánicas (por ejemplo, de otros buscadores) pero no aparece en Search Console.
  { path: "/es/productos/mantas-ceramicas", tipo: "producto", cluster: null, impresiones: 0, ctr: 0, posicion: 0, sesionesExtra: 1.2, conversion: 0.03, otrosCanales: 0 },
];

/** Combinaciones país-dispositivo que se desglosan por página, con su peso. */
const COMBOS_PAGINA: { pais: string; dispositivo: string; peso: number }[] = [
  { pais: "usa", dispositivo: "DESKTOP", peso: 0.46 },
  { pais: "usa", dispositivo: "MOBILE", peso: 0.18 },
  { pais: "mex", dispositivo: "DESKTOP", peso: 0.12 },
  { pais: "can", dispositivo: "DESKTOP", peso: 0.07 },
];
/** Países que solo aparecen en el total del sitio (muy pocas búsquedas para desglosar). */
const COMBOS_SOLO_SITIO: { pais: string; dispositivo: string; peso: number }[] = [
  { pais: "gbr", dispositivo: "DESKTOP", peso: 0.04 },
  { pais: "ind", dispositivo: "DESKTOP", peso: 0.05 },
  { pais: "deu", dispositivo: "MOBILE", peso: 0.03 },
];

const OTROS_CANALES = [
  { canal: "Direct", peso: 0.55 },
  { canal: "Paid Search", peso: 0.25 },
  { canal: "Referral", peso: 0.2 },
];

function generadorAleatorio(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sitio industrial: entre semana mucho más tráfico que en fin de semana. */
function factorDiaSemana(fecha: FechaISO): number {
  const d = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return d === 0 ? 0.38 : d === 6 ? 0.45 : 1;
}

function factorTendencia(fecha: FechaISO): number {
  const dias = (Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${PRIMER_DIA.gsc}T00:00:00Z`)) / 86_400_000;
  // Crecimiento suave, con un salto después de agosto (arranque de la estrategia).
  return 1 + dias * 0.0012 + (fecha >= "2026-08-15" ? 0.12 : 0);
}

export function generarMarts(hoy: FechaISO): MartsDeEjemplo {
  const azar = generadorAleatorio(20260101);
  const ruido = (amplitud: number) => 1 + (azar() * 2 - 1) * amplitud;

  const ultimoGsc = sumarDias(hoy, -RETRASO_DIAS.gsc);
  const ultimoGa4 = sumarDias(hoy, -RETRASO_DIAS.ga4);

  const fact_gsc_sitio_dia: FactGscSitioDia[] = [];
  const fact_gsc_pagina_dia: FactGscPaginaDia[] = [];
  const fact_ga4_pagina_dia: FactGa4PaginaDia[] = [];

  /** Clics de Google por página y día, para que las sesiones orgánicas sigan a los clics. */
  const clicsPorPaginaDia = new Map<string, number>();

  for (const fecha of diasDelRango(PRIMER_DIA.gsc, ultimoGa4)) {
    const base = factorDiaSemana(fecha) * factorTendencia(fecha);

    // Search Console
    if (fecha <= ultimoGsc) {
      const sitio = new Map<string, { impresiones: number; clics: number; posXImpr: number }>();
      for (const p of PAGINAS) {
        if (p.impresiones === 0) continue;
        let clicsDia = 0;
        for (const c of COMBOS_PAGINA) {
          const impresiones = Math.round(p.impresiones * c.peso * base * ruido(0.18));
          if (impresiones === 0) continue;
          const clics = Math.round(impresiones * p.ctr * ruido(0.35));
          const posicion = Math.max(1, p.posicion * ruido(0.08) - (fecha >= "2026-09-01" ? 0.8 : 0));
          fact_gsc_pagina_dia.push({
            fecha,
            pais: c.pais,
            dispositivo: c.dispositivo,
            impresiones,
            clics,
            posicion_gsc: Math.round(posicion * 10) / 10,
            path: p.path,
            url_completa: `${DOMINIO}${p.path === "/" ? "/" : p.path}`,
          });
          clicsDia += clics;
          const k = `${c.pais}|${c.dispositivo}`;
          const acc = sitio.get(k) ?? { impresiones: 0, clics: 0, posXImpr: 0 };
          acc.impresiones += impresiones;
          acc.clics += clics;
          acc.posXImpr += posicion * impresiones;
          sitio.set(k, acc);
        }
        clicsPorPaginaDia.set(`${fecha}|${p.path}`, clicsDia);
      }
      // Total del sitio: Search Console cuenta más que la suma por página
      // (agrupación por sitio y búsquedas ocultas por privacidad).
      for (const c of COMBOS_PAGINA) {
        const acc = sitio.get(`${c.pais}|${c.dispositivo}`);
        if (!acc) continue;
        const impresiones = Math.round(acc.impresiones * 1.14);
        fact_gsc_sitio_dia.push({
          fecha,
          pais: c.pais,
          dispositivo: c.dispositivo,
          impresiones,
          clics: Math.round(acc.clics * 1.06),
          posicion_gsc: Math.round(((acc.posXImpr / acc.impresiones) * 1.04) * 10) / 10,
        });
      }
      for (const c of COMBOS_SOLO_SITIO) {
        const impresiones = Math.round(4200 * c.peso * base * ruido(0.3));
        fact_gsc_sitio_dia.push({
          fecha,
          pais: c.pais,
          dispositivo: c.dispositivo,
          impresiones,
          clics: Math.round(impresiones * 0.012 * ruido(0.5)),
          posicion_gsc: Math.round(24 * ruido(0.15) * 10) / 10,
        });
      }
    }

    // GA4: un día completo sin datos, a propósito.
    if (fecha === DIA_SIN_DATOS_GA4) continue;
    for (const p of PAGINAS) {
      if (p.sinSesiones) continue;
      // Para los últimos días GA4 tiene datos y Search Console todavía no: se estiman los clics.
      const clics = clicsPorPaginaDia.get(`${fecha}|${p.path}`) ?? Math.round(p.impresiones * 0.83 * base * p.ctr);
      const sesiones = Math.round(clics * 0.86 * ruido(0.12) + p.sesionesExtra * base * ruido(0.5));
      if (sesiones > 0) fact_ga4_pagina_dia.push(filaGa4(fecha, p, CANAL_ORGANICO, sesiones, azar));
      for (const o of OTROS_CANALES) {
        const s = Math.round(p.otrosCanales * o.peso * base * ruido(0.4));
        if (s > 0) fact_ga4_pagina_dia.push(filaGa4(fecha, p, o.canal, s, azar));
      }
    }
  }

  return {
    ...generarSemrush(hoy),
    dim_pagina: PAGINAS.map((p) => ({
      path: p.path,
      url_completa: `${DOMINIO}${p.path}`,
      tipo: p.tipo,
      cluster_id: p.cluster,
    })),
    fact_gsc_sitio_dia,
    fact_gsc_pagina_dia,
    fact_ga4_pagina_dia,
  };
}

function filaGa4(
  fecha: FechaISO,
  p: PerfilPagina,
  canal: string,
  sesiones: number,
  azar: () => number,
): FactGa4PaginaDia {
  const conConversion = Math.min(sesiones, Math.round(sesiones * p.conversion + (azar() < 0.15 ? 1 : 0) * (p.conversion > 0 ? 1 : 0)));
  return {
    fecha,
    path: p.path,
    canal,
    sesiones,
    sesiones_con_engagement: Math.round(sesiones * (0.52 + azar() * 0.18)),
    // Una sesión puede completar más de una conversión.
    conversiones: conConversion + (conConversion > 0 && azar() < 0.3 ? 1 : 0),
    sesiones_con_conversion: conConversion,
    segundos_interaccion: Math.round(sesiones * SEGUNDOS_POR_SESION[p.tipo] * (0.7 + azar() * 0.6)),
  };
}

/** Segundos de interacción promedio por sesión según el tipo de página de entrada. */
const SEGUNDOS_POR_SESION: Record<TipoPagina, number> = {
  home: 55,
  categoria: 70,
  producto: 80,
  blog: 115,
  otro: 45,
};
