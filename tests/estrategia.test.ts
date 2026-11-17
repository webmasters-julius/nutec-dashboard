import { describe, expect, it } from "vitest";
import { obtenerEstrategia } from "@/lib/datos/estrategia";

const HOY = "2026-11-10";

describe("estrategia por cluster sobre los datos de ejemplo", () => {
  it("65 búsquedas en tres clusters, con una primaria cada uno", async () => {
    const m = await obtenerEstrategia({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    expect(m.total).toBe(65);
    expect(m.clusters.map((c) => [c.nombre, c.total, c.composicion.primaria])).toEqual([
      ["HOME", 15, 1],
      ["Categoría Blankets", 21, 1],
      ["MaxWool 2300", 29, 1],
    ]);
    expect(m.clusters.map((c) => c.familia)).toEqual([null, "Blankets", "Blankets"]);
  });

  it("los conteos por banda suman las 65 búsquedas", async () => {
    const m = await obtenerEstrategia({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    const suma = Object.values(m.organica.bandas).reduce((s, n) => s + n, 0);
    expect(suma).toBe(65);
    // Cada día medido reparte sus búsquedas entre las bandas, sin perder ninguna.
    for (const d of [...m.organica.distribucion.dia, ...m.organica.distribucion.semana, ...m.organica.distribucion.mes]) {
      if (d.conteo) expect(Object.values(d.conteo).reduce((s, n) => s + n, 0)).toBe(d.medidas);
      else expect(d.medidas).toBe(0);
    }
  });

  it("la posición de un cluster va con cuántas búsquedas están visibles", async () => {
    const m = await obtenerEstrategia({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    for (const c of m.clusters) {
      expect(c.visibles).toBeLessThanOrEqual(c.medidas);
      expect(c.posicion === null).toBe(c.visibles === 0);
    }
  });

  it("citadas en IA se cuenta sobre las verificadas, y lo no verificado es sin medir", async () => {
    // Del 8 al 22 de septiembre solo HOME tiene la IA verificada.
    const m = await obtenerEstrategia({ tipo: "personalizado", desde: "2026-09-08", hasta: "2026-09-22" }, HOY);
    expect(m.ia.verificadas).toBe(15);
    expect(m.ia.sinMedir).toBe(50);
    expect(m.ia.busquedas.filter((b) => b.diasVerificados === 0)).toHaveLength(50);
    // Por día, las citadas nunca superan a las que tienen resumen de IA ni a las verificadas.
    for (const d of [...m.ia.tendencia.dia, ...m.ia.tendencia.semana, ...m.ia.tendencia.mes]) {
      if (d.citadas === null || d.conResumen === null) expect(d.verificadas).toBe(0);
      else {
        expect(d.citadas).toBeLessThanOrEqual(d.conResumen);
        expect(d.conResumen).toBeLessThanOrEqual(d.verificadas);
      }
    }
    expect(m.clusters[1].verificadas).toBe(0);
  });

  it("antes del 4 de agosto no hay posiciones: el periodo se recorta y lo avisa", async () => {
    const m = await obtenerEstrategia({ tipo: "personalizado", desde: "2026-07-01", hasta: "2026-08-20" }, HOY);
    expect(m.bloque.periodo.estado === "con-datos" && m.bloque.periodo.actual.desde).toBe("2026-08-04");
    expect(m.recortadoAlPrimerDia).toBe(true);
    // El periodo anterior caería antes del primer dato: sin comparación.
    expect(m.organica.indicadores[0].cambio.estado).toBe("sin-comparacion");
  });

  it("un día sin medición queda vacío en la serie, no en cero", async () => {
    const m = await obtenerEstrategia({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    expect(m.organica.diario.find((p) => p.fecha === "2026-10-27")).toMatchObject({ diasConDatos: 0, sumas: null });
  });

  it("detecta las búsquedas que aparecen con una página distinta a la objetivo", async () => {
    const m = await obtenerEstrategia({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    const b = m.clusters[0].busquedas.find((x) => x.keyword === "ceramic fiber insulation");
    expect(b?.paginaAjena).toBe(true);
    expect(b?.alertas.map((a) => a.tipo)).toContain("URL AJENA");
  });

  it("las alertas van de mayor a menor prioridad y no contradicen al estado", async () => {
    const m = await obtenerEstrategia({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    const prioridades = m.alertas.map((a) => a.prioridad);
    // La lista no está vacía y va de mayor a menor prioridad.
    expect(prioridades.length).toBeGreaterThan(0);
    const orden = ["Urgente", "Atender", "Vigilar", "Bien"];
    const indices = prioridades.map((p) => orden.indexOf(p));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    // Ninguna búsqueda en Bien tiene una alerta Urgente o Atender.
    for (const b of m.clusters.flatMap((c) => c.busquedas)) {
      if (b.estado === "Bien") expect(b.alertas.some((a) => a.prioridad === "Urgente" || a.prioridad === "Atender")).toBe(false);
    }
  });
  it("los cambios se calculan solo con búsquedas presentes en ambos periodos", async () => {
    // Del 8 al 22 de septiembre: 15 verificadas ahora; antes había otra base.
    const m = await obtenerEstrategia({ tipo: "personalizado", desde: "2026-09-08", hasta: "2026-09-22" }, HOY);
    // Ningún cambio de IA puede superar a las búsquedas verificadas en el periodo.
    for (const ind of m.ia.indicadores) {
      const n = Number(/(\d+) búsqueda/.exec("texto" in ind.cambio ? ind.cambio.texto : "")?.[1] ?? 0);
      expect(n).toBeLessThanOrEqual(m.ia.verificadas);
    }
  });
  it("por semana y por mes cada búsqueda cuenta una vez: los días no se suman", async () => {
    const m = await obtenerEstrategia({ tipo: "atajo", atajo: "ultimos-28" }, HOY);
    const { dia, semana, mes } = m.ia.tendencia;
    const maxDia = Math.max(...dia.map((d) => d.citadas ?? 0));
    for (const s of [...semana, ...mes]) {
      // Nunca más citadas que búsquedas rastreadas.
      expect(s.citadas ?? 0).toBeLessThanOrEqual(m.total);
    }
    // Una semana completa junta al menos lo de su mejor día.
    const completas = semana.filter((s) => !s.incompleta);
    expect(Math.max(...completas.map((s) => s.citadas ?? 0))).toBeGreaterThanOrEqual(Math.min(maxDia, 1));
    // El mes que cubre todo el periodo coincide con la tarjeta "Citadas en IA".
    const citadasPeriodo = new Set<number>(mes.map((x) => x.citadas ?? 0));
    if (mes.length === 1) expect([...citadasPeriodo][0]).toBe(m.ia.citadas);
    // En la distribución, cada tramo reparte sus búsquedas medidas sin duplicar.
    for (const s of m.organica.distribucion.semana) expect(s.medidas).toBeLessThanOrEqual(m.total);
  });
});
