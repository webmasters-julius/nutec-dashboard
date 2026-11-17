/**
 * Datos de ejemplo de SEMrush con la estructura de nutec_marts
 * (dim_cluster, dim_keyword, fact_rank_daily).
 *
 * Base real: las 65 búsquedas del monitor de posiciones (roles, volúmenes y
 * posiciones del 4 de agosto al 22 de septiembre de 2026), en
 * semrush-base.json. De ahí en adelante se extienden con un paseo aleatorio
 * determinista hasta ayer.
 *
 * Casos difíciles incluidos a propósito:
 * - Búsquedas que nunca aparecen (fila con posición vacía) y búsquedas
 *   intermitentes.
 * - Días atípicos (un salto de decenas de lugares por un día).
 * - Un día sin medición para todas las búsquedas (27 de octubre de 2026) y
 *   una búsqueda que dejó de medirse (sin filas desde el 20 de octubre).
 * - Una mejora y una caída claras, para las alertas.
 * - Búsquedas que aparecen con una página distinta a la objetivo del cluster
 *   (las reales de Supabase) y otras que alternan entre dos páginas.
 * - Citación en IA verificada solo en las ventanas reales (HOME del 1 al 22
 *   de septiembre; Blankets y MaxWool del 1 al 7) y todos los días desde el 1
 *   de octubre. Fuera de eso, `citado_en_aio` va vacío: sin medir.
 * - Cita en IA sin posición orgánica; resumen de IA frecuente sin cita.
 * - Búsquedas con volumen 0.
 */

import { sumarDias, type FechaISO } from "@/lib/fechas";
import type { Rol } from "@/lib/posiciones";
import type { DimCluster, DimKeyword, FactRankDaily } from "@/lib/datos/tipos";
import base from "@/lib/datos/ejemplo/semrush-base.json";

type ClusterBase = {
  numero: number;
  nombre: string;
  familia: string | null;
  objetivo: string;
  keywords: { keyword: string; rol: string; volumen: number; inicio: string; pos: (number | null)[]; ai: number[] }[];
};

const DOMINIO = "https://www.nutec.com";
const DIA_SIN_MEDICION: FechaISO = "2026-10-27";
const IA_DIARIA_DESDE: FechaISO = "2026-10-01";
/** Ventanas reales en que se verificó la citación en IA, por número de cluster. */
const VERIFICACION: Record<number, { desde: FechaISO; hasta: FechaISO }> = {
  1: { desde: "2026-09-01", hasta: "2026-09-22" },
  2: { desde: "2026-09-01", hasta: "2026-09-07" },
  3: { desde: "2026-09-01", hasta: "2026-09-07" },
};

/**
 * Página con la que cada búsqueda apareció realmente en Google (dato de
 * rank_snapshots en Supabase, del 4 de agosto al 22 de septiembre de 2026):
 * [página principal, página ocasional]. Las que no están aquí aparecieron con
 * la página objetivo de su cluster. Varias búsquedas de HOME aparecen con
 * artículos del newsroom y no con la página de inicio.
 */
