"use client";

import { useId, useState } from "react";
import { LinkButton } from "@/components/base/buttons/link-button";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { Select, SelectItem } from "@/components/base/select/select";
import { Ayuda } from "@/components/nutec/ayuda";
import { ChipRol } from "@/components/nutec/posiciones/chip-rol";
import { COLOR_IA, COLOR_SIN_CITA, NOMBRE_ROL } from "@/components/nutec/posiciones/paleta";
import { CADA, EtiquetaEje, rotuloTramo, SelectorUnidad, unidadInicial } from "@/components/nutec/posiciones/selector-unidad";
import { formatoEntero, formatoFechaCorta, SIN_MEDIR } from "@/lib/formato";
import { ORDEN_ROL, type Rol } from "@/lib/posiciones";
import type { Unidad } from "@/lib/series";
import { AYUDA } from "@/lib/textos-ayuda";
import type { BusquedaIa, DiaIa, SeriePorUnidad } from "@/lib/datos/estrategia";
import { cx } from "@/utils/cx";

/**
 * Citación en el resumen de IA de Google, en dos niveles:
 *
 * 1. General: tendencia por día, semana o mes. Dos líneas sobre las búsquedas
 *    verificadas: en cuántas Google mostró un resumen de IA y en cuántas NUTEC
 *    fue citada. La distancia entre ambas es la oportunidad. En semana y mes
 *    cada búsqueda cuenta una vez (al menos un día del tramo); una semana o
 *    un mes incompletos no entran en la línea y su punto va atenuado.
 * 2. Por búsqueda: una tabla con los días con resumen de IA y los días citada
 *    de cada búsqueda.
 *
 * Un día o una búsqueda sin verificación dicen s/m, nunca cero.
 */

// ── Nivel general: tendencia ──────────────────────────────────────────────

const ANCHO = 1000;
const ALTO = 200;

function topeDe(maximo: number): number {
  if (maximo <= 4) return 4;
  const paso = maximo <= 20 ? 4 : maximo <= 50 ? 10 : 20;
  return Math.ceil(maximo / paso) * paso;
}

/** Tramos continuos de la serie: una línea no cruza los días sin verificación. */
function tramos(valores: (number | null)[]): { i: number; v: number }[][] {
  const lista: { i: number; v: number }[][] = [];
  let actual: { i: number; v: number }[] = [];
  valores.forEach((v, i) => {
    if (v === null) {
      if (actual.length) lista.push(actual);
      actual = [];
    } else actual.push({ i, v });
  });
  if (actual.length) lista.push(actual);
  return lista;
}

