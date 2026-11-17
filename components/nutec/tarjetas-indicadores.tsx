"use client";

import type { ComponentType } from "react";
import {
  RiCheckboxCircleLine,
  RiCursorLine,
  RiEyeLine,
  RiLoginBoxLine,
  RiPercentLine,
  RiSortNumberAsc,
} from "@remixicon/react";
import { Ayuda } from "@/components/nutec/ayuda";
import { Minigrafica, type PuntoMini } from "@/components/nutec/graficas/minigrafica";
import { Chip } from "@/components/base/badges/chip";
import { formatoEntero, formatoPorcentaje, formatoPosicion, SIN_MEDIR } from "@/lib/formato";
import { ctr, posicionPromedio, type SumasGsc } from "@/lib/metricas";
import type { CambioIndicador, Indicador } from "@/lib/datos/resumen";
import { puntoIncompleto, type PuntoSumas } from "@/lib/series";
import { cx } from "@/utils/cx";

/**
 * Indicadores en tarjetas separadas, una por cifra, con espacio entre ellas:
 * cada una con su nombre y fuente, su ícono de ayuda, su cambio y, si se
 * pasa, una minigráfica de su evolución en el periodo.
 */

export type MetricaMini<S> = {
  /** Cómo obtener la cifra de un punto a partir de sus sumas. */
  valor: (s: S) => number | null;
  formato: (n: number) => string;
  /** Los conteos de una semana incompleta no se dibujan (simularían una caída). */
  esConteo: boolean;
  invertida?: boolean;
};

const COLOR_SENTIDO = {
  mejora: "var(--color-chart-7-active)",
  empeora: "var(--color-status-rose-text)",
  neutro: "var(--color-chart-4-active)",
};

function colorDe(c: CambioIndicador): string {
  if (c.estado !== "dato") return COLOR_SENTIDO.neutro;
  return c.sentido === "mejora" ? COLOR_SENTIDO.mejora : c.sentido === "empeora" ? COLOR_SENTIDO.empeora : COLOR_SENTIDO.neutro;
}

export function CambioChip({ cambio }: { cambio: CambioIndicador }) {
  switch (cambio.estado) {
    case "dato":
      return (
        <Chip
          variant="caption"
          color={cambio.sentido === "mejora" ? "lime" : cambio.sentido === "empeora" ? "rose" : "neutral"}
          className="tabular-nums"
        >
          {cambio.texto}
        </Chip>
      );
    case "sin-comparacion":
      return (
        <span className="flex items-center gap-1">
          <Chip variant="caption" color="neutral">
            {cambio.texto}
          </Chip>
          <Ayuda label={cambio.texto} hint={cambio.ayuda} />
        </span>
      );
    case "indefinido":
      return null;
    default: {
      const nunca: never = cambio;
      throw new Error(`Estado de cambio desconocido: ${JSON.stringify(nunca)}`);
    }
  }
}

export function ValorIndicador({ indicador, className }: { indicador: Indicador; className?: string }) {
  const v = indicador.valor;
  switch (v.estado) {
    case "dato":
      return <span className={cx("text-text-primary tabular-nums", className)}>{v.texto}</span>;
    case "sin-medir":
      return <span className={cx("text-text-tertiary", className)}>{SIN_MEDIR}</span>;
    case "no-disponible":
      return (
        <span className="flex items-center gap-1 text-body-medium text-text-secondary">
          {v.texto}
          <Ayuda label={v.texto} hint={v.ayuda} />
        </span>
      );
    default: {
      const nunca: never = v;
      throw new Error(`Estado de valor desconocido: ${JSON.stringify(nunca)}`);
    }
  }
}

/** Nombre del indicador con su ayuda. La fuente la dice el encabezado de la sección. */
export function NombreIndicador({ indicador }: { indicador: Indicador }) {
  return (
    <span className="flex items-center gap-1 text-body-medium text-text-secondary">
      <span>{indicador.nombre}</span>
      <Ayuda label={indicador.nombre} hint={indicador.ayuda} />
    </span>
  );
}

function puntosMini<S>(puntos: PuntoSumas<S>[], m: MetricaMini<S>): PuntoMini[] {
  return puntos.map((p) => {
    const valor = p.sumas === null ? null : m.valor(p.sumas);
    const incompleta = puntoIncompleto(p);
    return {
      fecha: p.fecha,
      desde: p.desde,
      hasta: p.hasta,
      valor,
      dibujado: incompleta && m.esConteo ? null : valor,
      diasIncompletos: incompleta ? p.diasConDatos : null,
    };
  });
}

type Icono = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

const ICONOS: Record<string, Icono> = {
  impresiones: RiEyeLine,
  clics: RiCursorLine,
  ctr: RiPercentLine,
  posicion: RiSortNumberAsc,
  sesiones: RiLoginBoxLine,
  conversiones: RiCheckboxCircleLine,
  "tasa-conversion": RiPercentLine,
};

