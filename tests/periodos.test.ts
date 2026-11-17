import { describe, expect, it } from "vitest";
import { resolverPeriodo, seleccionDesdeParametros, granularidad, type Seleccion } from "@/lib/periodos";

const atajo = (a: "ultimos-7" | "ultimos-28" | "mes-actual" | "mes-anterior"): Seleccion => ({ tipo: "atajo", atajo: a });
const HOY = "2026-11-05";

describe("cada fuente usa su propio último día con datos", () => {
  it("últimos 28 días termina en el último día de cada fuente", () => {
    const gsc = resolverPeriodo(atajo("ultimos-28"), "gsc", "2026-11-02", HOY);
    const ga4 = resolverPeriodo(atajo("ultimos-28"), "ga4", "2026-11-04", HOY);
    expect(gsc).toEqual({
      estado: "con-datos",
      actual: { desde: "2026-10-06", hasta: "2026-11-02", dias: 28 },
      anterior: { desde: "2026-09-08", hasta: "2026-10-05", dias: 28 },
    });
    expect(ga4.estado === "con-datos" && ga4.actual).toEqual({ desde: "2026-10-08", hasta: "2026-11-04", dias: 28 });
  });

  it("últimos 7 días se compara contra los 7 inmediatamente anteriores", () => {
    const p = resolverPeriodo(atajo("ultimos-7"), "ga4", "2026-11-04", HOY);
    expect(p.estado === "con-datos" && p.anterior).toEqual({ desde: "2026-10-22", hasta: "2026-10-28", dias: 7 });
  });
});

describe("mes actual", () => {
  it("se compara contra los mismos días del mes anterior", () => {
    const p = resolverPeriodo(atajo("mes-actual"), "ga4", "2026-11-04", HOY);
    expect(p).toEqual({
      estado: "con-datos",
      actual: { desde: "2026-11-01", hasta: "2026-11-04", dias: 4 },
      anterior: { desde: "2026-10-01", hasta: "2026-10-04", dias: 4 },
    });
  });

  it("si el mes anterior es más corto, se recorta a su último día", () => {
    const p = resolverPeriodo(atajo("mes-actual"), "ga4", "2026-03-30", "2026-03-31");
    expect(p.estado === "con-datos" && p.anterior).toEqual({ desde: "2026-02-01", hasta: "2026-02-28", dias: 28 });
  });

  it("los primeros días del mes, sin datos de la fuente, no muestran ceros", () => {
    expect(resolverPeriodo(atajo("mes-actual"), "gsc", "2026-10-30", "2026-11-01")).toEqual({ estado: "sin-datos-aun" });
  });
});

describe("mes anterior", () => {
  it("se compara contra el mes calendario previo completo", () => {
    const p = resolverPeriodo(atajo("mes-anterior"), "gsc", "2026-11-02", HOY);
    expect(p).toEqual({
      estado: "con-datos",
      actual: { desde: "2026-10-01", hasta: "2026-10-31", dias: 31 },
      anterior: { desde: "2026-09-01", hasta: "2026-09-30", dias: 30 },
    });
  });

  it("si la fuente aún no cierra el mes, se compara contra los mismos días del mes previo", () => {
    // 1 de diciembre: Search Console solo llega al 28 de noviembre.
    const p = resolverPeriodo(atajo("mes-anterior"), "gsc", "2026-11-28", "2026-12-01");
    expect(p).toEqual({
      estado: "con-datos",
      actual: { desde: "2026-11-01", hasta: "2026-11-28", dias: 28 },
      // No octubre completo (31 días): eso daría una caída falsa.
      anterior: { desde: "2026-10-01", hasta: "2026-10-28", dias: 28 },
    });
  });
});

describe("sin periodo de comparación", () => {
  it("cuando el periodo anterior empieza antes del primer día con datos", () => {
    const p = resolverPeriodo(atajo("ultimos-28"), "gsc", "2026-01-20", "2026-01-23");
    expect(p.estado === "con-datos" && p.anterior).toBeNull();
  });

  it("mes anterior de enero no tiene comparación (diciembre de 2025 no existe)", () => {
    const p = resolverPeriodo(atajo("mes-anterior"), "ga4", "2026-02-02", "2026-02-03");
    expect(p.estado === "con-datos" && p.anterior).toBeNull();
  });

  it("un rango personalizado que empieza el 1 de enero no tiene comparación", () => {
    const p = resolverPeriodo({ tipo: "personalizado", desde: "2026-01-01", hasta: "2026-01-31" }, "gsc", "2026-11-02", HOY);
    expect(p.estado === "con-datos" && p.anterior).toBeNull();
  });
});

describe("rango personalizado", () => {
  it("se recorta al último día con datos de cada fuente y se compara contra el mismo largo", () => {
    const p = resolverPeriodo({ tipo: "personalizado", desde: "2026-10-01", hasta: "2026-11-04" }, "gsc", "2026-11-02", HOY);
    expect(p).toEqual({
      estado: "con-datos",
      actual: { desde: "2026-10-01", hasta: "2026-11-02", dias: 33 },
      anterior: { desde: "2026-08-29", hasta: "2026-09-30", dias: 33 },
    });
  });

  it("agrupa por semana en rangos de más de 90 días", () => {
    const p = resolverPeriodo({ tipo: "personalizado", desde: "2026-01-01", hasta: "2026-10-31" }, "gsc", "2026-11-02", HOY);
    expect(p.estado === "con-datos" && granularidad(p.actual)).toBe("semana");
  });
});

describe("parámetros de la URL", () => {
  it("cae en últimos 28 días si el valor no es válido", () => {
    expect(seleccionDesdeParametros({ periodo: "x" }, HOY)).toEqual({ tipo: "atajo", atajo: "ultimos-28" });
    expect(seleccionDesdeParametros({ periodo: "personalizado", desde: "2026-13-01", hasta: "2026-10-01" }, HOY)).toEqual({
      tipo: "atajo",
      atajo: "ultimos-28",
    });
  });
});