function TendenciaIa({ series }: { series: SeriePorUnidad<DiaIa> }) {
  const [unidad, setUnidad] = useState<Unidad>(() => unidadInicial(series.dia.length));
  const [activo, setActivo] = useState<number | null>(null);
  const idRelleno = `relleno-citadas-ia-${useId().replace(/:/g, "")}`;
  const dias = series[unidad];
  const n = dias.length;
  const tope = topeDe(Math.max(0, ...dias.map((d) => d.conResumen ?? 0)));
  const x = (i: number) => ((i + 0.5) / n) * ANCHO;
  const y = (v: number) => ALTO - (v / tope) * ALTO;
  const linea = (t: { i: number; v: number }[]) => t.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i)},${y(p.v)}`).join(" ");
  const area = (t: { i: number; v: number }[]) => `${linea(t)} L${x(t[t.length - 1].i)},${ALTO} L${x(t[0].i)},${ALTO} Z`;
  // Un tramo incompleto no es comparable con los demás: no entra en la línea.
  const conResumen = tramos(dias.map((d) => (d.incompleta ? null : d.conResumen)));
  const citadas = tramos(dias.map((d) => (d.incompleta ? null : d.citadas)));
  const dia = activo !== null ? dias[activo] : null;
  const cadaCuantos = Math.max(1, Math.ceil(n / 7));
  // Con pocos días se marca cada punto: así un día verificado aislado no desaparece.
  const conPuntos = n <= 31;
  const punto = (i: number, v: number, clase: string, color?: string) => (
    <span
      key={`${clase}-${i}`}
      className={cx("pointer-events-none absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full", clase, dias[i].incompleta && "opacity-45")}
      style={{
        left: `${((i + 0.5) / n) * 100}%`,
        bottom: `${(v / tope) * 100}%`,
        background: color,
      }}
      aria-hidden
    />
  );

  return (
    <section
      className="flex min-w-0 flex-col gap-4 rounded-3xl bg-background-secondary-default p-4"
      aria-label="Citación en IA en el tiempo"
      onMouseLeave={() => setActivo(null)}
    >
      <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-start sm:justify-between">
        {/* Sin aria-live: cada punto es un botón que ya dice su fecha y sus cifras. */}
        <div className="flex min-h-14 flex-col justify-center gap-1">
          {dia ? (
            <>
              <p className="text-body-medium text-text-secondary">{rotuloTramo(dia)}</p>
              <p className="flex flex-wrap items-baseline gap-x-3 text-title-2-medium text-text-primary tabular-nums">
                {dia.citadas === null || dia.conResumen === null ? (
                  <span className="text-text-tertiary">{SIN_MEDIR}</span>
                ) : (
                  <>
                    {formatoEntero(dia.citadas)} {dia.citadas === 1 ? "búsqueda citada" : "búsquedas citadas"} en IA
                    <span className="text-body-medium text-text-secondary">
                      {formatoEntero(dia.conResumen)} con resumen de IA · {formatoEntero(dia.verificadas)} verificadas
                    </span>
                  </>
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
        <div className="flex h-48 w-6 shrink-0 flex-col justify-between text-end text-caption-1-medium text-text-tertiary tabular-nums" aria-hidden>
          <span className="-translate-y-1/2">{tope}</span>
          <span>{tope / 2}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="relative h-48">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
              <span className="border-t border-dashed border-separator-border" />
              <span className="border-t border-dashed border-separator-border" />
              <span className="border-t border-separator-border" />
            </div>
            <svg
              viewBox={`0 0 ${ANCHO} ${ALTO}`}
              preserveAspectRatio="none"
              className="absolute inset-0 size-full overflow-visible text-text-tertiary"
              aria-hidden
            >
              <defs>
                <linearGradient id={idRelleno} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_IA} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={COLOR_IA} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              {conResumen.map((t) => (
                <path
                  key={`r${t[0].i}`}
                  d={linea(t)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {citadas.map((t) => (
                <g key={`c${t[0].i}`}>
                  <path d={area(t)} fill={`url(#${idRelleno})`} />
                  <path d={linea(t)} fill="none" stroke={COLOR_IA} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </g>
              ))}
            </svg>
            {dias.map((d, i) => {
              if (d.citadas === null || d.conResumen === null) return null;
              if (!conPuntos && i !== activo) return null;
              return [punto(i, d.conResumen, "bg-text-tertiary"), punto(i, d.citadas, "", COLOR_IA)];
            })}
            <div className="absolute inset-0 flex">
              {dias.map((d, i) => (
                <button
                  key={d.fecha}
                  type="button"
                  onMouseEnter={() => setActivo(i)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  onClick={() => setActivo(i)}
                  aria-label={
                    d.citadas === null
                      ? `${rotuloTramo(d)}: sin medir`
                      : `${rotuloTramo(d)}: ${d.citadas} ${d.citadas === 1 ? "búsqueda citada" : "búsquedas citadas"} en IA, ${d.conResumen} con resumen de IA`
                  }
                  className="flex h-full min-w-0 flex-1 cursor-pointer justify-center outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  {activo === i && <span className="h-full border-l border-border-button-default" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex" aria-hidden>
            {dias.map((d, i) => (
              <EtiquetaEje key={d.fecha} i={i} n={n}>
                {i % cadaCuantos === 0 && formatoFechaCorta(d.fecha)}
              </EtiquetaEje>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-2 rounded-2lg bg-background-primary-default px-3 py-2 text-body-medium text-text-secondary">
          <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: COLOR_IA }} aria-hidden />
          Citadas en IA
        </span>
        <span className="flex items-center gap-2 rounded-2lg bg-background-primary-default px-3 py-2 text-body-medium text-text-secondary">
          <span className="w-4 shrink-0 border-t-2 border-dashed border-text-tertiary" aria-hidden />
          Con resumen de IA
        </span>
      </div>
    </section>
  );
}

// ── Nivel búsqueda: tabla ─────────────────────────────────────────────────

type Filtro = "todas" | "citadas" | "sin-cita";
const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: "todas", nombre: "Todas" },
  { id: "citadas", nombre: "Citadas en IA" },
  { id: "sin-cita", nombre: "Con resumen de IA y sin cita" },
];
const FILAS_VISIBLES = 8;
const TODOS = "todos";
// La rejilla de columnas entra hasta `xl`: antes no queda ancho para el nombre de la búsqueda.
const COLUMNAS = "xl:grid-cols-[minmax(0,1fr)_160px_150px_210px]";

function TablaIa({ busquedas, onAbrir }: { busquedas: BusquedaIa[]; onAbrir: (id: string) => void }) {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [cluster, setCluster] = useState<string>(TODOS);
  const [rol, setRol] = useState<Rol | typeof TODOS>(TODOS);
  const [todas, setTodas] = useState(false);
  // Los clusters, en el orden en que llegan las búsquedas (el de la estrategia).
  const clusters = [...new Set(busquedas.map((b) => b.clusterNombre))];
  const roles = (Object.keys(ORDEN_ROL) as Rol[]).sort((a, b) => ORDEN_ROL[a] - ORDEN_ROL[b]);

  const filtradas = busquedas
    .filter((b) => (filtro === "citadas" ? b.diasCitada > 0 : filtro === "sin-cita" ? b.diasConResumen > 0 && b.diasCitada === 0 : true))
    .filter((b) => cluster === TODOS || b.clusterNombre === cluster)
    .filter((b) => rol === TODOS || b.rol === rol)
    // Primero las más citadas, después las que tienen resumen de IA, al final las que no se midieron.
    .sort(
      (a, b) =>
        Number(b.diasVerificados > 0) - Number(a.diasVerificados > 0) ||
        b.diasCitada - a.diasCitada ||
        b.diasConResumen - a.diasConResumen ||
        a.keyword.localeCompare(b.keyword),
    );
  const lista = todas ? filtradas : filtradas.slice(0, FILAS_VISIBLES);
  const dias = (n: number, de: number) => `${n} de ${de} ${de === 1 ? "día" : "días"}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <h3 className="text-headline-medium text-text-primary">Citación por búsqueda</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filtrar por cluster"
            className="w-[190px] shrink-0"
            selectedKey={cluster}
            onSelectionChange={(k) => {
              if (k) {
                setCluster(String(k));
                setTodas(false);
              }
            }}
          >
            {[TODOS, ...clusters].map((c) => (
              <SelectItem key={c} id={c} textValue={c === TODOS ? "Todos los clusters" : c}>
                {c === TODOS ? "Todos los clusters" : c}
              </SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Filtrar por tipo de búsqueda"
            className="w-[170px] shrink-0"
            selectedKey={rol}
            onSelectionChange={(k) => {
              if (k) {
                setRol(k as Rol | typeof TODOS);
                setTodas(false);
              }
            }}
          >
            {[TODOS, ...roles].map((r) => (
              <SelectItem key={r} id={r} textValue={r === TODOS ? "Todos los tipos" : NOMBRE_ROL[r as Rol]}>
                {r === TODOS ? "Todos los tipos" : NOMBRE_ROL[r as Rol]}
              </SelectItem>
            ))}
          </Select>
          <SegmentedControl
            aria-label="Filtrar por citación en IA"
            selectedKeys={new Set([filtro])}
            onSelectionChange={(keys) => {
              const k = [...keys][0] as Filtro | undefined;
              if (k) {
                setFiltro(k);
                setTodas(false);
              }
            }}
            className="max-w-full overflow-x-auto"
          >
            {FILTROS.map((f) => (
              <SegmentedControlItem key={f.id} id={f.id}>
                {f.nombre}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      </div>

      <div className="rounded-2xl border border-border-table bg-background-primary-default">
        <div className={cx("hidden items-center gap-3 border-b border-separator-border px-3 py-2 text-caption-1-medium text-text-tertiary xl:grid", COLUMNAS)}>
          <span>Búsqueda</span>
          <span>Cluster</span>
          <span className="flex items-center gap-1">
            Con resumen de IA
            <Ayuda label="Con resumen de IA" hint={AYUDA.diasConResumenIa} />
          </span>
          <span className="flex items-center gap-1">
            Citada en IA
            <Ayuda label="Citada en IA" hint={AYUDA.citacionIa} />
          </span>
        </div>
        {lista.length === 0 && <p className="px-3 py-4 text-body-regular text-text-tertiary">Ninguna búsqueda en este grupo.</p>}
        <ul>
          {lista.map((b, i) => {
            const medida = b.diasVerificados > 0;
            return (
              <li key={b.id} className={cx(i > 0 && "border-t border-separator-border")}>
                <button
                  type="button"
                  onClick={() => onAbrir(b.id)}
                  className={cx(
                    "grid w-full cursor-pointer grid-cols-1 items-center gap-x-3 gap-y-1 px-3 py-2.5 text-start outline-none transition-colors duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring",
                    COLUMNAS,
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="min-w-0 break-words text-body-medium text-text-primary xl:truncate">{b.keyword}</span>
                    <ChipRol rol={b.rol} />
                  </span>
                  <span className="truncate text-body-regular text-text-secondary">{b.clusterNombre}</span>
                  <span className="text-body-regular text-text-secondary tabular-nums">
                    <span className="xl:hidden">Con resumen de IA: </span>
                    {medida ? dias(b.diasConResumen, b.diasVerificados) : <span className="text-text-tertiary">{SIN_MEDIR}</span>}
                  </span>
                  <span className="flex items-center gap-2 text-body-regular text-text-secondary tabular-nums">
                    <span className="xl:hidden">Citada en IA: </span>
                    {medida ? (
                      <>
                        <span className="hidden h-2 w-16 shrink-0 overflow-hidden rounded-full xl:block" style={{ background: COLOR_SIN_CITA }} aria-hidden>
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(b.diasCitada / b.diasVerificados) * 100}%`,
                              background: COLOR_IA,
                            }}
                          />
                        </span>
                        <span className={cx(b.diasCitada > 0 && "text-text-primary")}>{dias(b.diasCitada, b.diasVerificados)}</span>
                      </>
                    ) : (
                      <span className="text-text-tertiary">{SIN_MEDIR}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {filtradas.length > FILAS_VISIBLES && !todas && (
        <LinkButton onClick={() => setTodas(true)} className="self-start">
          Ver todas ({filtradas.length})
        </LinkButton>
      )}
    </div>
  );
}

export function VisibilidadIa({ series, busquedas, onAbrir }: { series: SeriePorUnidad<DiaIa>; busquedas: BusquedaIa[]; onAbrir: (id: string) => void }) {
  return (
    <>
      <TendenciaIa series={series} />
      <TablaIa busquedas={busquedas} onAbrir={onAbrir} />
    </>
  );
}
