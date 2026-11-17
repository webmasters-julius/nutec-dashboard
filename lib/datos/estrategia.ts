import "server-only";

import { diasDelRango, type FechaISO } from "@/lib/fechas";
import { formatoEntero, formatoRango } from "@/lib/formato";
import { resolverPeriodo, type PeriodoFuente, type Seleccion, type Ventana } from "@/lib/periodos";
import {
  ORDEN_PRIORIDAD,
  ORDEN_ROL,
  alertasDe,
  esPrioritaria,
  bandaDe,
  cambioDeGrupo,
  cambioEnLugares,
  contarBandas,
  estadoDe,
  mediana,
  resumirBusqueda,
  type Alerta,
  type Banda,
  type ConteoBandas,
  type Estado,
  type FilaRank,
  type ResumenBusqueda,
  type Rol,
} from "@/lib/posiciones";
import { llaveYLargo, type PuntoSumas, type Unidad } from "@/lib/series";
import { AYUDA, ROTULO } from "@/lib/textos-ayuda";
import { obtenerRepositorio } from "@/lib/datos";
import type { PeriodoBloque } from "@/components/nutec/encabezado-bloque";
import type { CambioIndicador, Indicador } from "@/lib/datos/resumen";

// ── Modelo que recibe la vista (serializable) ─────────────────────────────

/** Una medición diaria, reducida a lo que dibuja la gráfica de la búsqueda. */
export type DiaBusqueda = {
  fecha: FechaISO;
  posicion: number | null;
  pagina: string | null;
  /** null = no se verificó la citación ese día (s/m). */
  citada: boolean | null;
};

export type BusquedaModelo = {
  id: string;
  keyword: string;
  rol: Rol;
  /** Búsquedas mensuales estimadas; null o 0 = sin estimación. */
  volumen: number | null;
  clusterId: string;
  clusterNombre: string;
  resumen: ResumenBusqueda;
  medianaAnterior: number | null;
  /** Lugares que mejoró (+) o empeoró (−); null si no apareció en ambos periodos. */
  cambio: number | null;
  estado: Estado;
  /** Por qué tiene ese estado, en una frase. */
  motivoEstado: string;
  alertas: Alerta[];
  /** Aparece sobre todo con una página distinta a la objetivo del cluster. */
  paginaAjena: boolean;
  /** Solo los días medidos del periodo. */
  dias: DiaBusqueda[];
};

export type ClusterModelo = {
  id: string;
  numero: number;
  nombre: string;
  familia: string | null;
  urlObjetivo: string;
  pathObjetivo: string;
  composicion: Record<Rol, number>;
  /** Búsquedas del cluster. */
  total: number;
  /** Con al menos un día medido en el periodo. */
  medidas: number;
  visibles: number;
  top10: number;
  /** Mediana de las posiciones típicas de sus búsquedas visibles. */
  posicion: number | null;
  cambio: { lugares: number | null; comparables: number };
  bandas: ConteoBandas;
  citadas: number;
  /** Con al menos un día verificado; 0 = s/m. */
  verificadas: number;
  estados: Record<Estado, number>;
  busquedas: BusquedaModelo[];
};

export type ConteosDia = { visibles: number; top10: number; top3: number };

/** Día, semana o mes de una serie de la vista. */
export type Tramo = {
  /** Día, lunes de la semana o primer día del mes. */
  fecha: FechaISO;
  /** Primer y último día del tramo que caen dentro del periodo. */
  desde: FechaISO;
  hasta: FechaISO;
  diasPeriodo: number;
  /** Días que tiene la unidad completa: 1, 7 o los días del mes. */
  diasUnidad: number;
  /** El tramo no cae completo dentro del periodo: no es comparable con los demás. */
  incompleta: boolean;
};

/**
 * Cuántas búsquedas hubo en cada banda de posición en un día, una semana o un
 * mes. En semana y mes la banda de cada búsqueda sale de su posición típica
 * (mediana) en ese tramo: los días no se suman.
 */
export type DiaDistribucion = Tramo & {
  /** Búsquedas con al menos un día medido en el tramo; 0 = sin medición. */
  medidas: number;
  /** null si no se midió. */
  conteo: ConteoBandas | null;
};

