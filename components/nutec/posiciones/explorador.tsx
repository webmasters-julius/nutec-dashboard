"use client";

import { useState, type ReactNode } from "react";
import { RiArrowRightSLine, RiExternalLinkLine } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { LinkButton } from "@/components/base/buttons/link-button";
import { Drawer, DrawerBody, DrawerHeader } from "@/components/base/drawer/drawer";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { Ayuda } from "@/components/nutec/ayuda";
import { ChipRol } from "@/components/nutec/posiciones/chip-rol";
import { FranjaBandas } from "@/components/nutec/posiciones/franja-bandas";
import { GraficaPosicionDiaria } from "@/components/nutec/posiciones/grafica-posicion-diaria";
import { COLOR_BANDA, COLOR_CONTORNO, COLOR_ESTADO, NOMBRE_ROL } from "@/components/nutec/posiciones/paleta";
import { TendenciaPosicion } from "@/components/nutec/posiciones/tendencia-posicion";
import { VisibilidadIa } from "@/components/nutec/posiciones/visibilidad-ia";
import type { FechaISO } from "@/lib/fechas";
import { formatoEntero, GUION, SIN_MEDIR } from "@/lib/formato";
import { NOMBRE_ALERTA, type Rol } from "@/lib/posiciones";
import { AYUDA } from "@/lib/textos-ayuda";
import type { AlertaModelo, BusquedaModelo, ClusterModelo, ModeloEstrategia } from "@/lib/datos/estrategia";
import { cx } from "@/utils/cx";

/**
 * Parte interactiva de la Estrategia por cluster: la visibilidad en IA, los
 * clusters con sus búsquedas, "Qué revisar" y el panel lateral de una
 * búsqueda. Comparten un solo estado: la búsqueda abierta.
 */

const posicionTexto = (p: number | null) => (p === null ? GUION : Number.isInteger(p) ? String(p) : p.toFixed(1));

