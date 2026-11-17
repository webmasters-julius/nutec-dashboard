import { describe, expect, it } from "vitest";
import { obtenerResumen } from "@/lib/datos/resumen";
import { generarMarts, DIA_SIN_DATOS_GA4 } from "@/lib/datos/ejemplo/generador";
import { CANAL_ORGANICO } from "@/lib/datos/tipos";

const HOY = "2026-11-05";

describe("resumen orgánico sobre los datos de ejemplo", () => {
  it("cada fuente termina en su propio último día con datos", async () => {
    const r = await obtenerResumen({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    expect(r.gsc.datosHasta).toBe("2026-11-02");
    expect(r.ga4.datosHasta).toBe("2026-11-04");
  });

  it("la tabla de páginas suma al total de sesiones orgánicas (página de entrada)", async () => {
    const r = await obtenerResumen({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    const sumaPaginas = r.paginas.reduce((s, p) => s + (p.sesiones ?? 0), 0);
    const totalSerie = r.ga4.serie.reduce((s, p) => s + (p.a ?? 0), 0);
    expect(sumaPaginas).toBe(totalSerie);
    expect(r.ga4.indicadores[0].valor).toEqual({ estado: "dato", texto: totalSerie.toLocaleString("es-MX") });
  });

  it("solo suma el canal orgánico", async () => {
    const m = generarMarts(HOY);
    const r = await obtenerResumen({ tipo: "personalizado", desde: "2026-10-01", hasta: "2026-10-01" }, HOY);
    const organicas = m.fact_ga4_pagina_dia
      .filter((f) => f.fecha === "2026-10-01" && f.canal === CANAL_ORGANICO)
      .reduce((s, f) => s + f.sesiones, 0);
    expect(r.ga4.serie[0].a).toBe(organicas);
  });

  it("un día sin datos de GA4 queda como sin medir, no como cero", async () => {
    const r = await obtenerResumen({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    const dia = r.ga4.serie.find((p) => p.fecha === DIA_SIN_DATOS_GA4);
    expect(dia).toMatchObject({ diasConDatos: 0, a: null, b: null });
  });

  it("la tabla de páginas solo trae páginas de entrada de GA4 orgánico", async () => {
    const r = await obtenerResumen({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    expect(r.paginas.find((p) => p.path === "/es/productos/mantas-ceramicas")?.sesiones).toBeGreaterThan(0);
    // Una página que solo aparece en Search Console no está en la tabla de GA4.
    expect(r.paginas.find((p) => p.path === "/blog/ceramic-fiber-vs-mineral-wool")).toBeUndefined();
  });

  it("tabla de páginas: tiempo promedio = segundos de interacción entre sesiones de la página", async () => {
    const m = generarMarts(HOY);
    const r = await obtenerResumen({ tipo: "personalizado", desde: "2026-10-01", hasta: "2026-10-01" }, HOY);
    const filas = m.fact_ga4_pagina_dia.filter((f) => f.fecha === "2026-10-01" && f.canal === CANAL_ORGANICO && f.path === "/");
    const esperado = filas.reduce((s, f) => s + f.segundos_interaccion, 0) / filas.reduce((s, f) => s + f.sesiones, 0);
    expect(r.paginas.find((p) => p.path === "/")?.tiempoPromedio).toBeCloseTo(esperado);
  });

  it("el resumen no muestra usuarios", async () => {
    const r = await obtenerResumen({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    expect(r.ga4.indicadores.map((i) => i.id)).toEqual(["sesiones", "conversiones", "tasa-conversion"]);
  });

  it("sin periodo de comparación cuando el anterior empieza antes del 1 de enero", async () => {
    const r = await obtenerResumen({ tipo: "personalizado", desde: "2026-01-01", hasta: "2026-01-31" }, HOY);
    expect(r.gsc.indicadores.every((i) => i.cambio.estado === "sin-comparacion")).toBe(true);
  });

  it("rangos de más de 90 días se agrupan por semana", async () => {
    const r = await obtenerResumen({ tipo: "personalizado", desde: "2026-01-01", hasta: "2026-10-31" }, HOY);
    expect(r.gsc.granularidad).toBe("semana");
    expect(r.gsc.serie[0]).toMatchObject({ fecha: "2025-12-29", desde: "2026-01-01", diasPeriodo: 4 });
  });

  it("mes actual en sus primeros días, sin datos de Search Console todavía", async () => {
    const r = await obtenerResumen({ tipo: "atajo", atajo: "mes-actual" }, "2026-11-02");
    expect(r.gsc.periodo.estado).toBe("sin-datos-aun");
    expect(r.ga4.periodo.estado).toBe("con-datos");
  });
});