const PAGINA_REAL: Record<string, [string, string | null]> = {
  "ceramic fiber blanket manufacturers": ["/newsroom/articles/ceramic-fiber-blanket-portfolio-for-the-industrial-sector", "/products-engineering/blankets"],
  "ceramic fiber blanket manufacturers usa": ["/products-engineering/blankets", "/newsroom/articles/ceramic-fiber-blanket-portfolio-for-the-industrial-sector"],
  "ceramic fiber blanket supplier usa": ["/products-engineering/blankets", null],
  "ceramic fiber insulation": ["/newsroom/articles/ceramic-fiber-insulation-thermal-protection", null],
  "ceramic insulation manufacturer": ["/newsroom/articles/ceramic-fiber-insulation-thermal-protection", null],
  "high temperature fiber blanket usa": ["/products-engineering/blankets/maxwool-3000", null],
  "high temperature industrial insulation blanket": ["/newsroom/articles/industrial-insulation-blankets-efficiency-in-extreme-environments", null],
  "high temperature insulation": ["/newsroom/articles/types-of-thermal-insulation-for-the-industrial-sector", null],
  "high temperature insulation manufacturer": ["/newsroom/articles/types-of-thermal-insulation-for-the-industrial-sector", null],
  "high temperature insulation materials": ["/newsroom/articles/types-of-thermal-insulation-for-the-industrial-sector", "/newsroom/articles/types-of-thermal-insulation"],
  "high temperature insulation products": ["/newsroom/articles/types-of-thermal-insulation-for-the-industrial-sector", null],
  "industrial insulation blankets": ["/newsroom/articles/industrial-insulation-blankets-efficiency-in-extreme-environments", null],
  "industrial thermal insulation blanket": ["/newsroom/articles/industrial-thermal-blanket-energy-efficiency-and-performance", null],
  "insulation high temperature": ["/newsroom/articles/types-of-thermal-insulation-for-the-industrial-sector", "/newsroom/articles/high-temp-insulation-with-ceramic-fiber"],
  "needled ceramic fiber blankets": ["/newsroom/articles/ceramic-fiber-blanket-portfolio-for-the-industrial-sector", "/products-engineering/blankets"],
  "refractory ceramic fiber": ["/newsroom/articles/refractory-ceramic-fiber-coatings-and-mixes", null],
  "thermal insulation blanket material": ["/newsroom/articles/industrial-insulation-blankets-efficiency-in-extreme-environments", "/products-engineering/blankets"],
  "ceramic fiber wool": ["/products-engineering/blankets/maxwool-2300", null],
  "ceramic wool": ["/products-engineering/blankets/maxwool-2300", null],
  "ceramic wool blanket insulation": ["/products-engineering/blankets/maxwool-2300", null],
};

/** Comportamientos forzados después del último dato real, por búsqueda. */
const GUION: Record<
  string,
  {
    /** Lugares por día desde `desde` (negativo = mejora). */
    tendencia?: { desde: FechaISO; porDia: number };
    /** Deja de medirse desde este día (sin filas). */
    sinFilasDesde?: FechaISO;
    /** Probabilidad diaria de que Google muestre resumen de IA. */
    resumenIa?: number;
    /** Probabilidad diaria de cita desde octubre. */
    cita?: number;
  }
> = {
  "high temp insulation blanket": { tendencia: { desde: "2026-10-12", porDia: -0.45 } },
  "thermal insulation fiber blanket": { tendencia: { desde: "2026-10-14", porDia: 0.5 } },
  "rcf blanket": { sinFilasDesde: "2026-10-20" },
  "high temperature insulation products": { resumenIa: 0.95, cita: 0 },
  "industrial thermal insulation blanket": { resumenIa: 0.9, cita: 0 },
  "needled ceramic fiber blankets": { cita: 0.6, resumenIa: 0.9 },
  "ceramic fiber products": { cita: 0.35, resumenIa: 0.8 },
};

