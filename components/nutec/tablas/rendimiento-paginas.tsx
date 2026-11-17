"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { LinkButton } from "@/components/base/buttons/link-button";
import { Pagination } from "@/components/base/pagination/pagination";
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@/components/base/table/table";
import { ChevronSortDown } from "@/components/foundations/icons/chevrons";
import { Ayuda } from "@/components/nutec/ayuda";
import { formatoDuracion, formatoEntero, formatoPorcentaje, GUION } from "@/lib/formato";
import { AYUDA, ROTULO } from "@/lib/textos-ayuda";
import type { FilaPagina } from "@/lib/datos/resumen";
import { cx } from "@/utils/cx";

/**
 * Rendimiento por página (sección 4.4): solo GA4 orgánico, medido por página
 * de entrada, así que cada sesión cuenta una vez y la tabla suma al total.
 * Sigue la receta del Data Table de BoardUI (TanStack + Table + Pagination):
 * se ordena con clic en el encabezado de cada columna de cifras.
 */

type Columna = "sesiones" | "tiempoPromedio" | "conversiones" | "tasaConversion";
type Orden = { columna: Columna; descendente: boolean };

/**
 * Al ordenar por un promedio o una tasa (tiempo promedio, tasa de conversión)
 * se excluyen las páginas con menos sesiones que esto: con 2 sesiones, una
 * cifra extrema saldría primero sin significar nada.
 */
const MIN_SESIONES_TASA = 30;
const COLUMNAS_CON_MINIMO: Columna[] = ["tiempoPromedio", "tasaConversion"];

/** Valor numérico para ordenar; lo que no tiene cifra va al final. */
function valorOrden(f: FilaPagina, c: Columna): number {
  const v = f[c];
  return typeof v === "number" ? v : -1;
}
const PRIMERAS = 10;
const POR_PAGINA = 25;

function ordenar(filas: FilaPagina[], { columna, descendente }: Orden): FilaPagina[] {
  const base = COLUMNAS_CON_MINIMO.includes(columna) ? filas.filter((f) => f.sesiones >= MIN_SESIONES_TASA) : filas;
  const signo = descendente ? -1 : 1;
  return [...base].sort((a, b) => {
    const va = valorOrden(a, columna);
    const vb = valorOrden(b, columna);
    // Empates: la página con más sesiones primero.
    return (va - vb) * signo || b.sesiones - a.sesiones;
  });
}

function EncabezadoOrdenable({
  nombre,
  ayuda,
  columna,
  orden,
  onOrdenar,
}: {
  nombre: string;
  ayuda: string;
  columna: Columna;
  orden: Orden;
  onOrdenar: (c: Columna) => void;
}) {
  const activa = orden.columna === columna;
  return (
    <span className="flex items-center justify-end gap-1 whitespace-nowrap">
      {/* El nombre accesible es el de la columna; si la tabla está ordenada por ella, dice en qué sentido. */}
      <button
        type="button"
        onClick={() => onOrdenar(columna)}
        title="Ordenar"
        className="flex cursor-pointer items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      >
        {nombre}
        {activa && <span className="sr-only">{orden.descendente ? ", ordenado de mayor a menor" : ", ordenado de menor a mayor"}</span>}
        <ChevronSortDown
          className={cx(
            "size-6 shrink-0 transition-[transform,color] duration-150",
            activa && !orden.descendente && "rotate-180",
            activa ? "text-text-secondary" : "text-text-tertiary",
          )}
        />
      </button>
      <Ayuda label={nombre} hint={ayuda} />
    </span>
  );
}

