/**
 * Posiciones rastreadas en SEMrush: bandas, estado, alertas y resúmenes.
 * Sin dependencias del servidor, para poder probarlo y usarlo en el navegador.
 *
 * Definiciones: docs/01_Analitica_Modelo_Datos_BigQuery.md (secciones 4 y 5,
 * Anexo B). Las reglas de estado y de alertas son las de ese anexo,
 * redefinidas el 16 de noviembre de 2026; ya no siguen las funciones
 * `estado_keywords` y `alertas` de Supabase.
 *
 * Tres significados que no se confunden:
 *   - sin fila ese día            → no se midió
 *   - fila con posición vacía     → se midió y NUTEC no apareció en el top 100
 *   - fila con posición 1 a 100   → apareció
 * Y en IA: `citado_en_aio` vacío = no se verificó (s/m), false = verificado
 * sin cita, true = citada.
 */

import type { FechaISO } from "@/lib/fechas";

export type Rol = "primaria" | "secundaria" | "variante";
export const ORDEN_ROL: Record<Rol, number> = { primaria: 0, secundaria: 1, variante: 2 };

/** Una medición diaria de una búsqueda (fila de fact_rank_daily). */
export type FilaRank = {
  fecha: FechaISO;
  keyword_id: string;
  posicion: number | null;
  path_rankeado: string | null;
  serp_tiene_aio: boolean | null;
  citado_en_aio: boolean | null;
  aio_verificado: boolean;
};

// ── Mediana ───────────────────────────────────────────────────────────────

