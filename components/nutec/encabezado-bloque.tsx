import { formatoFechaLarga, formatoRango } from "@/lib/formato";
import type { FechaISO } from "@/lib/fechas";
import type { Fuente, PeriodoFuente } from "@/lib/periodos";
import { AYUDA } from "@/lib/textos-ayuda";

/** Lo mínimo que un bloque necesita para decir qué días cubre y de qué fuente. */
export type PeriodoBloque = {
  fuente: Fuente;
  /** Último día con datos de la fuente ("datos hasta…"). */
  datosHasta: FechaISO | null;
  periodo: PeriodoFuente;
};

export const NOMBRE_FUENTE: Record<Fuente, string> = { gsc: "Search Console", ga4: "GA4", semrush: "SEMrush" };

/** Qué días cubre el bloque, hasta qué día tiene datos su fuente y contra qué se compara. */
export function LineaFuente({ bloque, hoy }: { bloque: PeriodoBloque; hoy: FechaISO }) {
  const p = bloque.periodo;
  return (
    <>
      {p.estado === "con-datos" && <span className="text-text-primary">{formatoRango(p.actual.desde, p.actual.hasta)} · </span>}
      {NOMBRE_FUENTE[bloque.fuente]}
      {bloque.datosHasta && ` · datos hasta el ${formatoFechaLarga(bloque.datosHasta, hoy.slice(0, 4))}`}
      {p.estado === "con-datos" && p.anterior && ` · vs. ${formatoRango(p.anterior.desde, p.anterior.hasta)}`}
    </>
  );
}

/** Encabezado de un bloque: qué mide y, si se pasa el bloque, la línea de su fuente. */
export function EncabezadoBloque({ titulo, bloque, hoy }: { titulo: string; bloque?: PeriodoBloque; hoy?: FechaISO }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <h2 className="text-title-3-semibold text-text-primary">{titulo}</h2>
      {bloque && hoy && (
        <p className="text-body-regular text-text-secondary">
          <LineaFuente bloque={bloque} hoy={hoy} />
        </p>
      )}
    </div>
  );
}

/** Aviso cuando el periodo todavía no tiene datos de la fuente. */
export function SinDatosAun() {
  return (
    <p className="rounded-2xl bg-background-secondary-default px-4 py-6 text-body-medium text-text-secondary">
      {AYUDA.mesSinDatos}
    </p>
  );
}
