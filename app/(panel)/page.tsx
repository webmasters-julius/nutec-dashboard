import { Suspense } from "react";
import { connection } from "next/server";
import { Chip } from "@/components/base/badges/chip";
import { Skeleton } from "@/components/base/skeleton/skeleton";
import { TarjetasGa4, TarjetasGsc } from "@/components/nutec/tarjetas-indicadores";
import { LinkButton } from "@/components/base/buttons/link-button";
import { RiBookOpenLine } from "@remixicon/react";
import { SelectorRango } from "@/components/nutec/selector-periodo";
import { Embudo } from "@/components/nutec/graficas/embudo";
import { GraficaGa4, GraficaGsc } from "@/components/nutec/graficas/grafica-principal";
import { RendimientoPaginas } from "@/components/nutec/tablas/rendimiento-paginas";
import { SinAcceso } from "@/components/nutec/sin-acceso";
import { exigirAcceso } from "@/lib/acceso-servidor";
import { hoyEnMexico } from "@/lib/fechas";
import { seleccionDesdeParametros } from "@/lib/periodos";
import { ROTULO } from "@/lib/textos-ayuda";
import { EncabezadoBloque, SinDatosAun } from "@/components/nutec/encabezado-bloque";
import { obtenerResumen } from "@/lib/datos/resumen";
import { usaDatosDeEjemplo } from "@/lib/datos";

async function Resumen({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  if (!(await exigirAcceso())) return <SinAcceso />;
  const params = await searchParams;
  // "Hoy" se calcula en cada solicitud: define los atajos de fecha.
  await connection();
  const hoy = hoyEnMexico();
  const seleccion = seleccionDesdeParametros(params, hoy);
  const m = await obtenerResumen(seleccion, hoy);

  return (
    <>
      <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title-1-medium text-text-primary">Resumen orgánico</h1>
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
        <SelectorRango seleccion={seleccion} hoy={hoy} rangos={m.ga4.rangosAtajos} />
      </header>

      <section className="flex flex-col gap-3" aria-label={ROTULO.filaGsc}>
        <EncabezadoBloque titulo={ROTULO.filaGsc} bloque={m.gsc} hoy={hoy} />
        {m.gsc.periodo.estado === "con-datos" ? (
          <>
            <TarjetasGsc indicadores={m.gsc.indicadores} puntos={m.gsc.puntos} />
            <GraficaGsc
              // Al cambiar el periodo, la agrupación vuelve a la inicial.
              key={`${m.gsc.periodo.actual.desde}_${m.gsc.periodo.actual.hasta}`}
              diario={m.gsc.diario}
            />
          </>
        ) : (
          <SinDatosAun />
        )}
      </section>

      <section className="flex flex-col gap-3" aria-label={ROTULO.filaGa4}>
        <EncabezadoBloque titulo={ROTULO.filaGa4} bloque={m.ga4} hoy={hoy} />
        {m.ga4.periodo.estado === "con-datos" ? (
          <>
            <TarjetasGa4 indicadores={m.ga4.indicadores} />
            <GraficaGa4
              // Al cambiar el periodo, la agrupación vuelve a la inicial.
              key={`${m.ga4.periodo.actual.desde}_${m.ga4.periodo.actual.hasta}`}
              diario={m.ga4.diario}
            />
          </>
        ) : (
          <SinDatosAun />
        )}
      </section>

      {m.ga4.embudo && (
        <Embudo titulo="Embudo orgánico" pasos={m.ga4.embudo.pasos} />
      )}

      <RendimientoPaginas filas={m.paginas} />
    </>
  );
}

function EsqueletoResumen() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <Skeleton shape="text" className="h-8 w-64" />
      <Skeleton className="h-[160px] w-full" />
      <Skeleton className="h-[440px] w-full" />
      <Skeleton className="h-[140px] w-full" />
      <Skeleton className="h-[440px] w-full" />
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 lg:px-2 lg:py-2">
      <Suspense fallback={<EsqueletoResumen />}>
        <Resumen searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
