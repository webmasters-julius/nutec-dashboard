"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { formatoRango, SIN_MEDIR } from "@/lib/formato";

/**
 * Minigráfica (sparkline) de un indicador: la evolución del periodo, sin ejes.
 * Al pasar el cursor muestra el día (o la semana) y su cifra.
 *
 * - Días sin datos: la línea se corta (nunca cero).
 * - Semanas incompletas en conteos: la línea se corta para no simular una
 *   caída; la lectura da la cifra y cuántos días cubre.
 * - Posición: eje invertido, para que subir en la gráfica sea mejorar.
 * - Nunca queda en blanco: un tramo sin vecinos se marca con un punto, y una
 *   semana incompleta, con un punto atenuado.
 */

export type PuntoMini = {
  fecha: string;
  desde: string;
  hasta: string;
  /** Valor real del punto (null = sin medir). */
  valor: number | null;
  /** Valor que se dibuja (null corta la línea). */
  dibujado: number | null;
  /** Días con datos, cuando el punto es una semana incompleta. */
  diasIncompletos: number | null;
};

export function Minigrafica({
  puntos,
  formato,
  color,
  invertida = false,
  nombre,
}: {
  puntos: PuntoMini[];
  formato: (n: number) => string;
  color: string;
  invertida?: boolean;
  nombre: string;
}) {
  const id = useId().replace(/:/g, "");
  const datos = puntos.map((p, i) => ({
    ...p,
    // Cifra de una semana incompleta: va como punto atenuado, fuera de la línea.
    parcial: p.dibujado === null ? p.valor : null,
    // Se dibuja pero sus vecinos no: sin un punto, no se vería.
    solo: p.dibujado !== null && (puntos[i - 1]?.dibujado ?? null) === null && (puntos[i + 1]?.dibujado ?? null) === null,
  }));
  const puntoSolo = ({ cx, cy, index, payload }: { cx?: number; cy?: number; index?: number; payload?: { solo: boolean } }) =>
    payload?.solo && cx !== undefined && cy !== undefined ? <circle key={index} cx={cx} cy={cy} r={2.5} fill={color} /> : <g key={index} />;
  return (
    <div className="h-14 w-full" role="img" aria-label={`Evolución de ${nombre} en el periodo`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={`mini-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide reversed={invertida} domain={["dataMin", "dataMax"]} />
          <Tooltip
            cursor={{ stroke: "var(--color-chart-cursor)", strokeWidth: 1, strokeDasharray: "3 3" }}
            allowEscapeViewBox={{ x: false, y: true }}
            wrapperStyle={{ zIndex: 20, outline: "none" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as PuntoMini | undefined;
              if (!active || !p) return null;
              return (
                <div className="flex flex-col gap-0.5 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1.5 shadow-dropdown">
                  <span className="text-caption-1-medium whitespace-nowrap text-text-secondary">
                    {formatoRango(p.desde, p.hasta)}
                    {p.diasIncompletos !== null && ` · ${p.diasIncompletos} de 7 días`}
                  </span>
                  <span className="text-body-medium text-text-primary tabular-nums">
                    {p.valor === null ? <span className="text-text-tertiary">{SIN_MEDIR}</span> : formato(p.valor)}
                  </span>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="dibujado"
            stroke={color}
            strokeWidth={2}
            fill={`url(#mini-${id})`}
            baseValue={invertida ? "dataMax" : "dataMin"}
            connectNulls={false}
            dot={puntoSolo}
            activeDot={{ r: 3.5, stroke: "var(--color-background-primary-default)", strokeWidth: 2, fill: color }}
            isAnimationActive={false}
          />
          <Area
            dataKey="parcial"
            stroke="none"
            fill="none"
            dot={{ r: 2.5, fill: color, fillOpacity: 0.45, stroke: "none" }}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
