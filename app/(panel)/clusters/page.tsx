import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { RiBookOpenLine } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { LinkButton } from "@/components/base/buttons/link-button";
import { Skeleton } from "@/components/base/skeleton/skeleton";
import { EncabezadoBloque, SinDatosAun } from "@/components/nutec/encabezado-bloque";
import { ExploradorEstrategia } from "@/components/nutec/posiciones/explorador";
import { DistribucionPosiciones } from "@/components/nutec/posiciones/distribucion-posiciones";
import { SelectorRango } from "@/components/nutec/selector-periodo";
import { TarjetasRastreadas, TarjetasSimples } from "@/components/nutec/tarjetas-indicadores";
import { SinAcceso } from "@/components/nutec/sin-acceso";
import { exigirAcceso } from "@/lib/acceso-servidor";
import { hoyEnMexico, type FechaISO } from "@/lib/fechas";
import { formatoEntero, formatoFechaLarga } from "@/lib/formato";
import { ATAJOS, PRIMER_DIA, resolverPeriodo, seleccionDesdeParametros, type Atajo } from "@/lib/periodos";
import { obtenerEstrategia } from "@/lib/datos/estrategia";
import { usaDatosDeEjemplo } from "@/lib/datos";

export const metadata: Metadata = { title: "Estrategia por cluster · Dashboard SEO · NUTEC" };

/** Días que cubre cada atajo para SEMrush, para marcarlos en el selector de fechas. */
function rangosAtajos(datosHasta: FechaISO | null, hoy: FechaISO) {
  const r: Partial<Record<Atajo, { desde: FechaISO; hasta: FechaISO }>> = {};
  for (const atajo of ATAJOS) {
    const p = resolverPeriodo({ tipo: "atajo", atajo }, "semrush", datosHasta, hoy);
    if (p.estado === "con-datos") r[atajo] = { desde: p.actual.desde, hasta: p.actual.hasta };
  }
  return r;
}

async function Estrategia({ searchParams }: { searchParams: PageProps<"/clusters">["searchParams"] }) {
  if (!(await exigirAcceso())) return <SinAcceso />;
  const params = await searchParams;
  // "Hoy" se calcula en cada solicitud: define los atajos de fecha.
  await connection();
  const hoy = hoyEnMexico();
  const seleccion = seleccionDesdeParametros(params, hoy);
  const m = await obtenerEstrategia(seleccion, hoy);
  const periodo = m.bloque.periodo;

  return (
    <>
      <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title-1-medium text-text-primary">Estrategia por cluster</h1>
          {usaDatosDeEjemplo() && (
            <Chip variant="caption" color="yellow">
              Datos de ejemplo
            </Chip>
          )}
          <LinkButton href="/guia" variant="secondary" size="small" leadingIcon={RiBookOpenLine}>
            Guía de lectura
          </LinkButton>
        </div>
        {/* Un solo selector de fechas para toda la vista. */}
        <SelectorRango seleccion={seleccion} hoy={hoy} rangos={rangosAtajos(m.bloque.datosHasta, hoy)} ruta="/clusters" />
      </header>

      {periodo.estado !== "con-datos" ? (
        <section className="flex flex-col gap-3">
          <EncabezadoBloque titulo="Posiciones rastreadas · SEMrush" bloque={m.bloque} hoy={hoy} />
          <SinDatosAun />
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3" aria-label="Visibilidad orgánica">
            <EncabezadoBloque titulo="Visibilidad orgánica · SEMrush" bloque={m.bloque} hoy={hoy} />
            {m.recortadoAlPrimerDia && (
              <p className="text-body-regular text-text-secondary">
                La posición se mide desde el {formatoFechaLarga(PRIMER_DIA.semrush)} de {PRIMER_DIA.semrush.slice(0, 4)}.
              </p>
            )}
            <TarjetasRastreadas indicadores={m.organica.indicadores} diario={m.organica.diario} />
            <DistribucionPosiciones series={m.organica.distribucion} />
          </section>

          <ExploradorEstrategia
            // Al cambiar el periodo se cierra el panel y se restablece la lista.
            key={`${periodo.actual.desde}_${periodo.actual.hasta}`}
            modelo={{ ia: m.ia, alertas: m.alertas, clusters: m.clusters }}
            desde={periodo.actual.desde}
            hasta={periodo.actual.hasta}
            seccionIa={
              <>
                <EncabezadoBloque titulo="Visibilidad en IA · SEMrush" />
                <TarjetasSimples indicadores={m.ia.indicadores} />
              </>
            }
          />

          <p className="text-body-regular text-text-tertiary">
            {formatoEntero(m.total)} búsquedas rastreadas · {formatoEntero(m.medidas)} con medición en el periodo · citación en IA verificada en{" "}
            {formatoEntero(m.ia.verificadas)}
            {m.ia.sinMedir > 0 && ` (${formatoEntero(m.ia.sinMedir)} sin medir)`}
          </p>
        </>
      )}
    </>
  );
}

function Esqueleto() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <Skeleton shape="text" className="h-8 w-72" />
      <Skeleton className="h-[150px] w-full" />
      <Skeleton className="h-[220px] w-full" />
      <Skeleton className="h-[320px] w-full" />
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/clusters">) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 lg:px-2 lg:py-2">
      <Suspense fallback={<Esqueleto />}>
        <Estrategia searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
