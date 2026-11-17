/**
 * Cálculo de métricas a partir de cantidades sumables.
 * Definiciones: docs/01_Analitica_Modelo_Datos_BigQuery.md, sección 5.
 *
 * Regla: los porcentajes y promedios se recalculan sobre el grupo a partir de
 * sus sumas; nunca se promedian porcentajes ya calculados.
 */

/** Cantidades sumables de Search Console para un grupo de filas. */
export type SumasGsc = {
  impresiones: number;
  clics: number;
  /** SUM(posicion_gsc * impresiones): permite ponderar la posición por impresiones. */
  posicionPorImpresiones: number;
};

/** Cantidades sumables de GA4 (página de entrada) para un grupo de filas. */
export type SumasGa4 = {
  sesiones: number;
  sesionesConEngagement: number;
  conversiones: number;
  sesionesConConversion: number;
  /** Segundos de interacción (userEngagementDuration de GA4) de esas sesiones. */
  segundosInteraccion: number;
};

export const SUMAS_GSC_VACIAS: SumasGsc = { impresiones: 0, clics: 0, posicionPorImpresiones: 0 };
export const SUMAS_GA4_VACIAS: SumasGa4 = {
  sesiones: 0,
  sesionesConEngagement: 0,
  conversiones: 0,
  sesionesConConversion: 0,
  segundosInteraccion: 0,
};

export function sumarGsc(a: SumasGsc, b: SumasGsc): SumasGsc {
  return {
    impresiones: a.impresiones + b.impresiones,
    clics: a.clics + b.clics,
    posicionPorImpresiones: a.posicionPorImpresiones + b.posicionPorImpresiones,
  };
}

export function sumarGa4(a: SumasGa4, b: SumasGa4): SumasGa4 {
  return {
    sesiones: a.sesiones + b.sesiones,
    sesionesConEngagement: a.sesionesConEngagement + b.sesionesConEngagement,
    conversiones: a.conversiones + b.conversiones,
    sesionesConConversion: a.sesionesConConversion + b.sesionesConConversion,
    segundosInteraccion: a.segundosInteraccion + b.segundosInteraccion,
  };
}

/** Cociente, o null si el denominador es cero (la tasa no está definida). */
export function tasa(numerador: number, denominador: number): number | null {
  return denominador > 0 ? numerador / denominador : null;
}

/** CTR = SUM(clics) / SUM(impresiones). */
export function ctr(s: SumasGsc): number | null {
  return tasa(s.clics, s.impresiones);
}

/** Posición de Search Console = SUM(posicion_gsc * impresiones) / SUM(impresiones). */
export function posicionPromedio(s: SumasGsc): number | null {
  return tasa(s.posicionPorImpresiones, s.impresiones);
}

/** Tasa de conversión = sesiones con al menos una conversión / sesiones. */
export function tasaConversion(s: SumasGa4): number | null {
  return tasa(s.sesionesConConversion, s.sesiones);
}

/**
 * Tiempo de interacción promedio por sesión, en segundos =
 * SUM(segundos de interacción) / SUM(sesiones). Es la métrica "tiempo de
 * interacción promedio por sesión" del informe de páginas de destino de GA4.
 */
export function tiempoPromedioPorSesion(s: SumasGa4): number | null {
  return tasa(s.segundosInteraccion, s.sesiones);
}

/** Tasa de engagement = sesiones con engagement / sesiones. */
export function tasaEngagement(s: SumasGa4): number | null {
  return tasa(s.sesionesConEngagement, s.sesiones);
}

// ── Cambios entre periodos ────────────────────────────────────────────────

export type TipoCifra = "conteo" | "tasa" | "posicion";

export type Cambio =
  /** valor: % relativo (conteo), puntos porcentuales (tasa) o lugares (posición).
   *  En posición, positivo significa que mejoró (el número bajó). */
  | { tipo: TipoCifra; valor: number; sentido: "mejora" | "empeora" | "igual" }
  /** Hay periodo anterior pero el cambio no se puede expresar (anterior en cero o sin dato). */
  | { tipo: TipoCifra; valor: null; sentido: "indefinido" };

const DECIMALES_CAMBIO = 1;

function redondear(n: number, decimales = DECIMALES_CAMBIO): number {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

export function calcularCambio(
  tipo: TipoCifra,
  actual: number | null,
  anterior: number | null,
): Cambio {
  if (actual === null || anterior === null) return { tipo, valor: null, sentido: "indefinido" };
  let valor: number;
  switch (tipo) {
    case "conteo":
      if (anterior === 0) return { tipo, valor: null, sentido: "indefinido" };
      valor = ((actual - anterior) / anterior) * 100;
      break;
    case "tasa":
      valor = (actual - anterior) * 100;
      break;
    case "posicion":
      // Un número más bajo es mejor: bajar de 24.6 a 22.5 es mejorar 2.1 lugares.
      valor = anterior - actual;
      break;
    default: {
      const nunca: never = tipo;
      throw new Error(`Tipo de cifra desconocido: ${String(nunca)}`);
    }
  }
  const r = redondear(valor);
  return { tipo, valor: Math.abs(r), sentido: r > 0 ? "mejora" : r < 0 ? "empeora" : "igual" };
}