export function RendimientoPaginas({ filas }: { filas: FilaPagina[] }) {
  const [orden, setOrden] = useState<Orden>({ columna: "sesiones", descendente: true });
  const [todas, setTodas] = useState(false);
  const [paginacion, setPaginacion] = useState<PaginationState>({ pageIndex: 0, pageSize: POR_PAGINA });

  const onOrdenar = (columna: Columna) => {
    // Un clic en otra columna ordena de mayor a menor; un segundo clic invierte el orden.
    setOrden((o) => (o.columna === columna ? { columna, descendente: !o.descendente } : { columna, descendente: true }));
    setPaginacion((p) => ({ ...p, pageIndex: 0 }));
  };

  // Al ordenar por un promedio o una tasa salen las páginas con pocas sesiones: "Ver todas" cuenta las que quedan.
  const ordenadas = useMemo(() => ordenar(filas, orden), [filas, orden]);
  const datos = useMemo(() => (todas ? ordenadas : ordenadas.slice(0, PRIMERAS)), [ordenadas, todas]);

  const columnas = useMemo<ColumnDef<FilaPagina>[]>(
    () => [
      {
        id: "path",
        header: () => (
          <span className="flex items-center gap-1 whitespace-nowrap">
            Página
            <Ayuda label="Página" hint={AYUDA.tablaPagina} />
          </span>
        ),
        cell: ({ row }) => (
          <Link
            href={`/pagina?path=${encodeURIComponent(row.original.path)}`}
            className="block max-w-[32rem] truncate text-body-medium text-text-primary underline-offset-2 hover:underline focus-visible:underline"
            title={row.original.path}
          >
            {row.original.path}
          </Link>
        ),
      },
      {
        id: "sesiones",
        header: () => (
          <EncabezadoOrdenable nombre="Sesiones" ayuda={AYUDA.tablaSesiones} columna="sesiones" orden={orden} onOrdenar={onOrdenar} />
        ),
        cell: ({ row }) => <span className="tabular-nums">{formatoEntero(row.original.sesiones)}</span>,
      },
      {
        id: "tiempoPromedio",
        header: () => (
          <EncabezadoOrdenable
            nombre="Tiempo promedio por sesión"
            ayuda={AYUDA.tablaTiempo}
            columna="tiempoPromedio"
            orden={orden}
            onOrdenar={onOrdenar}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {row.original.tiempoPromedio === null ? GUION : formatoDuracion(row.original.tiempoPromedio)}
          </span>
        ),
      },
      {
        id: "conversiones",
        header: () => (
          <EncabezadoOrdenable
            nombre="Conversiones"
            ayuda={AYUDA.tablaConversiones}
            columna="conversiones"
            orden={orden}
            onOrdenar={onOrdenar}
          />
        ),
        cell: ({ row }) => <span className="tabular-nums">{formatoEntero(row.original.conversiones)}</span>,
      },
      {
        id: "tasaConversion",
        header: () => (
          <EncabezadoOrdenable
            nombre="Tasa de conversión"
            ayuda={AYUDA.tablaTasaConversion}
            columna="tasaConversion"
            orden={orden}
            onOrdenar={onOrdenar}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.tasaConversion === null ? GUION : formatoPorcentaje(row.original.tasaConversion)}
          </span>
        ),
      },
    ],
    [orden],
  );

  const tabla = useReactTable({
    data: datos,
    columns: columnas,
    getRowId: (f) => f.path,
    state: { pagination: paginacion },
    onPaginationChange: setPaginacion,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Sin "Ver todas" se muestran las 10 primeras, que caben en una sola página.
  const filasVisibles = tabla.getRowModel().rows;
  const totalPaginas = tabla.getPageCount();
  const ocultasPorMinimo = COLUMNAS_CON_MINIMO.includes(orden.columna)
    ? filas.filter((f) => f.sesiones < MIN_SESIONES_TASA).length
    : 0;

  return (
    <section className="flex w-full flex-col rounded-2xl border border-border-table pt-2">
      <div className="flex w-full items-center px-3 py-2">
        <h3 className="text-body-medium text-text-primary">Rendimiento por página</h3>
      </div>
      {ocultasPorMinimo > 0 && (
        <p className="px-3 pb-1 text-body-regular text-text-tertiary">{AYUDA.exclusionMenos30}</p>
      )}

      <div className="mt-1">
        <Table aria-label="Rendimiento por página" size="sm" selectionMode="none" className="min-w-[720px]">
          <TableHeader>
            {tabla.getHeaderGroups()[0].headers.map((h) => (
              <TableColumn
                key={h.id}
                id={h.id}
                isRowHeader={h.id === "path"}
                className={cx(h.id === "path" ? "w-[32%]" : "text-end")}
              >
                {flexRender(h.column.columnDef.header, h.getContext())}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody renderEmptyState={() => <p className="px-3 py-6 text-start text-body-regular text-text-tertiary">Ninguna página en este periodo.</p>}>
            {filasVisibles.map((r) => (
              <TableRow key={r.id} id={r.id}>
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id} className={c.column.id === "path" ? undefined : "text-end"}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-separator-border px-3 py-3">
        {!todas && ordenadas.length > PRIMERAS ? (
          <LinkButton onClick={() => setTodas(true)}>{ROTULO.verTodas}</LinkButton>
        ) : (
          <span />
        )}
        {todas && totalPaginas > 1 && (
          <Pagination page={paginacion.pageIndex + 1} totalPages={totalPaginas} onChange={(p) => tabla.setPageIndex(p - 1)} />
        )}
      </div>
    </section>
  );
}
