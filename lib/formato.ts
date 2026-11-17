/**
 * Formato de cifras y fechas en español de México (es-MX).
 */

import type { Cambio } from "@/lib/metricas";
import { fechaParaFormato, type FechaISO } from "@/lib/fechas";

export const LOCALE = "es-MX";

/** Se muestra cuando un dato no se midió en el periodo. Nunca un cero. */
export const SIN_MEDIR = "s/m";
/** Se muestra cuando una fuente no tiene dato para un elemento (por ejemplo, una página). */
export const GUION = "–";

const entero = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const unDecimal = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const porcentaje = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const compacto = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });

export function formatoEntero(n: number): string {
  return entero.format(n);
}

/** 0.0184 → "1.8%" */
export function formatoPorcentaje(n: number): string {
  return porcentaje.format(n);
}

/** Posición de Search Console con un decimal: 12.34 → "12.3" */
export function formatoPosicion(n: number): string {
  return unDecimal.format(n);
}

export function formatoCompacto(n: number): string {
  return compacto.format(n);
}

/** Flecha y texto del cambio: "▲ 12.4%", "▼ 0.4 pp", "▲ 2.1 lugares", "= 0.0%". */
export function textoCambio(c: Cambio): string | null {
  if (c.valor === null) return null;
  const flecha = c.sentido === "mejora" ? "▲" : c.sentido === "empeora" ? "▼" : "=";
  const numero = unDecimal.format(c.valor);
  switch (c.tipo) {
    case "conteo":
      return `${flecha} ${numero}%`;
    case "tasa":
      return `${flecha} ${numero} pp`;
    case "posicion":
      return `${flecha} ${numero} ${c.valor === 1 ? "lugar" : "lugares"}`;
    default: {
      const nunca: never = c.tipo;
      throw new Error(`Tipo de cifra desconocido: ${String(nunca)}`);
    }
  }
}

// ── Fechas ────────────────────────────────────────────────────────────────

const diaMes = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", timeZone: "UTC" });
const diaMesAnio = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const diaMesCorto = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const diaMesCortoAnio = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2 de noviembre" (o "2 de noviembre de 2025" si no es del año de referencia). */
export function formatoFechaLarga(f: FechaISO, anioReferencia?: string): string {
  const fmt = anioReferencia && f.slice(0, 4) !== anioReferencia ? diaMesAnio : diaMes;
  return fmt.format(fechaParaFormato(f));
}

export function formatoFechaCorta(f: FechaISO, conAnio = false): string {
  return (conAnio ? diaMesCortoAnio : diaMesCorto).format(fechaParaFormato(f)).replace(/\./g, "");
}

/** "6 oct – 2 nov 2026", o "6 – 12 oct 2026" dentro de un mismo mes. */
export function formatoRango(desde: FechaISO, hasta: FechaISO): string {
  const mismoAnio = desde.slice(0, 4) === hasta.slice(0, 4);
  const mismoMes = mismoAnio && desde.slice(0, 7) === hasta.slice(0, 7);
  const fin = formatoFechaCorta(hasta, true);
  if (desde === hasta) return fin;
  if (mismoMes) return `${Number(desde.slice(8))} – ${fin}`;
  return `${formatoFechaCorta(desde, !mismoAnio)} – ${fin}`;
}

/** Duración en segundos: 83 → "1 min 23 s", 45 → "45 s". */
export function formatoDuracion(segundos: number): string {
  const total = Math.round(segundos);
  const min = Math.floor(total / 60);
  const s = total % 60;
  return min > 0 ? `${min} min ${s} s` : `${s} s`;
}