/**
 * Citación en IA de un día, una semana o un mes. En semana y mes se cuentan
 * las búsquedas con resumen o con cita al menos un día del tramo: cada
 * búsqueda cuenta una vez, los días no se suman.
 */
export type DiaIa = Tramo & {
  /** Búsquedas verificadas al menos un día del tramo; 0 = no se verificó (s/m). */
  verificadas: number;
  conResumen: number | null;
  citadas: number | null;
};

export type SeriePorUnidad<P> = Record<Unidad, P[]>;

export type BusquedaIa = {
  id: string;
  keyword: string;
  rol: Rol;
  clusterNombre: string;
  /** 0 = sin medir en el periodo. */
  diasVerificados: number;
  diasConResumen: number;
  diasCitada: number;
};

export type AlertaModelo = Alerta & { busquedaId: string; keyword: string; clusterNombre: string; rol: Rol; volumen: number | null };

export type ModeloEstrategia = {
  hoy: FechaISO;
  bloque: PeriodoBloque;
  /** Búsquedas rastreadas (dim_keyword). */
  total: number;
  /** Con al menos un día medido en el periodo. */
  medidas: number;
  organica: {
    indicadores: Indicador[];
    /** Conteos por día, para las minigráficas; sumas = null en días sin medición. */
    diario: PuntoSumas<ConteosDia>[];
    bandas: ConteoBandas;
    /** Búsquedas por banda de posición, por día, semana y mes. */
    distribucion: SeriePorUnidad<DiaDistribucion>;
  };
  ia: {
    indicadores: Indicador[];
    citadas: number;
    verificadas: number;
    sinMedir: number;
    /** Citación por día, semana y mes, para la tendencia. */
    tendencia: SeriePorUnidad<DiaIa>;
    /** Citación de cada búsqueda en el periodo. */
    busquedas: BusquedaIa[];
  };
  alertas: AlertaModelo[];
  clusters: ClusterModelo[];
  /** El periodo pedido empezaba antes del primer día con datos de posición. */
  recortadoAlPrimerDia: boolean;
};

// ── Construcción ──────────────────────────────────────────────────────────

function porBusqueda(filas: FilaRank[]): Map<string, FilaRank[]> {
  const m = new Map<string, FilaRank[]>();
  for (const f of filas) {
    const lista = m.get(f.keyword_id);
    if (lista) lista.push(f);
    else m.set(f.keyword_id, [f]);
  }
  for (const lista of m.values()) lista.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  return m;
}

/** Cambio de un conteo de búsquedas: "▲ 3 búsquedas", no un porcentaje. */
function cambioConteo(actual: number, anterior: number | null, hayAnterior: boolean, hayPeriodoAnterior: boolean): CambioIndicador {
  if (!hayAnterior || anterior === null) {
    // Dos motivos distintos: no hay periodo anterior (la fuente empieza el 4 de
    // agosto de 2026), o lo hay pero ninguna búsqueda se midió en los dos.
    return {
      estado: "sin-comparacion",
      texto: ROTULO.sinPeriodoComparacion,
      ayuda: hayPeriodoAnterior ? AYUDA.sinBusquedasComparables : AYUDA.sinPeriodoComparacionSemrush,
    };
  }
  const d = actual - anterior;
  const n = Math.abs(d);
  const unidad = n === 1 ? "búsqueda" : "búsquedas";
  return {
    estado: "dato",
    texto: d === 0 ? "= sin cambio" : `${d > 0 ? "▲" : "▼"} ${formatoEntero(n)} ${unidad}`,
    sentido: d > 0 ? "mejora" : d < 0 ? "empeora" : "igual",
  };
}

