"use client";

import { useState } from "react";
import { Ayuda } from "@/components/nutec/ayuda";
import { formatoEntero, formatoPorcentaje, GUION } from "@/lib/formato";
import { AYUDA } from "@/lib/textos-ayuda";
import type { PasoEmbudo } from "@/lib/datos/resumen";
import { cx } from "@/utils/cx";

/**
 * Embudo orgánico de tres pasos en la misma unidad (sesiones).
 *
 * Flujo horizontal con transiciones curvas (especificación, sección 4.5,
 * actualizada el 5 nov 2026; antes pedía barras horizontales).
 * Construido desde cero con SVG y los tokens de gráfica de BoardUI (no es el
 * Funnel Chart Card Pro). La altura de cada paso es proporcional a su cifra,
 * así que la forma no deforma la proporción: la curva solo une un paso con
 * el siguiente.
 */

const ALTO = 200;
/** Altura mínima visible para pasos muy pequeños, en las mismas unidades que ALTO. */
const ALTO_MINIMO = 4;
/** Fracción del ancho de cada columna que es plana antes de la curva. */
const PLANO = 55;
const COLORES = ["var(--color-chart-4)", "var(--color-chart-6)", "var(--color-chart-5)"];

function forma(alto: number, siguiente: number | null): string {
  const arriba = (ALTO - alto) / 2;
  const abajo = arriba + alto;
  if (siguiente === null) return `M0,${arriba} H100 V${abajo} H0 Z`;
  const arriba2 = (ALTO - siguiente) / 2;
  const abajo2 = arriba2 + siguiente;
  const c = PLANO + (100 - PLANO) / 2;
  return [
    `M0,${arriba} H${PLANO}`,
    `C${c},${arriba} ${c},${arriba2} 100,${arriba2}`,
    `V${abajo2}`,
    `C${c},${abajo2} ${c},${abajo} ${PLANO},${abajo}`,
    `H0 Z`,
  ].join(" ");
}

export function Embudo({ titulo, pasos }: { titulo: string; pasos: PasoEmbudo[] }) {
  const [activo, setActivo] = useState<string | null>(null);
  const maximo = Math.max(pasos[0]?.valor ?? 0, 1);
  const altos = pasos.map((p) => Math.max((p.valor / maximo) * ALTO, ALTO_MINIMO));

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-2xl bg-background-secondary-default px-4 pt-4 pb-4">
      <h3 className="text-body-medium text-text-secondary">{titulo}</h3>

      <div className="flex gap-1" onMouseLeave={() => setActivo(null)}>
        {pasos.map((p, i) => {
          const atenuado = activo !== null && activo !== p.id;
          // El porcentaje del último paso respecto del primero es la tasa de conversión.
          const esUltimo = i === pasos.length - 1;
          const porcentaje = p.deLaPrimera === null ? GUION : formatoPorcentaje(p.deLaPrimera);
          return (
            <div
              key={p.id}
              className="flex min-w-0 flex-1 flex-col gap-3"
              onMouseEnter={() => setActivo(p.id)}
              onFocus={() => setActivo(p.id)}
              onBlur={() => setActivo(null)}
            >
              <div className="relative" style={{ height: ALTO }}>
                <svg
                  viewBox={`0 0 100 ${ALTO}`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 size-full"
                  aria-hidden
                >
                  <path
                    d={forma(altos[i], i < pasos.length - 1 ? altos[i + 1] : null)}
                    fill={COLORES[i % COLORES.length]}
                    className={cx("transition-opacity duration-150 ease", atenuado && "opacity-35")}
                  />
                </svg>
                {esUltimo ? (
                  <span
                    className={cx(
                      // En pantallas chicas la columna es más angosta que el nombre: ahí la píldora
                      // lleva solo el porcentaje y su ayuda (el nombre lo dice la ayuda y la guía).
                      "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-background-primary-default py-0.5 ps-2.5 pe-1 text-body-medium text-text-primary shadow-xs transition-opacity duration-150 ease",
                      atenuado && "opacity-50",
                    )}
                  >
                    <span className="text-text-secondary max-md:sr-only">Tasa de conversión</span>
                    <span className="tabular-nums">{porcentaje}</span>
                    <Ayuda label="Tasa de conversión" hint={AYUDA.embudoTasaConversion} />
                  </span>
                ) : (
                  <span
                    className={cx(
                      "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background-primary-default px-2 py-0.5 text-body-medium text-text-primary tabular-nums shadow-xs transition-opacity duration-150 ease",
                      atenuado && "opacity-50",
                    )}
                    aria-hidden
                  >
                    {porcentaje}
                  </span>
                )}
              </div>

              <div
                className={cx(
                  "flex min-w-0 flex-1 flex-col justify-between gap-1 rounded-2lg bg-background-primary-default px-3 py-2 shadow-xs transition-opacity duration-150 ease",
                  atenuado && "opacity-60",
                )}
              >
                <span className="flex items-center gap-1.5 text-body-medium text-text-secondary">
                  <span className="size-2.5 shrink-0 rounded-xs" style={{ background: COLORES[i % COLORES.length] }} aria-hidden />
                  <span className="min-w-0">{p.nombre}</span>
                  <Ayuda label={p.nombre} hint={p.ayuda} />
                </span>
                <span className="text-headline-medium text-text-primary tabular-nums">
                  {formatoEntero(p.valor)}
                  {!esUltimo && <span className="sr-only"> ({porcentaje})</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

    </section>
  );
}