function cambioTexto(c: number | null): { texto: string; clase: string } {
  if (c === null) return { texto: GUION, clase: "text-text-tertiary" };
  const n = Math.abs(c);
  const lugares = `${Number.isInteger(n) ? n : n.toFixed(1)} ${n === 1 ? "lugar" : "lugares"}`;
  if (c > 0) return { texto: `▲ ${lugares}`, clase: "text-status-lime-text" };
  if (c < 0) return { texto: `▼ ${lugares}`, clase: "text-status-rose-text" };
  return { texto: "=", clase: "text-text-secondary" };
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** "Sin medir" en gris: nunca un cero ni "0 de 0". */
const SinMedir = () => <span className="text-text-tertiary">{SIN_MEDIR}</span>;

/** Cita en IA. En una búsqueda son días ("3 de 20 días"); en un cluster, búsquedas ("3 de 20"). */
function IaTexto({ citada, verificados, dias = false }: { citada: number; verificados: number; dias?: boolean }) {
  return verificados === 0 ? (
    <SinMedir />
  ) : (
    <span className="tabular-nums whitespace-nowrap">
      {citada} de {verificados}
      {dias && (verificados === 1 ? " día" : " días")}
    </span>
  );
}

function Dato({ nombre, ayuda, children }: { nombre: string; ayuda: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl bg-background-secondary-default p-3">
      <span className="flex items-center gap-1 text-body-regular text-text-secondary">
        {nombre}
        <Ayuda label={nombre} hint={ayuda} />
      </span>
      <span className="text-headline-medium text-text-primary">{children}</span>
    </div>
  );
}

function PanelBusqueda({ b, pathObjetivo, desde, hasta }: { b: BusquedaModelo; pathObjetivo: string; desde: FechaISO; hasta: FechaISO }) {
  const cambio = cambioTexto(b.cambio);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Dato nombre="Posición rastreada · SEMrush" ayuda={AYUDA.posicionRastreada}>
          {posicionTexto(b.resumen.mediana)}
        </Dato>
        <Dato nombre="Días en top 100" ayuda={AYUDA.diasVisible}>
          {b.resumen.diasMedidos === 0 ? <SinMedir /> : `${b.resumen.diasVisible} de ${b.resumen.diasMedidos}`}
        </Dato>
        <Dato nombre="Citación en IA" ayuda={AYUDA.citacionIa}>
          <IaTexto citada={b.resumen.diasCitada} verificados={b.resumen.diasVerificados} dias />
        </Dato>
        <Dato nombre="Cambio" ayuda={AYUDA.cambio}>
          <span className={cambio.clase}>{cambio.texto}</span>
        </Dato>
      </div>

      <section className="rounded-2xl bg-background-secondary-default p-3">
        <GraficaPosicionDiaria dias={b.dias} desde={desde} hasta={hasta} />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-body-medium text-text-primary">
          Estado
          <Chip variant="caption" color={COLOR_ESTADO[b.estado]}>
            {b.estado}
          </Chip>
        </h3>
        <p className="text-body-regular text-text-secondary">{b.motivoEstado}</p>
        {b.alertas.length > 0 && (
          <ul className="flex flex-col gap-2">
            {b.alertas.map((a) => (
              <li key={a.tipo} className="flex flex-col gap-0.5 rounded-2lg border border-border-button-default px-3 py-2">
                <span className="flex items-center gap-2">
                  <Chip variant="caption" color={COLOR_ESTADO[a.prioridad]}>
                    {a.prioridad}
                  </Chip>
                  <span className="text-body-medium text-text-secondary">{NOMBRE_ALERTA[a.tipo]}</span>
                </span>
                <span className="text-body-regular break-words text-text-primary">{a.detalle}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-body-medium text-text-primary">Páginas con las que apareció</h3>
        {b.resumen.paginas.length === 0 ? (
          <p className="text-body-regular text-text-tertiary">{GUION}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-separator-border">
            {b.resumen.paginas.map((p) => (
              <li key={p.path} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0 text-body-regular break-all text-text-primary">
                  {p.path}
                  {p.path === pathObjetivo && <span className="text-text-tertiary"> · página objetivo</span>}
                </span>
                <span className="shrink-0 text-body-regular text-text-secondary tabular-nums">
                  {p.dias} {p.dias === 1 ? "día" : "días"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-body-regular text-text-tertiary">Página objetivo del cluster: {pathObjetivo}</p>
      </section>
    </div>
  );
}

// ── Qué revisar ───────────────────────────────────────────────────────────

const ALERTAS_VISIBLES = 5;

function QueRevisar({ alertas, onAbrir }: { alertas: AlertaModelo[]; onAbrir: (id: string) => void }) {
  const [todas, setTodas] = useState(false);
  if (alertas.length === 0) return null;
  const lista = todas ? alertas : alertas.slice(0, ALERTAS_VISIBLES);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-title-3-semibold text-text-primary">Qué revisar</h2>
        {/* Cuántas hay de cada prioridad, de la más importante a la menos. */}
        <span className="flex flex-wrap items-center gap-1.5">
          {(["Urgente", "Atender", "Vigilar", "Bien"] as const).map((p) => {
            const n = alertas.filter((a) => a.prioridad === p).length;
            return (
              n > 0 && (
                <Chip key={p} variant="caption" color={COLOR_ESTADO[p]}>
                  {n} {p === "Urgente" && n !== 1 ? "Urgentes" : p}
                </Chip>
              )
            );
          })}
        </span>
      </div>
      <ul className="flex flex-col rounded-2xl border border-border-table">
        {lista.map((a, i) => (
          <li key={`${a.busquedaId}-${a.tipo}`} className={cx(i > 0 && "border-t border-separator-border")}>
            <button
              type="button"
              onClick={() => onAbrir(a.busquedaId)}
              className="flex w-full cursor-pointer flex-col gap-1 px-3 py-2.5 text-start outline-none transition-colors duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="flex shrink-0 items-center gap-2 sm:w-56">
                <Chip variant="caption" color={COLOR_ESTADO[a.prioridad]}>
                  {a.prioridad}
                </Chip>
                <span className="text-body-medium text-text-secondary">{NOMBRE_ALERTA[a.tipo]}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-body-medium text-text-primary">{a.keyword}</span>
                <span className="text-body-regular text-text-tertiary"> · {a.clusterNombre}</span>
                <span className="block text-body-regular break-words text-text-secondary">{a.detalle}</span>
              </span>
              <RiArrowRightSLine className="hidden size-5 shrink-0 text-foreground-icon-secondary sm:block" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {alertas.length > ALERTAS_VISIBLES && !todas && (
        <LinkButton onClick={() => setTodas(true)} className="self-start">
          Ver todas ({alertas.length})
        </LinkButton>
      )}
    </section>
  );
}

// ── Clusters y búsquedas ──────────────────────────────────────────────────

// La rejilla de columnas entra hasta `xl`: antes no queda ancho para el nombre de la búsqueda.
const COLUMNAS = "xl:grid-cols-[minmax(0,1fr)_64px_72px_100px_120px_92px_80px]";

function EncabezadoColumnas() {
  const col = (nombre: string, ayuda: string, clase = "text-end") => (
    <span className={cx("flex items-center gap-1", clase === "text-end" && "justify-end")}>
      {nombre}
      <Ayuda label={nombre} hint={ayuda} />
    </span>
  );
  return (
    <div className={cx("hidden items-center gap-3 border-b border-separator-border px-3 py-2 text-caption-1-medium text-text-tertiary xl:grid", COLUMNAS)}>
      <span>Búsqueda</span>
      {col("Volumen", AYUDA.volumen)}
      {col("Posición", AYUDA.posicionRastreada)}
      {col("Cambio", AYUDA.cambio)}
      {col("Tendencia", AYUDA.tendencia, "text-start")}
      {col("Cita en IA", AYUDA.citacionIa)}
      {col("Estado", AYUDA.estado)}
    </div>
  );
}

function FilaBusqueda({ b, onAbrir }: { b: BusquedaModelo; onAbrir: (id: string) => void }) {
  const cambio = cambioTexto(b.cambio);
  const volumen = b.volumen && b.volumen > 0 ? formatoEntero(b.volumen) : GUION;
  return (
    <button
      type="button"
      onClick={() => onAbrir(b.id)}
      className={cx(
        "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-separator-border px-3 py-2 text-start outline-none transition-colors duration-150 last:border-b-0 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        COLUMNAS,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-6 w-1 shrink-0 rounded-full"
          style={{ background: COLOR_BANDA[b.resumen.banda], border: b.resumen.mediana === null ? `1px solid ${COLOR_CONTORNO}` : undefined }}
          aria-hidden
        />
        <span
          className={cx(
            // Apilada, la búsqueda se lee completa; en columnas, se recorta con puntos suspensivos.
            "min-w-0 break-words xl:truncate",
            b.rol === "primaria" && "text-body-medium text-text-primary",
            b.rol === "secundaria" && "text-body-regular text-text-primary",
            b.rol === "variante" && "text-body-regular text-text-secondary",
          )}
        >
          {b.keyword}
        </span>
        <ChipRol rol={b.rol} />
        {b.paginaAjena && (
          <RiExternalLinkLine className="size-4 shrink-0 text-status-orange-text" aria-label="Aparece con una página distinta a la objetivo" />
        )}
      </span>
      {/* Apilada (hasta `xl`): posición y estado junto al nombre; el resto baja a una segunda línea. */}
      <span className="flex items-center gap-2 xl:hidden">
        <span className="text-body-medium text-text-primary tabular-nums">{posicionTexto(b.resumen.mediana)}</span>
        <Chip variant="caption" color={COLOR_ESTADO[b.estado]}>
          {b.estado}
        </Chip>
      </span>
      <span className="hidden text-end text-body-regular text-text-secondary tabular-nums xl:block">{volumen}</span>
      <span className="hidden text-end text-body-medium text-text-primary tabular-nums xl:block">{posicionTexto(b.resumen.mediana)}</span>
      <span className={cx("hidden text-end text-body-regular whitespace-nowrap xl:block", cambio.clase)}>{cambio.texto}</span>
      <span className="col-span-2 flex items-center gap-3 xl:col-span-1">
        <TendenciaPosicion dias={b.dias} />
        {b.cambio !== null && <span className={cx("text-body-regular whitespace-nowrap xl:hidden", cambio.clase)}>{cambio.texto}</span>}
      </span>
      <span className="hidden text-end text-body-regular text-text-secondary xl:block">
        <IaTexto citada={b.resumen.diasCitada} verificados={b.resumen.diasVerificados} dias />
      </span>
      <span className="hidden justify-end xl:flex">
        <Chip variant="caption" color={COLOR_ESTADO[b.estado]}>
          {b.estado}
        </Chip>
      </span>
    </button>
  );
}

/** Una cifra del resumen de un cluster: nombre arriba y, en un solo renglón, el valor grande con su aclaración al lado. */
function Cifra({ nombre, ayuda, valor, aclaracion }: { nombre: string; ayuda: string; valor: ReactNode; aclaracion?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-body-regular text-text-secondary">
        {nombre}
        <Ayuda label={nombre} hint={ayuda} />
      </dt>
      <dd className="flex flex-wrap items-baseline gap-x-2 xl:flex-nowrap xl:whitespace-nowrap">
        <span className="text-title-3-semibold text-text-primary tabular-nums">{valor}</span>
        {aclaracion && <span className="text-body-regular text-text-tertiary">{aclaracion}</span>}
      </dd>
    </div>
  );
}

function TarjetaCluster({
  c,
  abierto,
  onAlternar,
  filtro,
  onAbrir,
}: {
  c: ClusterModelo;
  abierto: boolean;
  onAlternar: () => void;
  filtro: Rol | "todas";
  onAbrir: (id: string) => void;
}) {
  const cambio = cambioTexto(c.cambio.lugares);
  const busquedas = filtro === "todas" ? c.busquedas : c.busquedas.filter((b) => b.rol === filtro);
  // Sin ninguna búsqueda medida en el periodo no hay conteo que dar: s/m, no "0 de 0".
  const deMedidas = (n: number) => (c.medidas === 0 ? <SinMedir /> : `${n} de ${c.medidas}`);
  return (
    <section className="rounded-2xl border border-border-table bg-background-primary-default">
      {/* Renglón que abre y cierra: nombre, cuántas búsquedas tiene y su estado. */}
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        className="flex w-full cursor-pointer flex-col gap-3 rounded-t-2xl px-4 pt-4 pb-3 text-start outline-none transition-colors duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring sm:flex-row sm:items-start sm:justify-between"
      >
        <span className="flex min-w-0 items-start gap-2">
          <RiArrowRightSLine className={cx("mt-0.5 size-5 shrink-0 text-foreground-icon-secondary transition-transform duration-200", abierto && "rotate-90")} aria-hidden />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-headline-medium text-text-primary">{c.nombre}</span>
              <span className="text-body-medium text-text-secondary">{plural(c.total, "búsqueda rastreada", "búsquedas rastreadas")}</span>
            </span>
            <span className="text-body-regular text-text-secondary">
              {plural(c.composicion.primaria, "primaria", "primarias")} · {plural(c.composicion.secundaria, "secundaria", "secundarias")} ·{" "}
              {plural(c.composicion.variante, "variante", "variantes")}
            </span>
            <span className="truncate text-body-regular text-text-tertiary">Página objetivo: {c.pathObjetivo}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-1.5 ps-7 sm:ps-0">
          {(["Bien", "Vigilar", "Atender"] as const).map(
            (e) =>
              c.estados[e] > 0 && (
                <Chip key={e} variant="caption" color={COLOR_ESTADO[e]}>
                  {c.estados[e]} {e}
                </Chip>
              ),
          )}
        </span>
      </button>

      {/* Resumen del cluster: la franja y cuatro cifras, cada una con su nombre arriba. */}
      <div className="flex flex-col gap-4 px-4 pb-4">
        <FranjaBandas bandas={c.bandas} reposo="Pasa el cursor sobre la barra para ver cada banda" />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 xl:grid-cols-[repeat(5,auto)] xl:justify-between">
          <Cifra nombre="En top 100" ayuda={AYUDA.rastreadasVisibles} valor={deMedidas(c.visibles)} />
          <Cifra nombre="En top 10" ayuda={AYUDA.rastreadasTop10} valor={deMedidas(c.top10)} />
          <Cifra
            nombre="Posición rastreada"
            ayuda={AYUDA.posicionCluster}
            valor={posicionTexto(c.posicion)}
            aclaracion={c.posicion === null ? undefined : c.visibles === 1 ? "típica de la única que aparece" : `típica de las ${c.visibles} que aparecen`}
          />
          <Cifra
            nombre="Cambio de posición"
            ayuda={AYUDA.cambioCluster}
            valor={<span className={cambio.clase}>{cambio.texto}</span>}
            aclaracion={c.cambio.lugares === null ? undefined : `en ${plural(c.cambio.comparables, "búsqueda", "búsquedas")}`}
          />
          <Cifra nombre="Citadas en IA" ayuda={AYUDA.rastreadasCitadasIa} valor={<IaTexto citada={c.citadas} verificados={c.verificadas} />} />
        </dl>
      </div>

      {abierto && (
        <div className="border-t border-separator-border">
          <EncabezadoColumnas />
          {busquedas.length === 0 ? (
            <p className="px-3 py-4 text-body-regular text-text-tertiary">Ninguna búsqueda en este grupo.</p>
          ) : (
            busquedas.map((b) => <FilaBusqueda key={b.id} b={b} onAbrir={onAbrir} />)
          )}
        </div>
      )}
    </section>
  );
}

const sumaDe = (clusters: ClusterModelo[], campo: "total" | "medidas" | "visibles" | "top10") => clusters.reduce((s, c) => s + c[campo], 0);

const FILTROS: { id: Rol | "todas"; nombre: string }[] = [
  { id: "todas", nombre: "Todas" },
  { id: "primaria", nombre: "Primaria" },
  { id: "secundaria", nombre: "Secundarias" },
  { id: "variante", nombre: "Variantes" },
];

export function ExploradorEstrategia({
  modelo,
  desde,
  hasta,
  seccionIa,
}: {
  modelo: Pick<ModeloEstrategia, "ia" | "alertas" | "clusters">;
  desde: FechaISO;
  hasta: FechaISO;
  /** Encabezado y tarjetas de la sección de IA, que van arriba de su gráfica. */
  seccionIa: ReactNode;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Rol | "todas">("todas");
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(modelo.clusters.slice(0, 1).map((c) => c.id)));

  const todas = modelo.clusters.flatMap((c) => c.busquedas);
  const busqueda = abierta ? todas.find((b) => b.id === abierta) : undefined;
  const clusterDe = (id: string) => modelo.clusters.find((c) => c.id === id);
  const alternar = (id: string) =>
    setAbiertos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Los clusters con familia van agrupados bajo su nombre; los demás, solos.
  const grupos: { familia: string | null; clusters: ClusterModelo[] }[] = [];
  for (const c of modelo.clusters) {
    const g = c.familia ? grupos.find((x) => x.familia === c.familia) : undefined;
    if (g) g.clusters.push(c);
    else grupos.push({ familia: c.familia, clusters: [c] });
  }

  return (
    <>
      <section className="flex flex-col gap-3" aria-label="Visibilidad en IA">
        {seccionIa}
        {modelo.ia.verificadas > 0 && <VisibilidadIa series={modelo.ia.tendencia} busquedas={modelo.ia.busquedas} onAbrir={setAbierta} />}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-title-3-semibold text-text-primary">Clusters y búsquedas · SEMrush</h2>
          <SegmentedControl
            aria-label="Filtrar por rol"
            selectedKeys={new Set([filtro])}
            onSelectionChange={(keys) => {
              const k = [...keys][0] as Rol | "todas" | undefined;
              if (k) setFiltro(k);
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

        {grupos.map((g) =>
          g.familia ? (
            <div key={g.familia} className="flex flex-col gap-3 rounded-3xl bg-background-secondary-default p-3">
              {/* Totales de la familia: la suma de sus clusters, con los mismos nombres que usa cada cluster. */}
              <div className="flex flex-col gap-2 px-1 pt-1 sm:flex-row sm:items-end sm:justify-between">
                <span className="flex flex-col gap-0.5">
                  <span className="text-headline-medium text-text-primary">{g.familia}</span>
                  <span className="text-body-regular text-text-secondary">
                    Familia de {plural(g.clusters.length, "cluster", "clusters")} · {plural(sumaDe(g.clusters, "total"), "búsqueda rastreada", "búsquedas rastreadas")} en total
                  </span>
                </span>
                <span className="flex gap-6">
                  {(
                    [
                      ["En top 100", "visibles"],
                      ["En top 10", "top10"],
                    ] as const
                  ).map(([nombre, campo]) => (
                    <span key={campo} className="flex flex-col gap-0.5">
                      <span className="text-body-regular text-text-secondary">{nombre}</span>
                      <span className="text-body-medium text-text-primary tabular-nums">
                        {sumaDe(g.clusters, "medidas") === 0 ? <SinMedir /> : `${sumaDe(g.clusters, campo)} de ${sumaDe(g.clusters, "medidas")}`}
                      </span>
                    </span>
                  ))}
                </span>
              </div>
              {g.clusters.map((c) => (
                <TarjetaCluster key={c.id} c={c} abierto={abiertos.has(c.id)} onAlternar={() => alternar(c.id)} filtro={filtro} onAbrir={setAbierta} />
              ))}
            </div>
          ) : (
            g.clusters.map((c) => (
              <TarjetaCluster key={c.id} c={c} abierto={abiertos.has(c.id)} onAlternar={() => alternar(c.id)} filtro={filtro} onAbrir={setAbierta} />
            ))
          ),
        )}
      </section>

      {/* Al final: es la lista de pendientes que sale de todo lo anterior. */}
      <QueRevisar alertas={modelo.alertas} onAbrir={setAbierta} />

      <Drawer size="lg" isOpen={busqueda !== undefined} onOpenChange={(abierto) => !abierto && setAbierta(null)}>
        {busqueda && (
          <>
            <DrawerHeader
              title={busqueda.keyword}
              description={`${NOMBRE_ROL[busqueda.rol]} · ${busqueda.clusterNombre}${
                busqueda.volumen && busqueda.volumen > 0 ? ` · ${formatoEntero(busqueda.volumen)} búsquedas al mes` : ""
              }`}
              closeLabel="Cerrar"
            />
            <DrawerBody>
              <PanelBusqueda b={busqueda} pathObjetivo={clusterDe(busqueda.clusterId)?.pathObjetivo ?? ""} desde={desde} hasta={hasta} />
            </DrawerBody>
          </>
        )}
      </Drawer>
    </>
  );
}
