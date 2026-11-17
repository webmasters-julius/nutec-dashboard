import "server-only";

import { diasDelRango, inicioDeSemana, maxFecha, minFecha, type FechaISO } from "@/lib/fechas";
import { formatoEntero, formatoPorcentaje, formatoPosicion, formatoRango, textoCambio } from "@/lib/formato";
import {
  SUMAS_GA4_VACIAS,
  SUMAS_GSC_VACIAS,
  calcularCambio,
  ctr,
  posicionPromedio,
  sumarGa4,
  sumarGsc,
  tasa,
  tasaConversion,
  tiempoPromedioPorSesion,
  type SumasGa4,
  type SumasGsc,
  type TipoCifra,
} from "@/lib/metricas";
import { granularidad, resolverPeriodo, type PeriodoFuente, type Seleccion, type Ventana } from "@/lib/periodos";
import { AYUDA, ROTULO } from "@/lib/textos-ayuda";
import { obtenerRepositorio } from "@/lib/datos";
import { agruparPuntos, serieDiaria, type PuntoSumas } from "@/lib/series";
import { ATAJOS, type Atajo } from "@/lib/periodos";
import { CANAL_ORGANICO } from "@/lib/datos/tipos";
import type { FilaGa4Dia, FilaGscDia } from "@/lib/datos/repositorio";

// ── Modelo que recibe la vista (serializable) ─────────────────────────────

export type ValorIndicador =
  | { estado: "dato"; texto: string }
  /** El dato no se midió: se muestra s/m, nunca 0. */
  | { estado: "sin-medir" }
  /** La cifra no existe para esta selección. */
  | { estado: "no-disponible"; texto: string; ayuda: string };

export type CambioIndicador =
  | { estado: "dato"; texto: string; sentido: "mejora" | "empeora" | "igual" }
  | { estado: "sin-comparacion"; texto: string; ayuda: string }
  /** Hay periodo anterior, pero el cambio no se puede expresar (anterior en cero o sin medir). */
  | { estado: "indefinido" };

export type Indicador = {
  id: string;
  nombre: string;
  fuente: "Search Console" | "GA4" | "SEMrush";
  ayuda: string;
  valor: ValorIndicador;
  cambio: CambioIndicador;
  /** Rango del periodo de comparación, por ejemplo "8 sep – 5 oct 2026". */
  comparadoCon: string | null;
};

export type { PeriodoBloque } from "@/components/nutec/encabezado-bloque";
import type { PeriodoBloque } from "@/components/nutec/encabezado-bloque";

export type PuntoSerie = {
  /** Día, o lunes de la semana. */
  fecha: FechaISO;
  desde: FechaISO;
  hasta: FechaISO;
  /** Días del punto dentro del periodo (7 en una semana completa, 1 en un día). */
  diasPeriodo: number;
  /** Días con datos de la fuente; 0 significa sin medir. */
  diasConDatos: number;
  a: number | null;
  b: number | null;
};

export type { PuntoSumas } from "@/lib/series";

/** Página de entrada con sus cifras de GA4 orgánico. */
export type FilaPagina = {
  path: string;
  sesiones: number;
  /** Segundos de interacción promedio por sesión; null sin sesiones. */
  tiempoPromedio: number | null;
  conversiones: number;
  /** null si la página no tuvo sesiones (la tasa no está definida). */
  tasaConversion: number | null;
};

export type PasoEmbudo = { id: string; nombre: string; ayuda: string; valor: number; deLaPrimera: number | null };

export type ModeloResumen = {
  hoy: FechaISO;
  gsc: PeriodoBloque & {
    indicadores: Indicador[];
    granularidad: "dia" | "semana";
    serie: PuntoSerie[];
    /** Puntos para las minigráficas, agrupados por día o semana según el largo del periodo. */
    puntos: PuntoSumas<SumasGsc>[];
    /** Un punto por día del periodo; la gráfica los agrupa por día, semana o mes. */
    diario: PuntoSumas<SumasGsc>[];
  };
  ga4: PeriodoBloque & {
    indicadores: Indicador[];
    granularidad: "dia" | "semana";
    serie: PuntoSerie[];
    /** Un punto por día del periodo; la gráfica los agrupa por día, semana o mes. */
    diario: PuntoSumas<SumasGa4>[];
    /** Días que cubre cada atajo para GA4, para mostrarlos en el selector de fechas. */
    rangosAtajos: Partial<Record<Atajo, { desde: FechaISO; hasta: FechaISO }>>;
    embudo: { pasos: PasoEmbudo[]; tasaConversion: number | null } | null;
  };
  paginas: FilaPagina[];
};

