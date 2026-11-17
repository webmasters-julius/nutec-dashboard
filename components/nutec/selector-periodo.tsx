"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseDate } from "@internationalized/date";
import { DateRangePicker, type DateRangePreset } from "@/components/base/date-picker/date-range-picker";
import { Chip } from "@/components/base/badges/chip";
import { formatoRango } from "@/lib/formato";
import { Spinner } from "@/components/base/spinner/spinner";
import { sumarDias, type FechaISO } from "@/lib/fechas";
import { ATAJOS, NOMBRE_ATAJO, PRIMER_DIA, parametrosDeSeleccion, type Atajo, type Seleccion } from "@/lib/periodos";

// ── Selector de fechas con atajos (estilo GA4) ────────────────────────────

/**
 * Selector de fechas con los atajos a la izquierda y el calendario a la
 * derecha, sobre el Date Range Picker de BoardUI. Es el único selector de
 * fechas de la vista: vive en la URL y lo comparten todas las secciones.
 */
export function SelectorRango({
  seleccion,
  hoy,
  rangos,
  ruta = "/",
}: {
  seleccion: Seleccion;
  hoy: FechaISO;
  /** Ruta de la vista en la que está el selector. */
  ruta?: string;
  /** Días que cubre cada atajo (los de GA4), para marcarlos en el calendario. */
  rangos: Partial<Record<Atajo, { desde: FechaISO; hasta: FechaISO }>>;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const ir = (s: Seleccion) => {
    const params = new URLSearchParams(parametrosDeSeleccion(s));
    startTransition(() => router.push(`${ruta}?${params.toString()}`, { scroll: false }));
  };

  const aValor = (r: { desde: FechaISO; hasta: FechaISO }) => ({ start: parseDate(r.desde), end: parseDate(r.hasta) });
  const presets: DateRangePreset[] = [
    { id: "personalizado", label: "Personalizado", range: null },
    ...ATAJOS.flatMap((a) => {
      const r = rangos[a];
      return r ? [{ id: a, label: NOMBRE_ATAJO[a], range: aValor(r) }] : [];
    }),
  ];

  const actual =
    seleccion.tipo === "personalizado" ? { desde: seleccion.desde, hasta: seleccion.hasta } : (rangos[seleccion.atajo] ?? null);
  const nombre = seleccion.tipo === "personalizado" ? "Personalizado" : NOMBRE_ATAJO[seleccion.atajo];

  return (
    <div className="flex items-center gap-2" aria-busy={pendiente}>
      {pendiente && <Spinner size="sm" aria-label="Cargando" />}
      <DateRangePicker
        aria-label="Periodo"
        placement="bottom start"
        presets={presets}
        presetId={seleccion.tipo === "atajo" ? seleccion.atajo : null}
        onPresetApply={(id) => ir({ tipo: "atajo", atajo: id as Atajo })}
        minValue={parseDate(PRIMER_DIA.gsc)}
        maxValue={parseDate(sumarDias(hoy, -1))}
        value={actual ? aValor(actual) : null}
        onChange={(v) => {
          if (v) ir({ tipo: "personalizado", desde: v.start.toString(), hasta: v.end.toString() });
        }}
        triggerLabel={
          <span className="flex items-center gap-2">
            <Chip variant="caption" color="neutral">
              {nombre}
            </Chip>
            {actual && <span>{formatoRango(actual.desde, actual.hasta)}</span>}
          </span>
        }
      />
    </div>
  );
}
