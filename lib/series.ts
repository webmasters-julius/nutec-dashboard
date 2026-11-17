/**
 * Series de tiempo con cantidades sumables, y su agrupación por día, semana o
 * mes. Sin dependencias del servidor: se usa también en el navegador para
 * cambiar la agrupación de una gráfica sin volver a consultar los datos.
 */

import { diasEntre, finDeMes, inicioDeMes, inicioDeSemana, maxFecha, minFecha, sumarDias, type FechaISO } from "@/lib/fechas";

export type Unidad = "dia" | "semana" | "mes";

export const NOMBRE_UNIDAD: Record<Unidad, string> = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
};

/**
 * Punto de una serie con las cantidades sumables del día, la semana o el mes.
 * Las tasas se recalculan a partir de estas sumas en cada punto, nunca se
 * promedian.
 */
export type PuntoSumas<S> = {
  /** Día, lunes de la semana o primer día del mes. */
  fecha: FechaISO;
  /** Primer y último día del punto que caen dentro del periodo. */
  desde: FechaISO;
  hasta: FechaISO;
  /** Días del punto dentro del periodo. */
  diasPeriodo: number;
  /** Días con datos de la fuente; 0 significa sin medir (sumas = null). */
  diasConDatos: number;
  /** Días que tiene la unidad completa: 1, 7, o los días del mes. */
  diasUnidad: number;
  sumas: S | null;
};

/** Un punto que cubre menos días que su unidad completa no es comparable con los demás. */
export function puntoIncompleto(p: PuntoSumas<unknown>): boolean {
  return p.diasUnidad > 1 && p.diasConDatos < p.diasUnidad;
}

/** Inicio de la unidad (día, lunes o día 1) a la que pertenece una fecha, y cuántos días tiene completa. */
export function llaveYLargo(fecha: FechaISO, unidad: Unidad): [FechaISO, number] {
  switch (unidad) {
    case "dia":
      return [fecha, 1];
    case "semana":
      return [inicioDeSemana(fecha), 7];
    case "mes":
      return [inicioDeMes(fecha), diasEntre(inicioDeMes(fecha), finDeMes(fecha))];
    default: {
      const nunca: never = unidad;
      throw new Error(`Unidad desconocida: ${String(nunca)}`);
    }
  }
}

/** Agrupa una serie diaria (un punto por día del periodo) en días, semanas o meses. */
export function agruparPuntos<S>(
  diarios: PuntoSumas<S>[],
  unidad: Unidad,
  sumar: (a: S, b: S) => S,
): PuntoSumas<S>[] {
  const grupos = new Map<FechaISO, PuntoSumas<S>>();
  for (const d of diarios) {
    const [llave, diasUnidad] = llaveYLargo(d.fecha, unidad);
    const p = grupos.get(llave) ?? {
      fecha: llave,
      desde: d.fecha,
      hasta: d.fecha,
      diasPeriodo: 0,
      diasConDatos: 0,
      diasUnidad,
      sumas: null,
    };
    p.desde = minFecha(p.desde, d.fecha);
    p.hasta = maxFecha(p.hasta, d.fecha);
    p.diasPeriodo += d.diasPeriodo;
    p.diasConDatos += d.diasConDatos;
    if (d.sumas !== null) p.sumas = p.sumas === null ? d.sumas : sumar(p.sumas, d.sumas);
    grupos.set(llave, p);
  }
  return [...grupos.values()];
}

/** Serie diaria de un periodo: un punto por día, con null donde no hay datos. */
export function serieDiaria<F extends { fecha: FechaISO }, S>(
  desde: FechaISO,
  hasta: FechaISO,
  filas: F[],
  sumas: (f: F) => S,
): PuntoSumas<S>[] {
  const porDia = new Map(filas.map((f) => [f.fecha, f]));
  const puntos: PuntoSumas<S>[] = [];
  for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
    const f = porDia.get(fecha);
    puntos.push({ fecha, desde: fecha, hasta: fecha, diasPeriodo: 1, diasConDatos: f ? 1 : 0, diasUnidad: 1, sumas: f ? sumas(f) : null });
  }
  return puntos;
}