function conteosDiarios(v: Ventana, filas: FilaRank[]): PuntoSumas<ConteosDia>[] {
  const porDia = new Map<FechaISO, ConteosDia>();
  for (const f of filas) {
    const c = porDia.get(f.fecha) ?? { visibles: 0, top10: 0, top3: 0 };
    if (f.posicion !== null) {
      c.visibles += 1;
      if (f.posicion <= 10) c.top10 += 1;
      if (f.posicion <= 3) c.top3 += 1;
    }
    porDia.set(f.fecha, c);
  }
  return diasDelRango(v.desde, v.hasta).map((fecha) => {
    const c = porDia.get(fecha) ?? null;
    return { fecha, desde: fecha, hasta: fecha, diasPeriodo: 1, diasConDatos: c ? 1 : 0, diasUnidad: 1, sumas: c };
  });
}

const UNIDADES: Unidad[] = ["dia", "semana", "mes"];

/** Parte el periodo en días, semanas o meses. */
function tramosDe(v: Ventana, unidad: Unidad): Tramo[] {
  const tramos = new Map<FechaISO, Tramo>();
  for (const fecha of diasDelRango(v.desde, v.hasta)) {
    const [llave, diasUnidad] = llaveYLargo(fecha, unidad);
    const t = tramos.get(llave) ?? { fecha: llave, desde: fecha, hasta: fecha, diasPeriodo: 0, diasUnidad, incompleta: false };
    t.hasta = fecha;
    t.diasPeriodo += 1;
    t.incompleta = t.diasPeriodo < diasUnidad;
    tramos.set(llave, t);
  }
  return [...tramos.values()];
}

/** Filas de cada tramo, separadas por búsqueda. */
function filasPorTramo(filas: FilaRank[], unidad: Unidad): Map<FechaISO, Map<string, FilaRank[]>> {
  const mapa = new Map<FechaISO, Map<string, FilaRank[]>>();
  for (const f of filas) {
    const [llave] = llaveYLargo(f.fecha, unidad);
    const porBusquedaTramo = mapa.get(llave) ?? new Map<string, FilaRank[]>();
    const lista = porBusquedaTramo.get(f.keyword_id) ?? [];
    lista.push(f);
    porBusquedaTramo.set(f.keyword_id, lista);
    mapa.set(llave, porBusquedaTramo);
  }
  return mapa;
}

function distribucionPor(v: Ventana, filas: FilaRank[], unidad: Unidad): DiaDistribucion[] {
  const mapa = filasPorTramo(filas, unidad);
  return tramosDe(v, unidad).map((t) => {
    const busquedasTramo = mapa.get(t.fecha);
    if (!busquedasTramo) return { ...t, medidas: 0, conteo: null };
    // La banda sale de la posición típica de la búsqueda en el tramo (en un día, la de ese día).
    const bandas: Banda[] = [...busquedasTramo.values()].map((fs) => bandaDe(fs.length, mediana(fs.map((f) => f.posicion))));
    return { ...t, medidas: bandas.length, conteo: contarBandas(bandas) };
  });
}

function iaPor(v: Ventana, filas: FilaRank[], unidad: Unidad): DiaIa[] {
  const mapa = filasPorTramo(filas, unidad);
  return tramosDe(v, unidad).map((t) => {
    let verificadas = 0;
    let conResumen = 0;
    let citadas = 0;
    for (const fs of mapa.get(t.fecha)?.values() ?? []) {
      const revisadas = fs.filter((f) => f.aio_verificado);
      if (revisadas.length === 0) continue;
      // Cada búsqueda cuenta una vez, aunque tenga resumen o cita varios días.
      verificadas += 1;
      if (revisadas.some((f) => f.serp_tiene_aio === true)) conResumen += 1;
      if (revisadas.some((f) => f.citado_en_aio === true)) citadas += 1;
    }
    // Un tramo sin verificación queda vacío (s/m), nunca en cero.
    return verificadas > 0 ? { ...t, verificadas, conResumen, citadas } : { ...t, verificadas: 0, conResumen: null, citadas: null };
  });
}

function porUnidad<P>(calcular: (u: Unidad) => P[]): SeriePorUnidad<P> {
  return Object.fromEntries(UNIDADES.map((u) => [u, calcular(u)])) as SeriePorUnidad<P>;
}

