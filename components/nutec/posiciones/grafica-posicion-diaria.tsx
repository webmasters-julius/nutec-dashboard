"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR_BANDA, COLOR_CONTORNO, COLOR_IA, COLOR_SIN_CITA } from "@/components/nutec/posiciones/paleta";
import { escalaPosicion, TRAMOS_BANDA } from "@/components/nutec/posiciones/tendencia-posicion";
import { diasDelRango, type FechaISO } from "@/lib/fechas";
import { formatoFechaCorta, formatoFechaLarga, SIN_MEDIR } from "@/lib/formato";
import { bandaDe } from "@/lib/posiciones";
import type { DiaBusqueda } from "@/lib/datos/estrategia";

/**
 * Posición rastreada diaria de una búsqueda (SVG propio):
 * - Eje invertido: la posición 1 va arriba. Escala comprimida, con las bandas
 *   de posición de fondo como regla.
 * - Los días en que NUTEC no apareció cortan la línea y se marcan, huecos, en
 *   un carril aparte abajo: no aparecer no es una posición.
 * - Los días sin medición no dibujan nada.
 * - Un carril arriba para la citación en IA: citada (amarillo), verificada
 *   sin cita (gris) o sin verificar (vacío).
 * - Una línea vertical punteada cuando cambia la página que aparece.
 * - Lector arriba: fecha, posición, página y citación del día bajo el cursor.
 *   En el celular se activa al tocar y se queda al levantar el dedo.
 * - El dibujo usa el ancho real del contenedor (no se escala): así los textos
 *   miden lo mismo en el celular que en la computadora.
 */

/** Ancho antes de medir el contenedor. */
const ANCHO_INICIAL = 640;
const ANCHO_MINIMO = 240;
/** Espacio que ocupa una etiqueta de fecha, para no encimarlas. */
const ANCHO_ETIQUETA = 56;
const H = 250;
const IZQ = 46;
const DER = 10;
const Y_IA = 14;
const ARRIBA = 34;
const ABAJO = 190;
const Y_AUSENTE = 212;
const Y_FECHAS = 240;
const COLOR_LINEA = "var(--color-chart-6-active)";

