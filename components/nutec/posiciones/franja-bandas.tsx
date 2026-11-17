"use client";

import { useState } from "react";
import { BANDAS_DIBUJADAS, COLOR_BANDA, COLOR_CONTORNO } from "@/components/nutec/posiciones/paleta";
import { RANGO_BANDA, type Banda, type ConteoBandas } from "@/lib/posiciones";
import { cx } from "@/utils/cx";

/**
 * Franja de bandas en miniatura para la fila de un cluster: una barra apilada
 * donde cada segmento es una banda de posición y su ancho es el número de
 * búsquedas que hay en ella. "No aparece" va hueco, con contorno.
 *
 * Debajo va un renglón de texto. En reposo dice lo que reciba en `reposo`;
 * al pasar el cursor por un segmento (o tocarlo, en el celular) dice cuántas
 * búsquedas hay en esa banda.
 */
function textoBanda(b: Banda, n: number): string {
  const busquedas = `${n} ${n === 1 ? "búsqueda" : "búsquedas"}`;
  if (b === "no-aparece") return `${busquedas} ${n === 1 ? "no aparece" : "no aparecen"}`;
  // Se nombra el rango de posiciones y no "Top 10": la banda no acumula, y la
  // cifra "En top 10" de abajo sí. Con el mismo nombre parecerían contradecirse.
  return `${busquedas} en posiciones ${RANGO_BANDA[b]}`;
}

export function FranjaBandas({ bandas, reposo }: { bandas: ConteoBandas; reposo: string }) {
  const [activa, setActiva] = useState<Banda | null>(null);
  // Sin ninguna búsqueda que dibujar no hay franja ni invitación a recorrerla.
  if (!BANDAS_DIBUJADAS.some((b) => bandas[b] > 0)) return null;
  return (
    <span className="flex w-full flex-col gap-1.5" onMouseLeave={() => setActiva(null)}>
      <span className="flex w-full gap-px">
        {BANDAS_DIBUJADAS.filter((b) => bandas[b] > 0).map((b) => (
          // Es una imagen con su texto: al pasar el cursor o tocarlo, el renglón de abajo dice lo mismo.
          <span
            key={b}
            role="img"
            aria-label={textoBanda(b, bandas[b])}
            onMouseEnter={() => setActiva(b)}
            onClick={(e) => {
              e.stopPropagation();
              setActiva((a) => (a === b ? null : b));
            }}
            // El área sensible es más alta que la barra, para que sea fácil acertarle.
            className="flex min-w-1.5 items-center py-1.5"
            style={{ flexGrow: bandas[b], flexBasis: 0 }}
          >
            <span
              className={cx("h-2.5 w-full rounded-xs transition-opacity duration-150", activa !== null && activa !== b && "opacity-35")}
              style={{ background: COLOR_BANDA[b], border: b === "no-aparece" ? `1px solid ${COLOR_CONTORNO}` : undefined }}
            />
          </span>
        ))}
      </span>
      <span className={cx("text-body-regular tabular-nums", activa ? "text-text-primary" : "text-text-secondary")} aria-live="polite">
        {activa ? textoBanda(activa, bandas[activa]) : reposo}
      </span>
    </span>
  );
}