/** Mediana de los valores no vacíos; null si no hay ninguno. */
export function mediana(valores: (number | null | undefined)[]): number | null {
  const v = valores.filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// ── Bandas de posición ────────────────────────────────────────────────────

export const BANDAS = ["top3", "top10", "top20", "top100", "no-aparece", "sin-medicion"] as const;
export type Banda = (typeof BANDAS)[number];

export const NOMBRE_BANDA: Record<Banda, string> = {
  top3: "Top 3",
  top10: "Top 10",
  top20: "Top 20",
  top100: "Top 100",
  "no-aparece": "No aparece",
  "sin-medicion": "Sin medición",
};

/** Rango de posiciones de cada banda, para rotularla. */
export const RANGO_BANDA: Record<Banda, string> = {
  top3: "1 a 3",
  top10: "4 a 10",
  top20: "11 a 20",
  top100: "21 a 100",
  "no-aparece": "fuera del top 100",
  "sin-medicion": "s/m",
};

/** Una sola regla que cubre todos los casos, con caso final por defecto. */
export function bandaDe(diasMedidos: number, med: number | null): Banda {
  switch (true) {
    case diasMedidos === 0:
      return "sin-medicion";
    case med === null:
      return "no-aparece";
    case med! <= 3:
      return "top3";
    case med! <= 10:
      return "top10";
    case med! <= 20:
      return "top20";
    default:
      return "top100";
  }
}

// ── Estado ────────────────────────────────────────────────────────────────

export type Estado = "Bien" | "Atender" | "Vigilar";
/** Las alertas tienen además "Urgente"; ningún estado se asigna como Urgente. */
export type Prioridad = "Urgente" | Estado;

/** Volumen mensual desde el que una secundaria cuenta como prioritaria. */
export const VOLUMEN_RELEVANTE = 100;
/** Lugares que una búsqueda debe perder o ganar para que el cambio cuente (igual que las alertas CAÍDA y MEJORA). */
export const CAMBIO_RELEVANTE = 5;
/** Parte de los días medidos en que debe aparecer para que su posición sea confiable. */
const COBERTURA_MINIMA = 0.5;

/**
 * Una búsqueda es prioritaria si es la primaria de su cluster o una
 * secundaria con volumen relevante. Las variantes nunca lo son: son otras
 * formas de escribir la misma búsqueda y mejoran al trabajar las demás.
 */
export function esPrioritaria(k: { rol: Rol; volumen: number | null }): boolean {
  return k.rol === "primaria" || (k.rol === "secundaria" && (k.volumen ?? 0) >= VOLUMEN_RELEVANTE);
}

export type EstadoBusqueda = { estado: Estado; motivo: string };

/** Resumen mínimo de un periodo para decidir si su posición es confiable. */
export type PosicionPeriodo = { diasMedidos: number; diasVisible: number; mediana: number | null };

/**
 * Posición confiable de una búsqueda en un periodo: su mediana, salvo que
 * haya aparecido menos de la mitad de los días medidos; entonces cuenta como
 * que no aparece. Se aplica igual al periodo actual y al anterior, y la usan
 * tanto el estado como las alertas.
 */
export function posicionConfiable(p: PosicionPeriodo): number | null {
  return p.mediana !== null && p.diasVisible >= p.diasMedidos * COBERTURA_MINIMA ? p.mediana : null;
}

/**
 * Estado de una búsqueda (16 de noviembre de 2026). Una sola regla que cubre
 * todos los casos, con caso final por defecto.
 *
 * - Bien: está en la primera página (1 a 10) y no viene cayendo.
 * - Atender: búsqueda prioritaria que necesita trabajo. Es la única etiqueta
 *   que pide acción, así que se reserva para lo prioritario que no mejora.
 * - Vigilar: todo lo demás; no pide acción por ahora.
 *
 * `anterior` es el mismo resumen en el periodo de comparación, o null si no
 * hay periodo comparable (entonces no se evalúa si cayó o mejoró).
 */
export function estadoDe(k: {
  diasMedidos: number;
  diasVisible: number;
  mediana: number | null;
  rol: Rol;
  volumen: number | null;
  anterior: PosicionPeriodo | null;
}): EstadoBusqueda {
  const prioritaria = esPrioritaria(k);
  // Si aparece menos de la mitad de los días, su posición no es confiable: cuenta como que no aparece.
  const posicion = posicionConfiable(k);
  const estable = posicion !== null;
  const antes = k.anterior ? posicionConfiable(k.anterior) : null;
  const cambio = k.anterior ? cambioEnLugares(antes, posicion) : null;
  const cayo = cambio !== null && cambio <= -CAMBIO_RELEVANTE;
  const entro = k.anterior !== null && k.anterior.diasMedidos > 0 && antes === null && posicion !== null;
  const mejoro = (cambio !== null && cambio >= CAMBIO_RELEVANTE) || entro;
  const intermitente = k.mediana !== null && !estable;

  switch (true) {
    case k.diasMedidos === 0:
      return { estado: "Vigilar", motivo: "No se midió en este periodo." };
    case posicion !== null && posicion <= 10 && cayo:
      return { estado: "Vigilar", motivo: `Sigue en la primera página de Google, pero bajó ${CAMBIO_RELEVANTE} lugares o más.` };
    case posicion !== null && posicion <= 10:
      return { estado: "Bien", motivo: "Está en la primera página de Google." };
    case posicion !== null && posicion <= 20 && prioritaria && cayo:
      return { estado: "Atender", motivo: "Búsqueda prioritaria en la segunda página de Google y bajando." };
    case posicion !== null && posicion <= 20:
      return { estado: "Vigilar", motivo: "Está en la segunda página de Google, cerca de la primera." };
    case posicion !== null && prioritaria && mejoro:
      return { estado: "Vigilar", motivo: "Búsqueda prioritaria todavía lejos de la primera página, pero mejorando." };
    case posicion !== null && prioritaria:
      return { estado: "Atender", motivo: "Búsqueda prioritaria lejos de la primera página de Google." };
    case posicion !== null:
      return { estado: "Vigilar", motivo: "Está lejos de la primera página de Google; no es prioritaria." };
    case intermitente && prioritaria:
      return { estado: "Atender", motivo: "Búsqueda prioritaria que aparece en Google menos de la mitad de los días." };
    case intermitente:
      return { estado: "Vigilar", motivo: "Aparece en Google menos de la mitad de los días; no es prioritaria." };
    case prioritaria:
      return { estado: "Atender", motivo: "Búsqueda prioritaria que no aparece en Google." };
    default:
      return { estado: "Vigilar", motivo: "Todavía no aparece en Google; no es prioritaria." };
  }
}

// ── Resumen de una búsqueda en un periodo ─────────────────────────────────

export type ResumenBusqueda = {
  /** Días con fila (medidos). */
  diasMedidos: number;
  /** Días con posición (apareció en el top 100). */
  diasVisible: number;
  /** Mediana de la posición en los días en que apareció. */
  mediana: number | null;
  mejor: number | null;
  peor: number | null;
  banda: Banda;
  /** Días en que se verificó la citación en IA; 0 = sin medir. */
  diasVerificados: number;
  diasCitada: number;
  /** Días verificados en que Google mostró resumen de IA. */
  diasConResumenIa: number;
  /** Página con la que más días apareció. */
  paginaPrincipal: string | null;
  /** Páginas con las que apareció y cuántos días cada una, de más a menos. */
  paginas: { path: string; dias: number }[];
};

export function resumirBusqueda(filas: FilaRank[]): ResumenBusqueda {
  const visibles = filas.filter((f) => f.posicion !== null);
  const posiciones = visibles.map((f) => f.posicion as number);
  const verificadas = filas.filter((f) => f.aio_verificado);
  const porPagina = new Map<string, number>();
  for (const f of visibles) if (f.path_rankeado) porPagina.set(f.path_rankeado, (porPagina.get(f.path_rankeado) ?? 0) + 1);
  const paginas = [...porPagina.entries()].map(([path, dias]) => ({ path, dias })).sort((a, b) => b.dias - a.dias);
  const med = mediana(posiciones);
  return {
    diasMedidos: filas.length,
    diasVisible: visibles.length,
    mediana: med,
    mejor: posiciones.length ? Math.min(...posiciones) : null,
    peor: posiciones.length ? Math.max(...posiciones) : null,
    banda: bandaDe(filas.length, med),
    diasVerificados: verificadas.length,
    diasCitada: verificadas.filter((f) => f.citado_en_aio === true).length,
    diasConResumenIa: verificadas.filter((f) => f.serp_tiene_aio === true).length,
    paginaPrincipal: paginas[0]?.path ?? null,
    paginas,
  };
}

/**
 * Lugares que mejoró (+) o empeoró (−) contra el periodo anterior. Solo existe
 * si la búsqueda apareció en los dos periodos: una búsqueda que entra en la
 * posición 80 no "empeora" nada.
 */
export function cambioEnLugares(anterior: number | null, actual: number | null): number | null {
  if (anterior === null || actual === null) return null;
  return Math.round((anterior - actual) * 10) / 10;
}

// ── Alertas ───────────────────────────────────────────────────────────────

export const TIPOS_ALERTA = [
  "CAÍDA",
  "URL AJENA",
  "URL INESTABLE",
  "IA SIN CAPTURA",
  "INTERMITENTE",
  "MEJORA",
  "DATO INSUFICIENTE",
] as const;
export type TipoAlerta = (typeof TIPOS_ALERTA)[number];

export type Alerta = { tipo: TipoAlerta; prioridad: Prioridad; detalle: string };

/** Nombre con que la interfaz muestra cada alerta. */
export const NOMBRE_ALERTA: Record<TipoAlerta, string> = {
  CAÍDA: "Caída",
  "URL AJENA": "Otra página",
  "URL INESTABLE": "Cambia de página",
  "IA SIN CAPTURA": "Oportunidad en IA",
  INTERMITENTE: "Intermitente",
  MEJORA: "Mejora",
  "DATO INSUFICIENTE": "Pocos datos",
};

const UMBRAL = {
  /** Resumen de IA en este porcentaje o más de los días verificados. */
  iaResumenPct: 80,
  iaPosicionMax: 10,
  /** La segunda página debe aparecer al menos esta parte de los días para contar como alternancia. */
  paginaAlterna: 0.2,
  /** Menos de esta parte de los días del periodo medidos: pocos datos. */
  medicionMinima: 0.5,
  primeraPagina: 10,
  segundaPagina: 20,
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Alertas de una búsqueda (redefinidas el 16 de noviembre de 2026). Una
 * alerta es algo que cambió o un hallazgo que merece una mirada. Mismo
 * criterio que el estado: la prioridad dice cuánto importa, no cuánto asusta.
 *
 * - Urgente: solo cuando una búsqueda prioritaria sale de la primera página
 *   o deja de aparecer estando en ella.
 * - Atender: pide una acción sobre una búsqueda prioritaria, o una búsqueda
 *   cualquiera salió de la primera página.
 * - Vigilar: conviene saberlo; no pide acción.
 * - Bien: buenas noticias (mejoras).
 *
 * Los movimientos de búsquedas no prioritarias que ya estaban más allá de la
 * segunda página no generan alerta: a esa altura son ruido.
 */
export function alertasDe(k: {
  resumen: ResumenBusqueda;
  /** El mismo resumen en el periodo de comparación, o null si no hay periodo comparable. */
  anterior: PosicionPeriodo | null;
  pathObjetivo: string | null;
  prioritaria: boolean;
  /** Días que tiene el periodo elegido. */
  diasPeriodo: number;
}): Alerta[] {
  const { resumen: r, prioritaria } = k;
  const alertas: Alerta[] = [];
  // Misma definición de posición que el estado, en los dos periodos: si aparece
  // menos de la mitad de los días, cuenta como que no aparece.
  const posicion = posicionConfiable(r);
  const estable = posicion !== null;
  const antes = k.anterior ? posicionConfiable(k.anterior) : null;
  const delta = cambioEnLugares(antes, posicion);
  const enPrimera = (p: number | null) => p !== null && p <= UMBRAL.primeraPagina;
  const hastaSegunda = (p: number | null) => p !== null && p <= UMBRAL.segundaPagina;

  // Caída: dejó de aparecer, o perdió lugares.
  if (antes !== null && r.diasMedidos > 0 && r.mediana === null) {
    const prioridad: Prioridad | null = enPrimera(antes) && prioritaria ? "Urgente" : prioritaria || enPrimera(antes) ? "Atender" : hastaSegunda(antes) ? "Vigilar" : null;
    if (prioridad) alertas.push({ tipo: "CAÍDA", prioridad, detalle: `Dejó de aparecer en Google (estaba en la posición ${fmt(antes)})` });
  } else if (delta !== null && delta <= -CAMBIO_RELEVANTE) {
    const salio = enPrimera(antes) && !enPrimera(posicion);
    const movimiento = `bajó ${fmt(Math.abs(delta))} lugares (de ${fmt(antes!)} a ${fmt(posicion!)})`;
    let prioridad: Prioridad | null;
    switch (true) {
      case salio && prioritaria:
        prioridad = "Urgente";
        break;
      case salio:
        prioridad = "Atender";
        break;
      case enPrimera(posicion):
        prioridad = "Vigilar";
        break;
      case prioritaria:
        prioridad = "Atender";
        break;
      case hastaSegunda(antes):
        prioridad = "Vigilar";
        break;
      default:
        prioridad = null;
    }
    if (prioridad) {
      alertas.push({
        tipo: "CAÍDA",
        prioridad,
        detalle: salio ? `Salió de la primera página: ${movimiento}` : `${movimiento[0].toUpperCase()}${movimiento.slice(1)}`,
      });
    }
  }

  // Aparece con una página distinta a la objetivo. No es un cambio sino un hallazgo:
  // si de todos modos está en la primera página, solo conviene saberlo.
  if (k.pathObjetivo && r.paginaPrincipal && r.paginaPrincipal !== k.pathObjetivo) {
    alertas.push({
      tipo: "URL AJENA",
      prioridad: !enPrimera(posicion) && prioritaria ? "Atender" : "Vigilar",
      detalle: `Aparece con ${r.paginaPrincipal}; la página objetivo es ${k.pathObjetivo}`,
    });
  }

  // Alterna entre páginas: la segunda debe aparecer con frecuencia, no un día suelto.
  const segunda = r.paginas[1];
  if (segunda && segunda.dias >= 2 && segunda.dias >= r.diasVisible * UMBRAL.paginaAlterna) {
    alertas.push({
      tipo: "URL INESTABLE",
      prioridad: "Vigilar",
      detalle: `Alterna entre ${r.paginas[0].path} (${r.paginas[0].dias} días) y ${segunda.path} (${segunda.dias} días)`,
    });
  }

  // Google muestra resumen de IA casi siempre, la búsqueda está en la primera página y no cita a NUTEC.
  if (
    r.diasVerificados > 0 &&
    (r.diasConResumenIa / r.diasVerificados) * 100 >= UMBRAL.iaResumenPct &&
    r.diasCitada === 0 &&
    posicion !== null &&
    posicion <= UMBRAL.iaPosicionMax
  ) {
    alertas.push({
      tipo: "IA SIN CAPTURA",
      prioridad: "Vigilar",
      detalle: `Google mostró resumen de IA ${r.diasConResumenIa} de ${r.diasVerificados} días y no citó a NUTEC`,
    });
  }

  // Aparece menos de la mitad de los días (la misma regla que usa el estado).
  if (r.mediana !== null && !estable) {
    alertas.push({ tipo: "INTERMITENTE", prioridad: prioritaria ? "Atender" : "Vigilar", detalle: `Apareció solo ${r.diasVisible} de ${r.diasMedidos} días` });
  }

  // Mejora: empezó a aparecer, o ganó lugares donde importa.
  if (k.anterior !== null && k.anterior.diasMedidos > 0 && antes === null && estable) {
    alertas.push({ tipo: "MEJORA", prioridad: "Bien", detalle: `Empezó a aparecer en Google (posición ${fmt(posicion!)})` });
  } else if (delta !== null && delta >= CAMBIO_RELEVANTE && (prioritaria || hastaSegunda(posicion))) {
    const movimiento = `subió ${fmt(delta)} lugares (de ${fmt(antes!)} a ${fmt(posicion!)})`;
    alertas.push({
      tipo: "MEJORA",
      prioridad: "Bien",
      detalle: !enPrimera(antes) && enPrimera(posicion) ? `Entró a la primera página: ${movimiento}` : `${movimiento[0].toUpperCase()}${movimiento.slice(1)}`,
    });
  }

  if (r.diasMedidos > 0 && r.diasMedidos < k.diasPeriodo * UMBRAL.medicionMinima) {
    alertas.push({
      tipo: "DATO INSUFICIENTE",
      prioridad: "Vigilar",
      detalle: `Se midió solo ${r.diasMedidos} de ${k.diasPeriodo} días; la posición típica no es confiable`,
    });
  }
  return alertas;
}

export const ORDEN_PRIORIDAD: Record<Prioridad, number> = { Urgente: 0, Atender: 1, Vigilar: 2, Bien: 3 };

// ── Resumen de un grupo de búsquedas (cluster o sitio) ────────────────────

export type ConteoBandas = Record<Banda, number>;

export function contarBandas(bandas: Banda[]): ConteoBandas {
  const c = Object.fromEntries(BANDAS.map((b) => [b, 0])) as ConteoBandas;
  for (const b of bandas) c[b] += 1;
  return c;
}

/**
 * Cambio de la posición típica de un grupo, calculado solo sobre las
 * búsquedas visibles en ambos periodos, e informando cuántas fueron.
 */
export function cambioDeGrupo(pares: { anterior: number | null; actual: number | null }[]): {
  lugares: number | null;
  comparables: number;
} {
  const comunes = pares.filter((p) => p.anterior !== null && p.actual !== null);
  if (comunes.length === 0) return { lugares: null, comparables: 0 };
  return {
    lugares: cambioEnLugares(mediana(comunes.map((p) => p.anterior)), mediana(comunes.map((p) => p.actual))),
    comparables: comunes.length,
  };
}
