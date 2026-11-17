import { Chip } from "@/components/base/badges/chip";
import { COLOR_ESTADO } from "@/components/nutec/posiciones/paleta";
import { NOMBRE_ALERTA, type Prioridad, type TipoAlerta } from "@/lib/posiciones";
import { AYUDA, GUIA_ALERTAS, GUIA_CLICS_Y_SESIONES, GUIA_ESTADOS } from "@/lib/textos-ayuda";

/**
 * Guía de lectura: un apartado propio (/guia) que reúne los textos de ayuda
 * del Resumen orgánico tal cual (especificación, secciones 3 y 4) y explica
 * los estados de las búsquedas rastreadas (sección 5.6). Ya no va
 * en la pantalla principal, que se dedica a los datos; cada cifra conserva su
 * ícono de ayuda.
 */

const SECCIONES: { titulo: string; elementos: [string, string][] }[] = [
  {
    titulo: "Visibilidad en Google · Search Console",
    elementos: [
      ["Impresiones", AYUDA.impresiones],
      ["Clics", AYUDA.clics],
      ["CTR", AYUDA.ctr],
      ["Posición promedio · Search Console", AYUDA.posicionPromedio],
    ],
  },
  {
    titulo: "Resultados en el sitio · GA4 · búsqueda orgánica",
    elementos: [
      ["Sesiones", AYUDA.sesiones],
      ["Conversiones", AYUDA.conversiones],
      ["Tasa de conversión", AYUDA.tasaConversion],
    ],
  },
  {
    titulo: "Embudo orgánico",
    elementos: [
      ["Sesiones orgánicas", AYUDA.embudoSesiones],
      ["Sesiones con interacción", AYUDA.embudoInteraccion],
      ["Sesiones con conversión", AYUDA.embudoConversion],
      ["Tasa de conversión", AYUDA.embudoTasaConversion],
    ],
  },
  {
    titulo: "Rendimiento por página · GA4",
    elementos: [
      ["Página", AYUDA.tablaPagina],
      ["Sesiones", AYUDA.tablaSesiones],
      ["Tiempo promedio por sesión", AYUDA.tablaTiempo],
      ["Conversiones", AYUDA.tablaConversiones],
      ["Tasa de conversión", AYUDA.tablaTasaConversion],
    ],
  },
  // Estrategia por cluster: los mismos nombres y textos de ayuda que lleva cada cifra en la vista.
  {
    titulo: "Visibilidad orgánica · SEMrush",
    elementos: [
      ["En top 100", AYUDA.rastreadasVisibles],
      ["En top 10", AYUDA.rastreadasTop10],
      ["En top 3", AYUDA.top3],
    ],
  },
  {
    titulo: "Visibilidad en IA · SEMrush",
    elementos: [
      ["Citadas en IA", AYUDA.rastreadasCitadasIa],
      ["Con resumen de IA", AYUDA.conResumenIa],
      ["Con resumen de IA y sin cita", AYUDA.resumenSinCita],
    ],
  },
  {
    titulo: "Citación por búsqueda",
    elementos: [
      ["Con resumen de IA", AYUDA.diasConResumenIa],
      ["Citada en IA", AYUDA.citacionIa],
    ],
  },
  {
    titulo: "Clusters y búsquedas · SEMrush",
    elementos: [
      ["Posición rastreada", AYUDA.posicionCluster],
      ["Cambio de posición", AYUDA.cambioCluster],
      ["Volumen", AYUDA.volumen],
      ["Posición", AYUDA.posicionRastreada],
      ["Cambio", AYUDA.cambio],
      ["Tendencia", AYUDA.tendencia],
      ["Cita en IA", AYUDA.citacionIa],
      ["Días en top 100", AYUDA.diasVisible],
    ],
  },
];

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-background-secondary-default p-4">
      <h2 className="text-headline-medium text-text-primary">{titulo}</h2>
      {children}
    </section>
  );
}

export function GuiaLectura() {
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo="Clics y sesiones">
        <p className="max-w-3xl text-body-regular text-text-secondary">{GUIA_CLICS_Y_SESIONES.join(" ")}</p>
      </Tarjeta>
      <Tarjeta titulo="Estado de cada búsqueda · Estrategia por cluster">
        <p className="max-w-3xl text-body-regular text-text-secondary">{GUIA_ESTADOS.introduccion}</p>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(12rem,auto)_1fr]">
          {(
            [
              ["Bien", GUIA_ESTADOS.bien],
              ["Vigilar", GUIA_ESTADOS.vigilar],
              ["Atender", GUIA_ESTADOS.atender],
            ] as const
          ).map(([estado, texto]) => (
            <div key={estado} className="contents">
              <dt>
                <Chip variant="caption" color={COLOR_ESTADO[estado]}>
                  {estado}
                </Chip>
              </dt>
              <dd className="max-w-3xl text-body-regular text-text-secondary">{texto}</dd>
            </div>
          ))}
          <div className="contents">
            <dt className="text-body-medium text-text-primary">Búsqueda prioritaria</dt>
            <dd className="max-w-3xl text-body-regular text-text-secondary">{GUIA_ESTADOS.prioritaria}</dd>
          </div>
        </dl>
      </Tarjeta>
      <Tarjeta titulo="Qué revisar · Estrategia por cluster">
        <p className="max-w-3xl text-body-regular text-text-secondary">{GUIA_ALERTAS.introduccion}</p>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(12rem,auto)_1fr]">
          {(Object.keys(GUIA_ALERTAS.prioridades) as Prioridad[]).map((p) => (
            <div key={p} className="contents">
              <dt>
                <Chip variant="caption" color={COLOR_ESTADO[p]}>
                  {p}
                </Chip>
              </dt>
              <dd className="max-w-3xl text-body-regular text-text-secondary">{GUIA_ALERTAS.prioridades[p]}</dd>
            </div>
          ))}
          {(Object.keys(GUIA_ALERTAS.tipos) as TipoAlerta[]).map((t) => (
            <div key={t} className="contents">
              <dt className="text-body-medium text-text-primary">{NOMBRE_ALERTA[t]}</dt>
              <dd className="max-w-3xl text-body-regular text-text-secondary">{GUIA_ALERTAS.tipos[t]}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>
      {SECCIONES.map((s) => (
        <Tarjeta key={s.titulo} titulo={s.titulo}>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(12rem,auto)_1fr]">
            {s.elementos.map(([nombre, texto]) => (
              <div key={nombre} className="contents">
                <dt className="text-body-medium text-text-primary">{nombre}</dt>
                <dd className="max-w-3xl text-body-regular text-text-secondary">{texto}</dd>
              </div>
            ))}
          </dl>
        </Tarjeta>
      ))}
    </div>
  );
}
