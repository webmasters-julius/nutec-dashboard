import "server-only";

import type { FechaISO } from "@/lib/fechas";
import type { RepositorioMarts } from "@/lib/datos/repositorio";
import { repositorioBigQuery } from "@/lib/datos/bigquery";
import { crearRepositorioEjemplo } from "@/lib/datos/ejemplo/repositorio-ejemplo";

/**
 * Fuente de datos según NUTEC_DATA_SOURCE:
 *   "ejemplo"  (por defecto) datos generados con la estructura de nutec_marts
 *   "bigquery" consultas reales a nutec_marts
 */
type Fuente = "ejemplo" | "bigquery";

/** Un valor mal escrito ("BigQuery", "bq") no debe caer en silencio a los datos de ejemplo. */
function fuenteDeDatos(): Fuente {
  const valor = process.env.NUTEC_DATA_SOURCE;
  if (!valor || valor === "ejemplo") return "ejemplo";
  if (valor === "bigquery") return "bigquery";
  throw new Error(`NUTEC_DATA_SOURCE no válido: "${valor}". Usa "ejemplo" o "bigquery".`);
}

export function obtenerRepositorio(hoy: FechaISO): RepositorioMarts {
  return fuenteDeDatos() === "bigquery" ? repositorioBigQuery : crearRepositorioEjemplo(hoy);
}

export function usaDatosDeEjemplo(): boolean {
  return fuenteDeDatos() === "ejemplo";
}
