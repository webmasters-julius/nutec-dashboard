/**
 * Fechas de calendario como texto ISO ("2026-11-05"), sin hora ni zona.
 *
 * Todas las tablas de nutec_marts usan columnas DATE, así que la aplicación
 * trabaja con días de calendario, no con instantes. La aritmética se hace en
 * UTC para que ningún cambio de horario mueva un día.
 */

export type FechaISO = string;

const PATRON_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaISO(valor: unknown): valor is FechaISO {
  if (typeof valor !== "string" || !PATRON_ISO.test(valor)) return false;
  const d = aUTC(valor);
  return !Number.isNaN(d.getTime()) && deUTC(d) === valor;
}

function aUTC(fecha: FechaISO): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function deUTC(d: Date): FechaISO {
  return d.toISOString().slice(0, 10);
}

export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const d = aUTC(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return deUTC(d);
}

/** Días entre dos fechas, contando ambas: del 1 al 4 son 4 días. */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aUTC(hasta).getTime() - aUTC(desde).getTime()) / 86_400_000) + 1;
}

export function inicioDeMes(fecha: FechaISO): FechaISO {
  return `${fecha.slice(0, 7)}-01`;
}

export function finDeMes(fecha: FechaISO): FechaISO {
  const d = aUTC(inicioDeMes(fecha));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return deUTC(d);
}

export function inicioDeMesAnterior(fecha: FechaISO): FechaISO {
  return inicioDeMes(sumarDias(inicioDeMes(fecha), -1));
}

/** Lunes de la semana de la fecha (semanas de lunes a domingo). */
export function inicioDeSemana(fecha: FechaISO): FechaISO {
  const diaSemana = aUTC(fecha).getUTCDay(); // 0 domingo … 6 sábado
  return sumarDias(fecha, -((diaSemana + 6) % 7));
}

export function minFecha(a: FechaISO, b: FechaISO): FechaISO {
  return a <= b ? a : b;
}

export function maxFecha(a: FechaISO, b: FechaISO): FechaISO {
  return a >= b ? a : b;
}

/** Cada día del rango, en orden. */
export function diasDelRango(desde: FechaISO, hasta: FechaISO): FechaISO[] {
  const dias: FechaISO[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push(f);
  return dias;
}

/** El día de hoy en la Ciudad de México, o el fijado en NUTEC_HOY para pruebas. */
export function hoyEnMexico(ahora: Date = new Date()): FechaISO {
  const fijo = process.env.NUTEC_HOY;
  if (fijo && esFechaISO(fijo)) return fijo;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

/** Para Intl: medianoche UTC del día, que se formatea con timeZone "UTC". */
export function fechaParaFormato(fecha: FechaISO): Date {
  return aUTC(fecha);
}