function azarDe(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const norm = (url: string) => url.replace(DOMINIO, "").replace(/\/$/, "") || "/";

export type MartsSemrush = {
  dim_cluster: DimCluster[];
  dim_keyword: DimKeyword[];
  fact_rank_daily: FactRankDaily[];
};

export function generarSemrush(hoy: FechaISO): MartsSemrush {
  const ultimo = sumarDias(hoy, -1);
  const clusters = base as ClusterBase[];

  const dim_cluster: DimCluster[] = clusters.map((c) => ({
    cluster_id: String(c.numero),
    numero: c.numero,
    nombre: c.nombre,
    familia: c.familia,
    etiqueta_semrush: `cluster_${c.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    url_objetivo: c.objetivo,
    path_objetivo: norm(c.objetivo),
  }));

  const dim_keyword: DimKeyword[] = [];
  const fact_rank_daily: FactRankDaily[] = [];

  clusters.forEach((c) => {
    const objetivo = norm(c.objetivo);
    c.keywords.forEach((k, i) => {
      // Identificador de SEMrush (campo Pi), guardado como texto.
      const keyword_id = `3921${String(c.numero).padStart(2, "0")}${String(i + 1).padStart(4, "0")}`;
      dim_keyword.push({ keyword_id, cluster_id: String(c.numero), keyword: k.keyword, rol: k.rol as Rol, volumen: k.volumen });

      const guion = GUION[k.keyword] ?? {};
      const azar = azarDe(c.numero * 1000 + i * 7 + 13);
      const fueCitada = k.ai.some((a) => a === 1);
      // Cada búsqueda citada tiene su propia frecuencia de cita, de ocasional a casi diaria.
      const pCita = guion.cita ?? (fueCitada ? 0.06 + azar() * 0.6 : 0);
      // En cerca de la mitad de las búsquedas Google nunca muestra resumen de IA.
      const pResumen = guion.resumenIa ?? (fueCitada ? 0.9 : azar() < 0.5 ? 0 : 0.3 + azar() * 0.6);
      const conocidos = k.pos.filter((p) => p !== null) as number[];
      // Proporción de días en que no apareció, para conservar su carácter después.
      const pAusente = k.pos.length ? 1 - conocidos.length / k.pos.length : 1;
      let previa: number | null = conocidos.length ? conocidos[conocidos.length - 1] : null;
      let citadaAyer = false;

      for (let n = 0, fecha = k.inicio; fecha <= ultimo; n += 1, fecha = sumarDias(k.inicio, n)) {
        if (fecha === DIA_SIN_MEDICION) continue;
        if (guion.sinFilasDesde && fecha >= guion.sinFilasDesde) continue;

        let posicion: number | null;
        let citada: boolean | null;
        const real = n < k.pos.length;

        if (real) {
          posicion = k.pos[n];
        } else if (previa === null || azar() < pAusente * 0.9) {
          // Las que casi nunca aparecen siguen sin aparecer, y las intermitentes faltan algunos días.
          posicion = null;
        } else {
          const tendencia = guion.tendencia && fecha >= guion.tendencia.desde ? guion.tendencia.porDia : 0;
          const paso = (azar() - 0.5) * (previa <= 5 ? 1.2 : 3) + tendencia;
          previa = Math.min(100, Math.max(1, previa + paso));
          // Un día atípico de vez en cuando: no debe mover la mediana.
          posicion = azar() < 0.012 ? Math.min(100, Math.round(previa + 25 + azar() * 30)) : Math.round(previa);
        }
        if (real && posicion !== null) previa = posicion;

        const v = VERIFICACION[c.numero];
        const verificado = fecha >= IA_DIARIA_DESDE || (fecha >= v.desde && fecha <= v.hasta);
        if (!verificado) {
          citada = null;
        } else if (real) {
          citada = k.ai[n] === 1;
        } else {
          // Las citas van en rachas: si ayer hubo cita, hoy es más probable.
          citada = pCita > 0 && azar() < (citadaAyer ? Math.min(0.95, pCita + 0.25) : pCita * 0.35);
        }
        citadaAyer = citada === true;

        let pagina: string | null = null;
        if (posicion !== null) {
          const [principal, ocasional] = PAGINA_REAL[k.keyword] ?? [objetivo, null];
          // La página ocasional aparece un día de cada diez, como en los datos reales.
          pagina = ocasional && n % 10 === 9 ? ocasional : principal;
        }

        fact_rank_daily.push({
          fecha,
          keyword_id,
          dispositivo: "desktop",
          posicion,
          url_rankeada: pagina === null ? null : `${DOMINIO}${pagina}`,
          path_rankeado: pagina,
          serp_tiene_aio: verificado ? citada === true || azar() < pResumen : null,
          citado_en_aio: citada,
          aio_verificado: verificado,
          fuente: real ? "semrush_api" : "ejemplo",
        });
      }
    });
  });

  return { dim_cluster, dim_keyword, fact_rank_daily };
}
