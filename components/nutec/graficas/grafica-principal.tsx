"use client";

import { useId, useState } from "react";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectItem } from "@/components/base/select/select";
import { formatoCompacto, formatoEntero, formatoFechaCorta, formatoRango, SIN_MEDIR } from "@/lib/formato";
import { sumarGa4, sumarGsc, type SumasGa4, type SumasGsc } from "@/lib/metricas";
import { agruparPuntos, NOMBRE_UNIDAD, puntoIncompleto, type PuntoSumas, type Unidad } from "@/lib/series";
import { ROTULO } from "@/lib/textos-ayuda";

/**
 * Gráfica principal de una fila del resumen, construida desde cero con
 * Recharts y los tokens de gráfica de BoardUI, en dos estilos:
 *   barras  la serie principal en barras redondeadas y la otra en línea con
 *           puntos (GA4: sesiones y conversiones)
 *   area    las dos series como curvas suaves con su área degradada debajo
 *           (Search Console: impresiones y clics)
 * Cada serie tiene su propio eje, porque sus escalas son muy distintas.
 *
 * - Arriba, un lector: en reposo invita a pasar el cursor; sobre un punto
 *   (o al tocar una barra en el celular) muestra su fecha y sus cifras. El
 *   total del periodo no se repite aquí: ya está en las tarjetas.
 * - Un selector para agrupar por día, semana o mes (en el navegador, sin
 *   volver a consultar). El periodo lo controla el selector de fechas global.
 * - Debajo, la leyenda: solo color y nombre de cada serie.
 * - Días sin datos: sin barra y con la línea cortada (nunca cero). Semanas o
 *   meses incompletos: barra atenuada y línea cortada, con un punto atenuado
 *   en su lugar. Así la gráfica nunca queda en blanco cuando todos los tramos
 *   están incompletos (por ejemplo, "Mes actual" agrupado por mes).
 * - Un tramo completo sin vecinos (un solo punto) se marca con un punto: una
 *   curva de un solo punto no se ve.
 */

const COLORES = {
  barras: { principal: "var(--color-chart-2)", activa: "var(--color-chart-2-active)", linea: "var(--color-chart-6-active)" },
  area: { principal: "var(--color-chart-5-active)", activa: "var(--color-chart-5-active)", linea: "var(--color-chart-2-active)" },
} as const;

export type EstiloGrafica = keyof typeof COLORES;

const UNIDADES: Unidad[] = ["dia", "semana", "mes"];
const CADA: Record<Unidad, string> = { dia: "cada día", semana: "cada semana", mes: "cada mes" };

/** Agrupación inicial: por día hasta 90 días, por semana en rangos más largos. */
function unidadInicial(dias: number): Unidad {
  return dias > 90 ? "semana" : "dia";
}

type Serie<S> = { nombre: string; valor: (s: S) => number };

type Dato = {
  etiqueta: string;
  desde: string;
  hasta: string;
  barra: number | null;
  /** Valor que se dibuja en el estilo área (null corta la curva). */
  barraDibujada: number | null;
  linea: number | null;
  lineaDibujada: number | null;
  /** Cifra de un tramo incompleto: se marca con un punto atenuado, fuera de la curva. */
  barraParcial: number | null;
  lineaParcial: number | null;
  /** El tramo se dibuja pero sus vecinos no: sin un punto, no se vería. */
  barraSola: boolean;
  lineaSola: boolean;
  incompleta: boolean;
  diasConDatos: number;
  diasUnidad: number;
};

function Leyenda({ color, nombre, forma }: { color: string; nombre: string; forma: "barra" | "linea" | "area" }) {
  return (
    <span className="flex items-center gap-2 rounded-2lg bg-background-primary-default px-3 py-2 text-body-medium text-text-secondary">
      <span
        className={forma === "linea" ? "h-1 w-4 shrink-0 rounded-full" : "size-3 shrink-0 rounded-[4px]"}
        style={{ background: color }}
        aria-hidden
      />
      {nombre}
    </span>
  );
}

