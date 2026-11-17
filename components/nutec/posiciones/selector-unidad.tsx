"use client";

import type { ReactNode } from "react";
import { Select, SelectItem } from "@/components/base/select/select";
import { formatoFechaLarga, formatoRango } from "@/lib/formato";
import { NOMBRE_UNIDAD, type Unidad } from "@/lib/series";
import type { Tramo } from "@/lib/datos/estrategia";
import { cx } from "@/utils/cx";

const UNIDADES: Unidad[] = ["dia", "semana", "mes"];
export const CADA: Record<Unidad, string> = { dia: "cada día", semana: "cada semana", mes: "cada mes" };

/** Agrupación inicial: por día hasta 90 días, por semana en rangos más largos. */
export function unidadInicial(dias: number): Unidad {
  return dias > 90 ? "semana" : "dia";
}

/** Rótulo del tramo bajo el cursor: el día, o el rango de la semana o el mes. */
export function rotuloTramo(t: Tramo): string {
  if (t.diasUnidad === 1) return formatoFechaLarga(t.fecha);
  return `${formatoRango(t.desde, t.hasta)}${t.incompleta ? ` · ${t.diasPeriodo} de ${t.diasUnidad} días` : ""}`;
}

/** Selector Día / Semana / Mes de una gráfica, igual al del Resumen orgánico. */
export function SelectorUnidad({ unidad, onCambio }: { unidad: Unidad; onCambio: (u: Unidad) => void }) {
  return (
    <Select
      aria-label="Agrupar por"
      className="w-[120px] shrink-0"
      selectedKey={unidad}
      onSelectionChange={(k) => {
        if (k) onCambio(k as Unidad);
      }}
    >
      {UNIDADES.map((u) => (
        <SelectItem key={u} id={u} textValue={NOMBRE_UNIDAD[u]}>
          {NOMBRE_UNIDAD[u]}
        </SelectItem>
      ))}
    </Select>
  );
}

/**
 * Etiqueta de fecha bajo una barra o un punto, en una gráfica con una celda
 * por tramo. La celda suele ser más angosta que el texto: la etiqueta va
 * centrada bajo su tramo y, en los extremos, alineada hacia dentro para que
 * no se salga de la tarjeta.
 */
export function EtiquetaEje({ i, n, children }: { i: number; n: number; children: ReactNode }) {
  return (
    <span className="relative h-4 min-w-0 flex-1 text-caption-1-medium text-text-tertiary">
      {children && (
        <span className={cx("absolute top-0 whitespace-nowrap", i === 0 ? "start-0" : i === n - 1 ? "end-0" : "left-1/2 -translate-x-1/2")}>
          {children}
        </span>
      )}
    </span>
  );
}