// ── Construcción ──────────────────────────────────────────────────────────

const total = <T>(filas: T[], sumar: (a: T, b: T) => T, vacio: T) => filas.reduce(sumar, vacio);

function cambio(
  tipo: TipoCifra,
  actual: number | null,
  anterior: number | null,
  hayAnterior: boolean,
): CambioIndicador {
  if (!hayAnterior) {
    return { estado: "sin-comparacion", texto: ROTULO.sinPeriodoComparacion, ayuda: AYUDA.sinPeriodoComparacion };
  }
  const c = calcularCambio(tipo, actual, anterior);
  const texto = textoCambio(c);
  return c.valor === null || !texto ? { estado: "indefinido" } : { estado: "dato", texto, sentido: c.sentido };
}

function valor(numero: number | null, formato: (n: number) => string): ValorIndicador {
  return numero === null ? { estado: "sin-medir" } : { estado: "dato", texto: formato(numero) };
}

function serie<F extends { fecha: FechaISO }>(
  v: Ventana,
  filas: F[],
  a: (f: F) => number,
  b: (f: F) => number,
): PuntoSerie[] {
  const porDia = new Map(filas.map((f) => [f.fecha, f]));
  if (granularidad(v) === "dia") {
    return diasDelRango(v.desde, v.hasta).map((fecha) => {
      const f = porDia.get(fecha);
      return { fecha, desde: fecha, hasta: fecha, diasPeriodo: 1, diasConDatos: f ? 1 : 0, a: f ? a(f) : null, b: f ? b(f) : null };
    });
  }
  const semanas = new Map<FechaISO, PuntoSerie>();
  for (const fecha of diasDelRango(v.desde, v.hasta)) {
    const lunes = inicioDeSemana(fecha);
    const p =
      semanas.get(lunes) ??
      ({ fecha: lunes, desde: fecha, hasta: fecha, diasPeriodo: 0, diasConDatos: 0, a: null, b: null } as PuntoSerie);
    p.desde = minFecha(p.desde, fecha);
    p.hasta = maxFecha(p.hasta, fecha);
    p.diasPeriodo += 1;
    const f = porDia.get(fecha);
    if (f) {
      p.diasConDatos += 1;
      p.a = (p.a ?? 0) + a(f);
      p.b = (p.b ?? 0) + b(f);
    }
    semanas.set(lunes, p);
  }
  return [...semanas.values()];
}

const sumasGscDe = (f: FilaGscDia): SumasGsc => ({
  impresiones: f.impresiones,
  clics: f.clics,
  posicionPorImpresiones: f.posicionPorImpresiones,
});
const sumasGa4De = (f: FilaGa4Dia): SumasGa4 => ({
  sesiones: f.sesiones,
  sesionesConEngagement: f.sesionesConEngagement,
  conversiones: f.conversiones,
  sesionesConConversion: f.sesionesConConversion,
  segundosInteraccion: f.segundosInteraccion,
});

function rangosAtajos(datosHasta: FechaISO | null, hoy: FechaISO): Partial<Record<Atajo, { desde: FechaISO; hasta: FechaISO }>> {
  const r: Partial<Record<Atajo, { desde: FechaISO; hasta: FechaISO }>> = {};
  for (const atajo of ATAJOS) {
    const p = resolverPeriodo({ tipo: "atajo", atajo }, "ga4", datosHasta, hoy);
    if (p.estado === "con-datos") r[atajo] = { desde: p.actual.desde, hasta: p.actual.hasta };
  }
  return r;
}

function comparadoCon(p: PeriodoFuente): string | null {
  return p.estado === "con-datos" && p.anterior ? formatoRango(p.anterior.desde, p.anterior.hasta) : null;
}