/**
 * Tarjeta de un indicador, con la receta de las Stat Cards de BoardUI
 * (variante plain): ícono opcional, nombre con su ayuda, cifra con su cambio
 * y, si se pasa, una minigráfica de su evolución.
 */
function TarjetaIndicador<S>({
  indicador,
  puntos,
  metrica,
  conIcono,
}: {
  indicador: Indicador;
  puntos: PuntoSumas<S>[];
  metrica?: MetricaMini<S>;
  conIcono: boolean;
}) {
  const Icono = ICONOS[indicador.id] ?? RiPercentLine;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl bg-background-secondary-default p-4">
      {conIcono && (
        <span className="flex w-fit items-center rounded-md bg-stat-card-icon-background p-1.5">
          <Icono className="size-5 shrink-0 text-foreground-icon-primary" aria-hidden />
        </span>
      )}
      <div className="flex flex-col gap-0.5">
        <NombreIndicador indicador={indicador} />
        <div className="flex flex-wrap items-center gap-2">
          <ValorIndicador indicador={indicador} className="text-title-1-medium" />
          <CambioChip cambio={indicador.cambio} />
        </div>
      </div>
      {metrica && indicador.valor.estado === "dato" && (
        <Minigrafica
          puntos={puntosMini(puntos, metrica)}
          formato={metrica.formato}
          color={colorDe(indicador.cambio)}
          invertida={metrica.invertida}
          nombre={indicador.nombre}
        />
      )}
    </section>
  );
}

/** Fila de tarjetas separadas, una por indicador. */
export function FilaTarjetas<S>({
  indicadores,
  puntos,
  metricas = {},
  conIcono = true,
}: {
  indicadores: Indicador[];
  puntos: PuntoSumas<S>[];
  /** Minigráfica por id de indicador; los que no aparezcan van sin minigráfica. */
  metricas?: Partial<Record<string, MetricaMini<S>>>;
  conIcono?: boolean;
}) {
  return (
    <div className={cx("grid grid-cols-1 gap-4", indicadores.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4")}>
      {indicadores.map((ind) => (
        <TarjetaIndicador key={ind.id} indicador={ind} puntos={puntos} metrica={metricas[ind.id]} conIcono={conIcono} />
      ))}
    </div>
  );
}

// ── Tarjetas por fuente ──────────────────────────────────────────────

const METRICAS_GSC: Partial<Record<string, MetricaMini<SumasGsc>>> = {
  impresiones: { valor: (s) => s.impresiones, formato: formatoEntero, esConteo: true },
  clics: { valor: (s) => s.clics, formato: formatoEntero, esConteo: true },
  ctr: { valor: ctr, formato: formatoPorcentaje, esConteo: false },
  posicion: { valor: posicionPromedio, formato: formatoPosicion, esConteo: false, invertida: true },
};

export function TarjetasGsc({ indicadores, puntos }: { indicadores: Indicador[]; puntos: PuntoSumas<SumasGsc>[] }) {
  // Sin ícono: la tarjeta queda más baja y la minigráfica hace de elemento visual.
  return <FilaTarjetas indicadores={indicadores} puntos={puntos} metricas={METRICAS_GSC} conIcono={false} />;
}

export function TarjetasGa4({ indicadores }: { indicadores: Indicador[] }) {
  return <FilaTarjetas indicadores={indicadores} puntos={[]} />;
}

// ── Posiciones rastreadas · SEMrush ───────────────────────────────────────

/** Conteos de búsquedas por día (visibles, en top 10, en top 3). */
type ConteosDia = { visibles: number; top10: number; top3: number };

const METRICAS_RASTREADAS: Partial<Record<string, MetricaMini<ConteosDia>>> = {
  // No son conteos que se sumen entre días: cada punto es el conteo de ese día.
  visibles: { valor: (s) => s.visibles, formato: formatoEntero, esConteo: false },
  top10: { valor: (s) => s.top10, formato: formatoEntero, esConteo: false },
  top3: { valor: (s) => s.top3, formato: formatoEntero, esConteo: false },
};

/** Visibles, en top 10 y en top 3, con la minigráfica del conteo de cada día. */
export function TarjetasRastreadas({ indicadores, diario }: { indicadores: Indicador[]; diario: PuntoSumas<ConteosDia>[] }) {
  return <FilaTarjetas indicadores={indicadores} puntos={diario} metricas={METRICAS_RASTREADAS} conIcono={false} />;
}

/** Indicadores sin minigráfica ni ícono (por ejemplo, los de citación en IA). */
export function TarjetasSimples({ indicadores }: { indicadores: Indicador[] }) {
  return <FilaTarjetas indicadores={indicadores} puntos={[]} conIcono={false} />;
}
