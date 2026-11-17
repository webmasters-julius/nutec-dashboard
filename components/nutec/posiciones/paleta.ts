import { NOMBRE_BANDA, RANGO_BANDA, type Banda, type Prioridad, type Rol } from "@/lib/posiciones";
import type { ChipColor } from "@/components/base/badges/chip";

/**
 * Un solo código de color para toda la vista de posiciones rastreadas, con
 * los tokens de gráfica de BoardUI:
 * - Top 3 es la banda que más importa y lleva un color propio (verde), muy
 *   distinto del resto.
 * - Top 10, Top 20 y Top 100 comparten una gama (índigo) de más intensa a más
 *   tenue, con saltos amplios para que se distingan a simple vista. Los tonos
 *   salen de mezclar el token con transparencia, así que funcionan igual en
 *   modo claro y oscuro.
 * - "No aparece" va siempre hueco (solo contorno): no es una posición.
 * - "Sin medición" no se dibuja: se escribe s/m.
 * - El amarillo queda reservado para la citación en IA.
 */
const tono = (porcentaje: number) => `color-mix(in oklab, var(--color-chart-9-active) ${porcentaje}%, transparent)`;

export const COLOR_BANDA: Record<Banda, string> = {
  top3: "var(--color-chart-7-active)",
  top10: "var(--color-chart-9-active)",
  top20: tono(52),
  top100: tono(20),
  "no-aparece": "transparent",
  "sin-medicion": "transparent",
};

/** Bandas con posición (dentro del top 100), de mejor a peor. */
export const BANDAS_TOP_100: Banda[] = ["top3", "top10", "top20", "top100"];

export const COLOR_CONTORNO = "var(--color-chart-cursor)";
export const COLOR_IA = "var(--color-chart-8-active)";
export const COLOR_SIN_CITA = "var(--color-chart-track)";

/** Bandas que se dibujan como segmento, de mejor a peor. */
export const BANDAS_DIBUJADAS: Banda[] = ["top3", "top10", "top20", "top100", "no-aparece"];

/**
 * Nombre visible de una banda: su rango de posiciones ("Posiciones 4 a 10").
 * No se usa "Top 10" porque la banda no acumula (4 a 10) y los indicadores
 * "En top 10" sí (1 a 10): con el mismo nombre parecerían contradecirse.
 */
export function rotuloBanda(b: Banda): string {
  if (b === "sin-medicion" || b === "no-aparece") return NOMBRE_BANDA[b];
  return `Posiciones ${RANGO_BANDA[b]}`;
}

export const COLOR_ESTADO: Record<Prioridad, ChipColor> = {
  Urgente: "rose",
  Atender: "orange",
  // Vigilar no pide acción: va en gris, para que el único color cálido de la vista sea Atender.
  Vigilar: "gray",
  Bien: "lime",
};

export const NOMBRE_ROL: Record<Rol, string> = { primaria: "Primaria", secundaria: "Secundaria", variante: "Variante" };