/** Arma todo lo que muestra la vista Estrategia por cluster para una selección de fechas. */
export async function obtenerEstrategia(seleccion: Seleccion, hoy: FechaISO): Promise<ModeloEstrategia> {
  const repo = obtenerRepositorio(hoy);
  const [datosHasta, clusters, keywords] = await Promise.all([repo.ultimoDia("semrush", hoy), repo.clusters(), repo.keywords()]);
  const periodo: PeriodoFuente = resolverPeriodo(seleccion, "semrush", datosHasta, hoy);
  const bloque: PeriodoBloque = { fuente: "semrush", datosHasta, periodo };

  const vacio: ModeloEstrategia = {
    hoy,
    bloque,
    total: keywords.length,
    medidas: 0,
    organica: { indicadores: [], diario: [], bandas: contarBandas([]), distribucion: porUnidad(() => []) },
    ia: { indicadores: [], citadas: 0, verificadas: 0, sinMedir: 0, tendencia: porUnidad(() => []), busquedas: [] },
    alertas: [],
    clusters: [],
    recortadoAlPrimerDia: false,
  };
  if (periodo.estado !== "con-datos") return vacio;

  const [filas, filasAnt] = await Promise.all([
    repo.rankDiario(periodo.actual),
    periodo.anterior ? repo.rankDiario(periodo.anterior) : Promise.resolve([]),
  ]);
  const hayAnterior = periodo.anterior !== null;
  const actual = porBusqueda(filas);
  const anterior = porBusqueda(filasAnt);
  const clusterDe = new Map(clusters.map((c) => [c.cluster_id, c]));

  const diasPeriodo = diasDelRango(periodo.actual.desde, periodo.actual.hasta).length;

  // Búsquedas
  const busquedas: BusquedaModelo[] = keywords.map((k) => {
    const cluster = clusterDe.get(k.cluster_id);
    const propias = actual.get(k.keyword_id) ?? [];
    const resumen = resumirBusqueda(propias);
    const resumenAnt = hayAnterior ? resumirBusqueda(anterior.get(k.keyword_id) ?? []) : null;
    const medianaAnterior = resumenAnt?.mediana ?? null;
    const pathObjetivo = cluster?.path_objetivo ?? null;
    const estado = estadoDe({
      diasMedidos: resumen.diasMedidos,
      diasVisible: resumen.diasVisible,
      mediana: resumen.mediana,
      rol: k.rol,
      volumen: k.volumen,
      anterior: resumenAnt,
    });
    return {
      id: k.keyword_id,
      keyword: k.keyword,
      rol: k.rol,
      volumen: k.volumen,
      clusterId: k.cluster_id,
      clusterNombre: cluster?.nombre ?? "",
      resumen,
      medianaAnterior,
      cambio: cambioEnLugares(medianaAnterior, resumen.mediana),
      estado: estado.estado,
      motivoEstado: estado.motivo,
      alertas: alertasDe({
        resumen,
        anterior: resumenAnt,
        pathObjetivo,
        prioritaria: esPrioritaria(k),
        diasPeriodo,
      }),
      paginaAjena: pathObjetivo !== null && resumen.paginaPrincipal !== null && resumen.paginaPrincipal !== pathObjetivo,
      dias: propias.map((f) => ({ fecha: f.fecha, posicion: f.posicion, pagina: f.path_rankeado, citada: f.aio_verificado ? f.citado_en_aio === true : null })),
    };
  });
  const ordenar = (a: BusquedaModelo, b: BusquedaModelo) => ORDEN_ROL[a.rol] - ORDEN_ROL[b.rol] || (b.volumen ?? 0) - (a.volumen ?? 0);

  // Conteos del sitio, actuales y del periodo anterior
  const contar = (lista: { resumen: ResumenBusqueda }[]) => ({
    medidas: lista.filter((b) => b.resumen.diasMedidos > 0).length,
    visibles: lista.filter((b) => b.resumen.diasVisible > 0).length,
    top10: lista.filter((b) => b.resumen.mediana !== null && b.resumen.mediana <= 10).length,
    top3: lista.filter((b) => b.resumen.mediana !== null && b.resumen.mediana <= 3).length,
    verificadas: lista.filter((b) => b.resumen.diasVerificados > 0).length,
    citadas: lista.filter((b) => b.resumen.diasCitada > 0).length,
    conResumen: lista.filter((b) => b.resumen.diasConResumenIa > 0).length,
    resumenSinCita: lista.filter((b) => b.resumen.diasConResumenIa > 0 && b.resumen.diasCitada === 0).length,
  });
  const ahora = contar(busquedas);
  const resumenesAnt = keywords.map((k) => ({ resumen: resumirBusqueda(anterior.get(k.keyword_id) ?? []) }));
  // Los cambios se calculan solo sobre búsquedas presentes en ambos periodos:
  // medidas en los dos (orgánico) o verificadas en los dos (IA). Así un
  // periodo con menos búsquedas medidas no parece una caída.
  const pares = busquedas.map((b, i) => ({ ahora: b.resumen, antes: resumenesAnt[i].resumen }));
  const medidasEnAmbos = hayAnterior ? pares.filter((p) => p.ahora.diasMedidos > 0 && p.antes.diasMedidos > 0) : [];
  const verificadasEnAmbos = hayAnterior ? pares.filter((p) => p.ahora.diasVerificados > 0 && p.antes.diasVerificados > 0) : [];
  const lado = (lista: typeof pares, cual: "ahora" | "antes") => contar(lista.map((p) => ({ resumen: p[cual] })));
  const organicaComun = medidasEnAmbos.length > 0 ? { ahora: lado(medidasEnAmbos, "ahora"), antes: lado(medidasEnAmbos, "antes") } : null;
  const iaComun = verificadasEnAmbos.length > 0 ? { ahora: lado(verificadasEnAmbos, "ahora"), antes: lado(verificadasEnAmbos, "antes") } : null;
  type Conteos = ReturnType<typeof contar>;
  const par = (comun: { ahora: Conteos; antes: Conteos } | null, campo: keyof Conteos): [number, number] | null =>
    comun ? [comun.ahora[campo], comun.antes[campo]] : null;
  const compara = hayAnterior && periodo.anterior ? formatoRango(periodo.anterior.desde, periodo.anterior.hasta) : null;

  const tarjeta = (
    id: string,
    nombre: string,
    ayuda: string,
    valor: number,
    de: number,
    /** Conteo actual y anterior sobre las búsquedas presentes en ambos periodos. */
    comparable: [number, number] | null,
    opciones: { sinMedir?: boolean; subirEsMejor?: boolean } = {},
  ): Indicador => {
    let cambio = cambioConteo(comparable?.[0] ?? valor, comparable?.[1] ?? null, comparable !== null, hayAnterior);
    // En "con resumen y sin cita", que el conteo suba no es una mejora.
    if (opciones.subirEsMejor === false && cambio.estado === "dato" && cambio.sentido !== "igual") {
      cambio = { ...cambio, sentido: cambio.sentido === "mejora" ? "empeora" : "mejora" };
    }
    return {
      id,
      nombre,
      fuente: "SEMrush",
      ayuda,
      valor: opciones.sinMedir ? { estado: "sin-medir" } : { estado: "dato", texto: `${formatoEntero(valor)} de ${formatoEntero(de)}` },
      cambio: opciones.sinMedir ? { estado: "indefinido" } : cambio,
      comparadoCon: compara,
    };
  };

  const sinIa = ahora.verificadas === 0;
  // Sin ninguna búsqueda medida en el periodo no hay "0 de 0": es sin medir.
  const sinOrganica = ahora.medidas === 0;
  const indicadoresOrganica: Indicador[] = [
    tarjeta("visibles", "En top 100", AYUDA.rastreadasVisibles, ahora.visibles, ahora.medidas, par(organicaComun, "visibles"), { sinMedir: sinOrganica }),
    tarjeta("top10", "En top 10", AYUDA.rastreadasTop10, ahora.top10, ahora.medidas, par(organicaComun, "top10"), { sinMedir: sinOrganica }),
    tarjeta("top3", "En top 3", AYUDA.top3, ahora.top3, ahora.medidas, par(organicaComun, "top3"), { sinMedir: sinOrganica }),
  ];
  const indicadoresIa: Indicador[] = [
    tarjeta("citadas-ia", "Citadas en IA", AYUDA.rastreadasCitadasIa, ahora.citadas, ahora.verificadas, par(iaComun, "citadas"), { sinMedir: sinIa }),
    tarjeta("con-resumen-ia", "Con resumen de IA", AYUDA.conResumenIa, ahora.conResumen, ahora.verificadas, par(iaComun, "conResumen"), { sinMedir: sinIa }),
    tarjeta("resumen-sin-cita", "Con resumen de IA y sin cita", AYUDA.resumenSinCita, ahora.resumenSinCita, ahora.conResumen, par(iaComun, "resumenSinCita"), {
      sinMedir: sinIa,
      subirEsMejor: false,
    }),
  ];

  // Clusters
  const clustersModelo: ClusterModelo[] = [...clusters]
    .sort((a, b) => a.numero - b.numero)
    .map((c) => {
      const propias = busquedas.filter((b) => b.clusterId === c.cluster_id).sort(ordenar);
      const visibles = propias.filter((b) => b.resumen.mediana !== null);
      const rol = (r: Rol) => propias.filter((b) => b.rol === r).length;
      const estado = (e: Estado) => propias.filter((b) => b.estado === e).length;
      return {
        id: c.cluster_id,
        numero: c.numero,
        nombre: c.nombre,
        familia: c.familia,
        urlObjetivo: c.url_objetivo,
        pathObjetivo: c.path_objetivo,
        composicion: { primaria: rol("primaria"), secundaria: rol("secundaria"), variante: rol("variante") },
        total: propias.length,
        medidas: propias.filter((b) => b.resumen.diasMedidos > 0).length,
        visibles: visibles.length,
        top10: propias.filter((b) => b.resumen.mediana !== null && b.resumen.mediana <= 10).length,
        posicion: mediana(visibles.map((b) => b.resumen.mediana)),
        cambio: cambioDeGrupo(propias.map((b) => ({ anterior: b.medianaAnterior, actual: b.resumen.mediana }))),
        bandas: contarBandas(propias.map((b) => b.resumen.banda)),
        citadas: propias.filter((b) => b.resumen.diasCitada > 0).length,
        verificadas: propias.filter((b) => b.resumen.diasVerificados > 0).length,
        estados: { Bien: estado("Bien"), Atender: estado("Atender"), Vigilar: estado("Vigilar") },
        busquedas: propias,
      };
    });

  // Alertas del sitio: primero las urgentes, después por rol y volumen
  const alertas: AlertaModelo[] = busquedas
    .flatMap((b) => b.alertas.map((a) => ({ ...a, busquedaId: b.id, keyword: b.keyword, clusterNombre: b.clusterNombre, rol: b.rol, volumen: b.volumen })))
    .sort(
      (a, b) =>
        ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] ||
        ORDEN_ROL[a.rol] - ORDEN_ROL[b.rol] ||
        (b.volumen ?? 0) - (a.volumen ?? 0),
    );

  const ordenCuadritos = clustersModelo.flatMap((c) => c.busquedas);

  return {
    hoy,
    bloque,
    total: keywords.length,
    medidas: ahora.medidas,
    organica: {
      indicadores: indicadoresOrganica,
      diario: conteosDiarios(periodo.actual, filas),
      bandas: contarBandas(busquedas.map((b) => b.resumen.banda)),
      distribucion: porUnidad((u) => distribucionPor(periodo.actual, filas, u)),
    },
    ia: {
      indicadores: indicadoresIa,
      citadas: ahora.citadas,
      verificadas: ahora.verificadas,
      sinMedir: keywords.length - ahora.verificadas,
      tendencia: porUnidad((u) => iaPor(periodo.actual, filas, u)),
      busquedas: ordenCuadritos.map((b) => ({
        id: b.id,
        keyword: b.keyword,
        rol: b.rol,
        clusterNombre: b.clusterNombre,
        diasVerificados: b.resumen.diasVerificados,
        diasConResumen: b.resumen.diasConResumenIa,
        diasCitada: b.resumen.diasCitada,
      })),
    },
    alertas,
    clusters: clustersModelo,
    recortadoAlPrimerDia: seleccion.tipo === "personalizado" && seleccion.desde < periodo.actual.desde,
  };
}
