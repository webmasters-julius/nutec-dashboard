/**
 * Periodos de fechas: qué días cubre cada atajo para cada fuente y contra qué
 * periodo se compara. Reglas en docs/03_Especificacion_Vistas.md, sección 3.
 *
 * - Cada fuente usa su propio último día con datos (Search Console tiene dos
 *   o tres días de retraso, GA4 uno), igual que sus propias interfaces.
 * - Comparación: inmediatamente anterior del mismo largo, salvo "Mes actual"
 *   (los mismos días del mes anterior, recortados a su último día) y
 *   "Mes anterior" (el mes calendario previo completo).
 * - No hay comparación si el periodo anterior empieza, aunque sea en parte,
 *   antes del primer día con datos de la fuente.
 */

import {
  diasEntre,
  esFechaISO,
  finDeMes,
  inicioDeMes,
  inicioDeMesAnterior,
  maxFecha,
  minFecha,
  sumarDias,
  type FechaISO,
} from "@/lib/fechas";

export type Fuente = "gsc" | "ga4" | "semrush";

/** Primer día con datos de cada fuente (CLAUDE.md, "Ventanas de datos"). */
export const PRIMER_DIA: Record<Fuente, FechaISO> = {
  gsc: "2026-01-01",
  ga4: "2026-01-01",
  semrush: "2026-08-04",
};

export const ATAJOS = ["ultimos-7", "ultimos-28", "mes-actual", "mes-anterior"] as const;
export type Atajo = (typeof ATAJOS)[number];

export const ATAJO_POR_DEFECTO: Atajo = "ultimos-28";

export const NOMBRE_ATAJO: Record<Atajo, string> = {
  "ultimos-7": "Últimos 7 días",
  "ultimos-28": "Últimos 28 días",
  "mes-actual": "Mes actual",
  "mes-anterior": "Mes anterior",
};

export type Seleccion =
  | { tipo: "atajo"; atajo: Atajo }
  | { tipo: "personalizado"; desde: FechaISO; hasta: FechaISO };

export type Ventana = { desde: FechaISO; hasta: FechaISO; dias: number };

export type PeriodoFuente =
  | {
      estado: "con-datos";
      actual: Ventana;
      /** null cuando no hay contra qué comparar. */
      anterior: Ventana | null;
    }
  /** El periodo pedido todavía no tiene ningún día con datos de esta fuente
   *  (por ejemplo, "Mes actual" en los primeros días del mes). */
  | { estado: "sin-datos-aun" };

/** Más de este número de días, las gráficas agrupan por semana. */
export const MAX_DIAS_GRAFICA_DIARIA = 90;

function ventana(desde: FechaISO, hasta: FechaISO): Ventana {
  return { desde, hasta, dias: diasEntre(desde, hasta) };
}

function anteriorDelMismoLargo(actual: Ventana): Ventana {
  const hasta = sumarDias(actual.desde, -1);
  return ventana(sumarDias(hasta, -(actual.dias - 1)), hasta);
}

/**
 * Resuelve los días de una selección para una fuente.
 *
 * @param ultimoDia último día con datos de la fuente (null si la tabla está vacía)
 * @param hoy día de hoy; define cuál es el "mes actual" y el "mes anterior"
 */
export function resolverPeriodo(
  seleccion: Seleccion,
  fuente: Fuente,
  ultimoDia: FechaISO | null,
  hoy: FechaISO,
): PeriodoFuente {
  if (!ultimoDia) return { estado: "sin-datos-aun" };
  const primerDia = PRIMER_DIA[fuente];

  let actual: Ventana;
  let anterior: Ventana;

  if (seleccion.tipo === "atajo") {
    switch (seleccion.atajo) {
      case "ultimos-7":
      case "ultimos-28": {
        const n = seleccion.atajo === "ultimos-7" ? 7 : 28;
        actual = ventana(sumarDias(ultimoDia, -(n - 1)), ultimoDia);
        anterior = anteriorDelMismoLargo(actual);
        break;
      }
      case "mes-actual": {
        const inicio = inicioDeMes(hoy);
        if (ultimoDia < inicio) return { estado: "sin-datos-aun" };
        actual = ventana(inicio, minFecha(ultimoDia, finDeMes(hoy)));
        const inicioAnterior = inicioDeMesAnterior(hoy);
        anterior = ventana(
          inicioAnterior,
          minFecha(sumarDias(inicioAnterior, actual.dias - 1), finDeMes(inicioAnterior)),
        );
        break;
      }
      case "mes-anterior": {
        const inicio = inicioDeMesAnterior(hoy);
        // Si la fuente aún no cierra el mes, el periodo llega hasta su último día.
        const hasta = minFecha(finDeMes(inicio), ultimoDia);
        if (hasta < inicio) return { estado: "sin-datos-aun" };
        actual = ventana(inicio, hasta);
        const inicioAnterior = inicioDeMesAnterior(inicio);
        // Mes cerrado: se compara contra el mes previo completo. Si la fuente aún
        // no lo cierra (los primeros días del mes siguiente), contra los mismos
        // días del mes previo: comparar 28 días contra 31 daría una caída falsa.
        anterior =
          hasta === finDeMes(inicio)
            ? ventana(inicioAnterior, finDeMes(inicioAnterior))
            : ventana(inicioAnterior, minFecha(sumarDias(inicioAnterior, actual.dias - 1), finDeMes(inicioAnterior)));
        break;
      }
      default: {
        const nunca: never = seleccion.atajo;
        throw new Error(`Atajo desconocido: ${String(nunca)}`);
      }
    }
  } else {
    const desde = maxFecha(seleccion.desde, primerDia);
    const hasta = minFecha(seleccion.hasta, ultimoDia);
    if (hasta < desde) return { estado: "sin-datos-aun" };
    actual = ventana(desde, hasta);
    anterior = anteriorDelMismoLargo(actual);
  }

  // Un periodo actual anterior al primer dato se recorta: esos días no existen.
  if (actual.desde < primerDia) actual = ventana(primerDia, actual.hasta);

  return {
    estado: "con-datos",
    actual,
    anterior: anterior.desde < primerDia ? null : anterior,
  };
}

export function granularidad(v: Ventana): "dia" | "semana" {
  return v.dias > MAX_DIAS_GRAFICA_DIARIA ? "semana" : "dia";
}

/** Lee la selección de los parámetros de la URL; cualquier valor inválido cae en el atajo por defecto. */
export function seleccionDesdeParametros(
  params: Record<string, string | string[] | undefined>,
  hoy: FechaISO,
): Seleccion {
  const uno = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const periodo = uno("periodo");
  if (periodo === "personalizado") {
    const desde = uno("desde");
    const hasta = uno("hasta");
    if (esFechaISO(desde) && esFechaISO(hasta) && desde <= hasta && desde <= hoy) {
      return { tipo: "personalizado", desde, hasta: minFecha(hasta, hoy) };
    }
  }
  if ((ATAJOS as readonly string[]).includes(periodo ?? "")) {
    return { tipo: "atajo", atajo: periodo as Atajo };
  }
  return { tipo: "atajo", atajo: ATAJO_POR_DEFECTO };
}

export function parametrosDeSeleccion(s: Seleccion): Record<string, string> {
  return s.tipo === "atajo"
    ? { periodo: s.atajo }
    : { periodo: "personalizado", desde: s.desde, hasta: s.hasta };
}