async function bloqueGsc(seleccion: Seleccion, hoy: FechaISO): Promise<ModeloResumen["gsc"]> {
  const repo = obtenerRepositorio(hoy);
  const datosHasta = await repo.ultimoDia("gsc", hoy);
  const periodo = resolverPeriodo(seleccion, "gsc", datosHasta, hoy);
  if (periodo.estado !== "con-datos") {
    return { fuente: "gsc", datosHasta, periodo, indicadores: [], granularidad: "dia", serie: [], puntos: [], diario: [] };
  }
  const [dias, diasAnt] = await Promise.all([
    repo.gscSitioPorDia(periodo.actual),
    periodo.anterior ? repo.gscSitioPorDia(periodo.anterior) : Promise.resolve([] as FilaGscDia[]),
  ]);
  const act = total<SumasGsc>(dias, sumarGsc, SUMAS_GSC_VACIAS);
  const ant = total<SumasGsc>(diasAnt, sumarGsc, SUMAS_GSC_VACIAS);
  const hayAnt = periodo.anterior !== null;
  const compara = comparadoCon(periodo);
  const sinFilas = dias.length === 0;
  // Los conteos solo se comparan si los dos periodos tienen datos todos sus
  // días: con un día faltante se compararían 27 días contra 28. Las tasas sí
  // se comparan, porque se recalculan sobre los días que hay.
  const conteosComparables = periodo.anterior !== null && dias.length === periodo.actual.dias && diasAnt.length === periodo.anterior.dias;

  const diarioGsc = serieDiaria(periodo.actual.desde, periodo.actual.hasta, dias, sumasGscDe);

  const indicadores: Indicador[] = [
    {
      id: "impresiones",
      nombre: "Impresiones",
      fuente: "Search Console",
      ayuda: AYUDA.impresiones,
      valor: sinFilas ? { estado: "sin-medir" } : valor(act.impresiones, formatoEntero),
      cambio: cambio("conteo", sinFilas ? null : act.impresiones, conteosComparables ? ant.impresiones : null, hayAnt),
      comparadoCon: compara,
    },
    {
      id: "clics",
      nombre: "Clics",
      fuente: "Search Console",
      ayuda: AYUDA.clics,
      valor: sinFilas ? { estado: "sin-medir" } : valor(act.clics, formatoEntero),
      cambio: cambio("conteo", sinFilas ? null : act.clics, conteosComparables ? ant.clics : null, hayAnt),
      comparadoCon: compara,
    },
    {
      id: "ctr",
      nombre: "CTR",
      fuente: "Search Console",
      ayuda: AYUDA.ctr,
      valor: valor(ctr(act), formatoPorcentaje),
      cambio: cambio("tasa", ctr(act), ctr(ant), hayAnt),
      comparadoCon: compara,
    },
    {
      id: "posicion",
      nombre: "Posición promedio",
      fuente: "Search Console",
      ayuda: AYUDA.posicionPromedio,
      valor: valor(posicionPromedio(act), formatoPosicion),
      cambio: cambio("posicion", posicionPromedio(act), posicionPromedio(ant), hayAnt),
      comparadoCon: compara,
    },
  ];

  return {
    fuente: "gsc",
    datosHasta,
    periodo,
    indicadores,
    granularidad: granularidad(periodo.actual),
    serie: serie(periodo.actual, dias, (f) => f.impresiones, (f) => f.clics),
    puntos: agruparPuntos(diarioGsc, granularidad(periodo.actual), sumarGsc),
    diario: diarioGsc,
  };
}

