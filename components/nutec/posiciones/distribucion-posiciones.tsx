"use client";

import { useState } from "react";
import { CADA, EtiquetaEje, rotuloTramo, SelectorUnidad, unidadInicial } from "@/components/nutec/posiciones/selector-unidad";
import { BANDAS_TOP_100, COLOR_BANDA, rotuloBanda } from "@/components/nutec/posiciones/paleta";
import { formatoEntero, formatoFechaCorta, SIN_MEDIR } from "@/lib/formato";
import type { Unidad } from "@/lib/series";
import type { DiaDistribucion, SeriePorUnidad } from "@/lib/datos/estrategia";
import { cx } from "@/utils/cx";

/**
 * Distribución de posiciones: una barra apilada por día, semana o mes. Cada
 * tramo es una banda de posición y su alto es el número de búsquedas que
 * estuvieron en esa banda. El alto total de la barra son las búsquedas dentro
 * del top 100.
 *
 * - En semana y mes la banda de cada búsqueda sale de su posición típica en
 *   ese tramo; los días no se suman. Una semana o un mes incompletos van
 *   atenuados.
 * - Top 3 va abajo, pegado a la base, para que su evolución se lea sin esfuerzo.
 * - Las que no aparecen no se dibujan: no son una posición. El lector dice cuántas fueron.
 * - Un día sin medición queda vacío y el lector dice s/m, nunca cero.
 */

function topeDe(maximo: number): number {
  if (maximo <= 4) return 4;
  const paso = maximo <= 20 ? 4 : maximo <= 50 ? 10 : 20;
  return Math.ceil(maximo / paso) * paso;
}

const enTop100 = (d: DiaDistribucion) => (d.conteo ? BANDAS_TOP_100.reduce((s, b) => s + d.conteo![b], 0) : 0);

export function DistribucionPosiciones({ series }: { series: SeriePorUnidad<DiaDistribucion> }) {
  const [unidad, setUnidad] = useState<Unidad>(() => unidadInicial(series.dia.length));
  const [activo, setActivo] = useState<number | null>(null);
  const dias = series[unidad];
  const tope = topeDe(Math.max(0, ...dias.map(enTop100)));
  const dia = activo !== null ? dias[activo] : null;
  const cadaCuantos = Math.max(1, Math.ceil(dias.length / 7));
  const muchos = dias.length > 45;

  return (
    <section
      className="flex min-w-0 flex-col gap-4 rounded-3xl bg-background-secondary-default p-4"
      aria-label="Distribución de posiciones"
      onMouseLeave={() => setActivo(null)}
    >
      <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-start sm:justify-between">
        {/* Sin aria-live: cada barra es un botón que ya dice su fecha y sus cifras. */}
        <div className="flex min-h-14 flex-col justify-center gap-1">
          {dia ? (
            <>
              <p className="text-body-medium text-text-secondary">{rotuloTramo(dia)}</p>
              <p className="flex flex-wrap items-baseline gap-x-3 text-title-2-medium text-text-primary tabular-nums">
                {dia.conteo ? (
                  <>
                    {formatoEntero(enTop100(dia))} de {formatoEntero(dia.medidas)} búsquedas en el top 100
                    <span className="text-body-medium text-text-secondary">{formatoEntero(dia.conteo["no-aparece"])} no aparecen</span>
                  </>
                ) : (
                  <span className="text-text-tertiary">{SIN_MEDIR}</span>
                )}
              </p>
            </>
          ) : (
            <p className="text-body-medium text-text-tertiary">Pasa el cursor sobre la gráfica para ver {CADA[unidad]}</p>
          )}
        </div>
        <SelectorUnidad
          unidad={unidad}
          onCambio={(u) => {
            setUnidad(u);
            setActivo(null);
          }}
        />
      </div>

      <div className="flex gap-2">
        {/* Eje: número de búsquedas */}
        <div className="flex h-56 w-6 shrink-0 flex-col justify-between text-end text-caption-1-medium text-text-tertiary tabular-nums" aria-hidden>
          <span className="-translate-y-1/2">{tope}</span>
          <span>{tope / 2}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative h-56">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
              <span className="border-t border-dashed border-separator-border" />
              <span className="border-t border-dashed border-separator-border" />
              <span className="border-t border-separator-border" />
            </div>
            <div className={cx("absolute inset-0 flex items-end", muchos ? "gap-px" : "gap-1")}>
              {dias.map((d, i) => {
                const visibles = enTop100(d);
                return (
                  <button
                    key={d.fecha}
                    type="button"
                    onMouseEnter={() => setActivo(i)}
                    onFocus={() => setActivo(i)}
                    onBlur={() => setActivo(null)}
                    onClick={() => setActivo(i)}
                    aria-label={d.conteo ? `${rotuloTramo(d)}: ${visibles} de ${d.medidas} búsquedas en el top 100` : `${rotuloTramo(d)}: sin medir`}
                    className={cx(
                      "flex h-full min-w-0 flex-1 cursor-pointer items-end outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                      activo !== null && activo !== i ? "opacity-40" : d.incompleta && activo !== i && "opacity-50",
                    )}
                  >
                    {d.conteo && visibles > 0 && (
                      <span
                        className={cx("flex w-full flex-col-reverse overflow-hidden", muchos ? "rounded-t-xs" : "rounded-t-md")}
                        style={{ height: `${(visibles / tope) * 100}%` }}
                      >
                        {BANDAS_TOP_100.filter((b) => d.conteo![b] > 0).map((b) => (
                          <span
                            key={b}
                            style={{
                              flexGrow: d.conteo![b],
                              flexBasis: 0,
                              background: COLOR_BANDA[b],
                            }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={cx("flex", muchos ? "gap-px" : "gap-1")} aria-hidden>
            {dias.map((d, i) => (
              <EtiquetaEje key={d.fecha} i={i} n={dias.length}>
                {i % cadaCuantos === 0 && formatoFechaCorta(d.fecha)}
              </EtiquetaEje>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda: de mejor a peor. Con un día activo, cada banda dice cuántas búsquedas tuvo. */}
      <div className="flex flex-wrap gap-2">
        {BANDAS_TOP_100.map((b) => (
          <span key={b} className="flex items-center gap-2 rounded-2lg bg-background-primary-default px-3 py-2 text-body-medium text-text-secondary">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: COLOR_BANDA[b] }} aria-hidden />
            {rotuloBanda(b)}
            {dia?.conteo && <span className="text-text-primary tabular-nums">{dia.conteo[b]}</span>}
          </span>
        ))}
      </div>
    </section>
  );
}