export function GraficaPosicionDiaria({
  dias,
  desde,
  hasta,
}: {
  /** Solo los días medidos. */
  dias: DiaBusqueda[];
  desde: FechaISO;
  hasta: FechaISO;
}) {
  const [activo, setActivo] = useState<number | null>(null);
  const [W, setAncho] = useState(ANCHO_INICIAL);
  const contenedor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.max(ANCHO_MINIMO, Math.round(entrada.contentRect.width))));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  const fechas = diasDelRango(desde, hasta);
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const puntos = fechas.map((f) => porFecha.get(f) ?? null);

  const posiciones = dias.map((d) => d.posicion).filter((p): p is number => p !== null);
  // El eje llega hasta un poco más abajo de la peor posición del periodo.
  const fondo = Math.min(100, Math.max(10, Math.ceil(Math.max(0, ...posiciones) * 1.12)));
  const x = (i: number) => (fechas.length === 1 ? IZQ + (W - IZQ - DER) / 2 : IZQ + (i * (W - IZQ - DER)) / (fechas.length - 1));
  const y = (p: number) => ARRIBA + (escalaPosicion(p) / escalaPosicion(fondo)) * (ABAJO - ARRIBA);

  // Tramos de línea: se cortan donde no apareció o no se midió.
  const tramos: [number, number][][] = [];
  let tramo: [number, number][] = [];
  puntos.forEach((d, i) => {
    if (d && d.posicion !== null) tramo.push([x(i), y(d.posicion)]);
    else {
      if (tramo.length) tramos.push(tramo);
      tramo = [];
    }
  });
  if (tramo.length) tramos.push(tramo);

  // Cambios de página entre días consecutivos en que apareció.
  const cambiosPagina: number[] = [];
  let paginaPrevia: string | null = null;
  puntos.forEach((d, i) => {
    if (!d || d.posicion === null || !d.pagina) return;
    if (paginaPrevia !== null && d.pagina !== paginaPrevia) cambiosPagina.push(i);
    paginaPrevia = d.pagina;
  });

  const marcas = [1, 3, 10, 15, 30, 50, 100].filter((v) => v <= fondo);
  const paso = Math.max(1, Math.ceil(fechas.length / Math.max(2, Math.floor((W - IZQ - DER) / ANCHO_ETIQUETA))));
  const conPuntos = fechas.length <= 45;
  const dia = activo !== null ? puntos[activo] : undefined;

  const alMover = (e: React.PointerEvent<SVGRectElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const fraccion = (e.clientX - caja.left) / caja.width;
    setActivo(Math.min(fechas.length - 1, Math.max(0, Math.round(fraccion * (fechas.length - 1)))));
  };

  return (
    <div ref={contenedor} className="flex flex-col gap-2">
      <div className="flex min-h-16 flex-col justify-center gap-0.5" aria-live="polite">
        {activo === null ? (
          <p className="text-body-medium text-text-tertiary">Pasa el cursor sobre la gráfica para ver cada día</p>
        ) : (
          <>
            <p className="text-body-medium text-text-secondary">{formatoFechaLarga(fechas[activo])}</p>
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-title-2-medium text-text-primary tabular-nums">
                {!dia ? (
                  <span className="text-text-tertiary">{SIN_MEDIR}</span>
                ) : dia.posicion === null ? (
                  "No apareció"
                ) : (
                  `Posición ${dia.posicion}`
                )}
              </span>
              {dia && (
                <span className="text-body-medium text-text-secondary">
                  {dia.citada === null ? `IA ${SIN_MEDIR}` : dia.citada ? "Citada en IA" : "Verificada, sin cita"}
                </span>
              )}
            </p>
            {dia?.pagina && <p className="truncate text-body-regular text-text-tertiary">{dia.pagina}</p>}
          </>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full touch-pan-y" role="img" aria-label="Posición rastreada por día">
        {/* Bandas de fondo */}
        {TRAMOS_BANDA.filter((t) => t.desde < fondo).map((t) => (
          <rect
            key={t.banda}
            x={IZQ}
            y={y(t.desde)}
            width={W - IZQ - DER}
            height={Math.max(0, y(Math.min(t.hasta, fondo)) - y(t.desde))}
            fill={COLOR_BANDA[t.banda]}
            opacity={0.1}
          />
        ))}
        {marcas.map((v) => (
          <text key={v} x={IZQ - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--color-text-tertiary)">
            {v}
          </text>
        ))}

        {/* Carriles */}
        <text x={IZQ - 8} y={Y_IA + 4} textAnchor="end" fontSize={11} fill="var(--color-text-tertiary)">
          IA
        </text>
        <text x={IZQ - 8} y={Y_AUSENTE + 4} textAnchor="end" fontSize={11} fill="var(--color-text-tertiary)">
          Fuera
        </text>
        <line x1={IZQ} y1={Y_AUSENTE} x2={W - DER} y2={Y_AUSENTE} stroke={COLOR_CONTORNO} strokeDasharray="2 4" opacity={0.6} />

        {cambiosPagina.map((i) => (
          <line key={i} x1={x(i)} y1={ARRIBA} x2={x(i)} y2={ABAJO} stroke="var(--color-text-tertiary)" strokeDasharray="3 3" opacity={0.7} />
        ))}

        {tramos.map((t, i) => (
          <polyline
            key={i}
            points={t.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}
            fill="none"
            stroke={COLOR_LINEA}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {puntos.map((d, i) => {
          if (!d) return null;
          return (
            <g key={i}>
              {d.citada === true && <circle cx={x(i)} cy={Y_IA} r={4} fill={COLOR_IA} />}
              {d.citada === false && <circle cx={x(i)} cy={Y_IA} r={2} fill={COLOR_SIN_CITA} stroke={COLOR_CONTORNO} strokeWidth={0.5} />}
              {d.posicion === null ? (
                <circle cx={x(i)} cy={Y_AUSENTE} r={3} fill="var(--color-background-secondary-default)" stroke={COLOR_CONTORNO} strokeWidth={1.5} />
              ) : (
                (conPuntos || tramos.some((t) => t.length === 1 && t[0][0] === x(i))) && (
                  <circle
                    cx={x(i)}
                    cy={y(d.posicion)}
                    r={3}
                    fill={COLOR_BANDA[bandaDe(1, d.posicion)]}
                    stroke="var(--color-background-secondary-default)"
                    strokeWidth={1}
                  />
                )
              )}
            </g>
          );
        })}

        {fechas.map((f, i) =>
          // Etiquetas espaciadas; la última siempre, salvo que quede pegada a la anterior.
          (i % paso === 0 && fechas.length - 1 - i >= paso / 2) || i === fechas.length - 1 ? (
            <text
              key={f}
              x={x(i)}
              y={Y_FECHAS}
              // La primera y la última etiqueta se alinean hacia dentro para que no se corten.
              textAnchor={i === 0 ? "start" : i === fechas.length - 1 ? "end" : "middle"}
              fontSize={11}
              fill="var(--color-text-tertiary)"
            >
              {formatoFechaCorta(f)}
            </text>
          ) : null,
        )}

        {activo !== null && (
          <line x1={x(activo)} y1={Y_IA - 8} x2={x(activo)} y2={Y_AUSENTE + 8} stroke="var(--color-chart-cursor)" strokeDasharray="4 4" />
        )}
        <rect
          x={IZQ - 6}
          y={0}
          width={W - IZQ - DER + 12}
          height={Y_AUSENTE + 12}
          fill="transparent"
          onPointerMove={alMover}
          onPointerDown={alMover}
          // Con el dedo, "salir" ocurre al levantarlo: la lectura se queda hasta tocar otro día.
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setActivo(null);
          }}
        />
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-regular text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: COLOR_LINEA }} aria-hidden />
          Posición rastreada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: COLOR_IA }} aria-hidden />
          Citada en IA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border" style={{ borderColor: COLOR_CONTORNO }} aria-hidden />
          No apareció
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 border-l border-dashed border-text-tertiary" aria-hidden />
          Cambió la página
        </span>
      </div>
    </div>
  );
}