function GraficaPrincipal<S>({
  diario,
  sumar,
  barra,
  linea,
  etiqueta,
  estilo = "barras",
}: {
  diario: PuntoSumas<S>[];
  sumar: (a: S, b: S) => S;
  barra: Serie<S>;
  linea: Serie<S>;
  /** Nombre accesible de la gráfica. */
  etiqueta: string;
  estilo?: EstiloGrafica;
}) {
  const color = COLORES[estilo];
  const idDegradado = `area-${useId().replace(/:/g, "")}`;
  const [activo, setActivo] = useState<number | null>(null);
  const [unidad, setUnidad] = useState<Unidad>(() => unidadInicial(diario.length));
  const puntos = agruparPuntos(diario, unidad, sumar);

  const base = puntos.map((p) => {
    const incompleta = puntoIncompleto(p);
    const valorBarra = p.sumas ? barra.valor(p.sumas) : null;
    const valorLinea = p.sumas ? linea.valor(p.sumas) : null;
    return {
      etiqueta: formatoFechaCorta(p.fecha),
      desde: p.desde,
      hasta: p.hasta,
      barra: valorBarra,
      barraDibujada: incompleta ? null : valorBarra,
      linea: valorLinea,
      lineaDibujada: incompleta ? null : valorLinea,
      barraParcial: incompleta ? valorBarra : null,
      lineaParcial: incompleta ? valorLinea : null,
      incompleta,
      diasConDatos: p.diasConDatos,
      diasUnidad: p.diasUnidad,
    };
  });
  const sola = (i: number, campo: "barraDibujada" | "lineaDibujada") =>
    base[i][campo] !== null && (base[i - 1]?.[campo] ?? null) === null && (base[i + 1]?.[campo] ?? null) === null;
  const datos: Dato[] = base.map((d, i) => ({ ...d, barraSola: sola(i, "barraDibujada"), lineaSola: sola(i, "lineaDibujada") }));

  /** Punto de un tramo que se dibuja sin vecinos; en los demás no se marca nada. */
  const puntoSolo = (campo: "barraSola" | "lineaSola", relleno: string) =>
    function PuntoSolo({ cx, cy, index, payload }: { cx?: number; cy?: number; index?: number; payload?: Dato }) {
      return payload?.[campo] && cx !== undefined && cy !== undefined ? (
        <circle key={index} cx={cx} cy={cy} r={3.5} fill={relleno} stroke="var(--color-background-secondary-default)" strokeWidth={2} />
      ) : (
        <g key={index} />
      );
    };
  /** Punto atenuado de un tramo incompleto. */
  const puntoParcial = (relleno: string) => ({ r: 3.5, fill: relleno, fillOpacity: 0.45, stroke: "none" });

  const punto = activo !== null ? datos[activo] : undefined;
  const cifra = (n: number | null) => (n === null ? <span className="text-text-tertiary">{SIN_MEDIR}</span> : formatoEntero(n));
  const tick = { fontSize: 12, fill: "var(--color-text-tertiary)" };

  // Ratón, toque y teclado del gráfico llevan al mismo punto activo.
  const activar = (estado: { activeTooltipIndex?: number | string | null } | null | undefined) => {
    const i = estado?.activeTooltipIndex;
    if (i !== undefined && i !== null) setActivo(Number(i));
  };

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-3xl bg-background-secondary-default p-4" aria-label={etiqueta}>
      <div className="flex flex-col gap-3 px-1 pt-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-h-14 flex-col justify-center gap-1" aria-live="polite">
          {punto ? (
            <>
              <p className="text-body-medium text-text-secondary">
                {formatoRango(punto.desde, punto.hasta)}
                {punto.incompleta && ` · ${punto.diasConDatos} de ${punto.diasUnidad} días`}
              </p>
              <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-body-medium text-text-secondary">{barra.nombre}</span>
                  <span className="text-title-2-medium text-text-primary tabular-nums">{cifra(punto.barra)}</span>
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-body-medium text-text-secondary">{linea.nombre}</span>
                  <span className="text-title-2-medium text-text-primary tabular-nums">{cifra(punto.linea)}</span>
                </span>
              </p>
            </>
          ) : (
            <p className="text-body-medium text-text-tertiary">Pasa el cursor sobre la gráfica para ver {CADA[unidad]}</p>
          )}
        </div>
        <Select
          aria-label="Agrupar por"
          className="w-[120px] shrink-0"
          selectedKey={unidad}
          onSelectionChange={(k) => {
            if (k) {
              setUnidad(k as Unidad);
              setActivo(null);
            }
          }}
        >
          {UNIDADES.map((u) => (
            <SelectItem key={u} id={u} textValue={NOMBRE_UNIDAD[u]}>
              {NOMBRE_UNIDAD[u]}
            </SelectItem>
          ))}
        </Select>
      </div>

      <div className="h-[300px] w-full" onMouseLeave={() => setActivo(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={datos}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            barCategoryGap="22%"

            onMouseMove={activar}
            onClick={activar}
            onTouchStart={activar}
            onTouchMove={activar}
          >
            <CartesianGrid vertical={false} stroke="var(--color-chart-track)" strokeDasharray="4 4" />
            <YAxis yAxisId="barra" axisLine={false} tickLine={false} tickCount={4} width={44} tick={tick} tickFormatter={formatoCompacto} />
            <YAxis
              yAxisId="linea"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickCount={4}
              width={36}
              tick={tick}
              tickFormatter={formatoCompacto}
              allowDecimals={false}
            />
            <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tickMargin={12} minTickGap={24} tick={tick} />
            {/* Solo para saber qué punto está bajo el cursor; las cifras van en el lector de arriba. */}
            <Tooltip
              content={() => null}
              cursor={estilo === "area" ? { stroke: "var(--color-chart-cursor)", strokeWidth: 1, strokeDasharray: "4 4" } : false}
            />
            {estilo === "area" && (
              <defs>
                <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color.principal} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color.principal} stopOpacity={0.02} />
                </linearGradient>
                {/* El área de clics va encima de la de impresiones: un verde más denso
                    arriba evita que la mezcla con el morado se vea gris. */}
                <linearGradient id={`${idDegradado}-2`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                  <stop offset="55%" stopColor="var(--color-chart-2)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.06} />
                </linearGradient>
              </defs>
            )}
            {estilo === "area" ? (
              <Area
                yAxisId="barra"
                dataKey="barraDibujada"
                type="monotone"
                stroke={color.principal}
                strokeWidth={2.5}
                fill={`url(#${idDegradado})`}
                dot={puntoSolo("barraSola", color.principal)}
                activeDot={{ r: 6, fill: color.principal, stroke: "var(--color-background-secondary-default)", strokeWidth: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : (
            <Bar yAxisId="barra" dataKey="barra" radius={8} maxBarSize={36} isAnimationActive={false}>
              {datos.map((d, i) => {
                const resaltada = activo === i;
                const atenuada = d.incompleta || (activo !== null && !resaltada);
                return (
                  <Cell
                    key={i}
                    fill={resaltada ? color.activa : color.principal}
                    fillOpacity={atenuada ? 0.4 : 1}
                    className="transition-[fill-opacity] duration-150"
                  />
                );
              })}
            </Bar>
            )}
            {estilo === "area" ? (
              <Area
                yAxisId="linea"
                dataKey="lineaDibujada"
                type="monotone"
                stroke={color.linea}
                strokeWidth={2.5}
                fill={`url(#${idDegradado}-2)`}
                dot={puntoSolo("lineaSola", color.linea)}
                activeDot={{ r: 6, fill: color.linea, stroke: "var(--color-background-secondary-default)", strokeWidth: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : (
              <Line
                yAxisId="linea"
                dataKey="lineaDibujada"
                type="monotone"
                stroke={color.linea}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: color.linea, stroke: "var(--color-background-secondary-default)", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: color.linea, stroke: "var(--color-background-secondary-default)", strokeWidth: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {/* Tramos incompletos: un punto atenuado, sin unirlo a la curva. */}
            {estilo === "area" && (
              <Line
                yAxisId="barra"
                dataKey="barraParcial"
                stroke="none"
                dot={puntoParcial(color.principal)}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            <Line
              yAxisId="linea"
              dataKey="lineaParcial"
              stroke="none"
              dot={puntoParcial(color.linea)}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3">
        <Leyenda color={color.principal} nombre={barra.nombre} forma={estilo === "area" ? "area" : "barra"} />
        <Leyenda color={color.linea} nombre={linea.nombre} forma={estilo === "area" ? "area" : "linea"} />
      </div>
    </section>
  );
}

// ── Gráficas de cada fila ─────────────────────────────────────────────────

/** Impresiones y clics de Search Console, como dos curvas con área degradada. */
export function GraficaGsc({ diario }: { diario: PuntoSumas<SumasGsc>[] }) {
  return (
    <GraficaPrincipal
      estilo="area"
      etiqueta={ROTULO.graficaGsc}
      diario={diario}
      sumar={sumarGsc}
      barra={{ nombre: "Impresiones", valor: (s) => s.impresiones }}
      linea={{ nombre: "Clics", valor: (s) => s.clics }}
    />
  );
}

/** Sesiones (barras) y conversiones (línea) de GA4 orgánico. */
export function GraficaGa4({ diario }: { diario: PuntoSumas<SumasGa4>[] }) {
  return (
    <GraficaPrincipal
      etiqueta={ROTULO.graficaGa4}
      diario={diario}
      sumar={sumarGa4}
      barra={{ nombre: "Sesiones", valor: (s) => s.sesiones }}
      linea={{ nombre: "Conversiones", valor: (s) => s.conversiones }}
    />
  );
}