async function bloqueGa4(seleccion: Seleccion, hoy: FechaISO): Promise<ModeloResumen["ga4"]> {
  const repo = obtenerRepositorio(hoy);
  const datosHasta = await repo.ultimoDia("ga4", hoy);
  const periodo = resolverPeriodo(seleccion, "ga4", datosHasta, hoy);
  if (periodo.estado !== "con-datos") {
    return { fuente: "ga4", datosHasta, periodo, indicadores: [], granularidad: "dia", serie: [], diario: [], rangosAtajos: rangosAtajos(datosHasta, hoy), embudo: null };
  }
  const [dias, diasAnt] = await Promise.all([
    repo.ga4PorDia(periodo.actual, CANAL_ORGANICO),
    periodo.anterior ? repo.ga4PorDia(periodo.anterior, CANAL_ORGANICO) : Promise.resolve([] as FilaGa4Dia[]),
  ]);
  const act = total<SumasGa4>(dias, sumarGa4, SUMAS_GA4_VACIAS);
  const ant = total<SumasGa4>(diasAnt, sumarGa4, SUMAS_GA4_VACIAS);
  const hayAnt = periodo.anterior !== null;
  const compara = comparadoCon(periodo);
  const sinFilas = dias.length === 0;
  const antConFilas = diasAnt.length > 0;
  // Igual que en Search Console: los conteos solo se comparan con todos los días en ambos periodos.
  const conteosComparables = periodo.anterior !== null && dias.length === periodo.actual.dias && diasAnt.length === periodo.anterior.dias;

  const indicadores: Indicador[] = [
    {
      id: "sesiones",
      nombre: "Sesiones",
      fuente: "GA4",
      ayuda: AYUDA.sesiones,
      valor: sinFilas ? { estado: "sin-medir" } : valor(act.sesiones, formatoEntero),
      cambio: cambio("conteo", sinFilas ? null : act.sesiones, conteosComparables ? ant.sesiones : null, hayAnt),
      comparadoCon: compara,
    },
    {
      id: "conversiones",
      nombre: "Conversiones",
      fuente: "GA4",
      ayuda: AYUDA.conversiones,
      valor: sinFilas ? { estado: "sin-medir" } : valor(act.conversiones, formatoEntero),
      cambio: cambio("conteo", sinFilas ? null : act.conversiones, conteosComparables ? ant.conversiones : null, hayAnt),
      comparadoCon: compara,
    },
    {
      id: "tasa-conversion",
      nombre: "Tasa de conversión",
      fuente: "GA4",
      ayuda: AYUDA.tasaConversion,
      valor: valor(tasaConversion(act), formatoPorcentaje),
      cambio: cambio("tasa", tasaConversion(act), tasaConversion(ant), hayAnt),
      comparadoCon: compara,
    },
  ];

  const embudo = sinFilas
    ? null
    : {
        pasos: [
          { id: "sesiones", nombre: "Sesiones orgánicas", ayuda: AYUDA.embudoSesiones, valor: act.sesiones },
          { id: "interaccion", nombre: "Sesiones con interacción", ayuda: AYUDA.embudoInteraccion, valor: act.sesionesConEngagement },
          { id: "conversion", nombre: "Sesiones con conversión", ayuda: AYUDA.embudoConversion, valor: act.sesionesConConversion },
        ].map((p) => ({ ...p, deLaPrimera: tasa(p.valor, act.sesiones) })),
        tasaConversion: tasaConversion(act),
      };

  return {
    fuente: "ga4",
    datosHasta,
    periodo,
    indicadores,
    granularidad: granularidad(periodo.actual),
    serie: serie(periodo.actual, dias, (f) => f.sesiones, (f) => f.conversiones),
    diario: serieDiaria(periodo.actual.desde, periodo.actual.hasta, dias, sumasGa4De),
    rangosAtajos: rangosAtajos(datosHasta, hoy),
    embudo,
  };
}

/** Rendimiento por página: solo GA4 orgánico, por página de entrada. */
async function tablaPaginas(ga4: ModeloResumen["ga4"], hoy: FechaISO): Promise<FilaPagina[]> {
  if (ga4.periodo.estado !== "con-datos") return [];
  const paginas = await obtenerRepositorio(hoy).ga4PorPagina(ga4.periodo.actual, CANAL_ORGANICO);
  return paginas.map((p) => ({
    path: p.path,
    sesiones: p.sesiones,
    tiempoPromedio: tiempoPromedioPorSesion(p),
    conversiones: p.conversiones,
    tasaConversion: tasaConversion(p),
  }));
}

/** Arma todo lo que muestra el Resumen orgánico para una selección de fechas. */
export async function obtenerResumen(seleccion: Seleccion, hoy: FechaISO): Promise<ModeloResumen> {
  const [gsc, ga4] = await Promise.all([bloqueGsc(seleccion, hoy), bloqueGa4(seleccion, hoy)]);
  return { hoy, gsc, ga4, paginas: await tablaPaginas(ga4, hoy) };
}
