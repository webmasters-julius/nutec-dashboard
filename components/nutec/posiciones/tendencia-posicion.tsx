import { COLOR_BANDA } from "@/components/nutec/posiciones/paleta";
import { SIN_MEDIR } from "@/lib/formato";
import { bandaDe, type Banda } from "@/lib/posiciones";
import type { DiaBusqueda } from "@/lib/datos/estrategia";

/**
 * Escala de posición comprimida: del 1 al 30 ocupa el 70% del alto, porque
 * ahí es donde importa la diferencia; del 31 al 100, el resto. Devuelve una
 * fracción de 0 (posición 1, mejor) a 1 (posición 100).
 */
export function escalaPosicion(p: number): number {
  const q = Math.min(100, Math.max(1, p));
  return q <= 30 ? ((q - 1) / 29) * 0.7 : 0.7 + ((q - 30) / 70) * 0.3;
}

/** Límites de las bandas sobre la escala, para dibujarlas de fondo. */
export const TRAMOS_BANDA: { banda: Banda; desde: number; hasta: number }[] = [
  { banda: "top3", desde: 1, hasta: 3.5 },
  { banda: "top10", desde: 3.5, hasta: 10.5 },
  { banda: "top20", desde: 10.5, hasta: 20.5 },
  { banda: "top100", desde: 20.5, hasta: 100 },
];

const ANCHO = 120;
const ALTO = 28;
const MARGEN = 4;
/** Lugares que abarca como mínimo el alto: así un movimiento de 1 lugar no parece un salto. */
const TRAMO_MINIMO = 8;

/**
 * Tendencia de una búsqueda: una línea con su posición de cada día del
 * periodo. Hacia arriba es mejor. El punto final lleva el color de la banda
 * en que terminó. Los días en que no apareció en el top 100 cortan la línea.
 *
 * - Nunca apareció en el periodo: dice "No aparece", sin línea.
 * - No se midió: s/m.
 */
export function TendenciaPosicion({ dias }: { dias: DiaBusqueda[] }) {
  if (dias.length === 0) return <span className="text-body-regular text-text-tertiary">{SIN_MEDIR}</span>;
  const posiciones = dias.map((d) => d.posicion).filter((p): p is number => p !== null);
  if (posiciones.length === 0) return <span className="text-body-regular text-text-tertiary">No aparece</span>;

  const mejor = Math.min(...posiciones);
  const peor = Math.max(...posiciones);
  const tramo = Math.max(TRAMO_MINIMO, peor - mejor);
  const arriba = (mejor + peor) / 2 - tramo / 2;
  const x = (i: number) => (dias.length === 1 ? ANCHO / 2 : MARGEN + (i / (dias.length - 1)) * (ANCHO - 2 * MARGEN));
  const y = (p: number) => MARGEN + ((p - arriba) / tramo) * (ALTO - 2 * MARGEN);

  // Tramos continuos: la línea no cruza los días en que no apareció.
  const tramos: { i: number; p: number }[][] = [];
  let actual: { i: number; p: number }[] = [];
  dias.forEach((d, i) => {
    if (d.posicion === null) {
      if (actual.length) tramos.push(actual);
      actual = [];
    } else actual.push({ i, p: d.posicion });
  });
  if (actual.length) tramos.push(actual);
  const ultimo = tramos[tramos.length - 1].at(-1)!;

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-7 w-[120px] max-w-full shrink-0 text-text-tertiary" aria-hidden>
      {tramos.map((t) =>
        t.length === 1 ? (
          <circle key={t[0].i} cx={x(t[0].i)} cy={y(t[0].p)} r={1.5} fill="currentColor" />
        ) : (
          <path
            key={t[0].i}
            d={t.map((q, k) => `${k === 0 ? "M" : "L"}${x(q.i).toFixed(1)},${y(q.p).toFixed(1)}`).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ),
      )}
      <circle cx={x(ultimo.i)} cy={y(ultimo.p)} r={3.5} fill={COLOR_BANDA[bandaDe(1, ultimo.p)]} />
    </svg>
  );
}
