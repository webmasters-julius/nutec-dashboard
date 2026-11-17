import { describe, expect, it } from "vitest";
import { agruparPuntos, puntoIncompleto, serieDiaria } from "@/lib/series";

type S = { n: number };
const sumar = (a: S, b: S) => ({ n: a.n + b.n });

// Del 6 de octubre (lunes) al 2 de noviembre de 2026, sin datos el 14 de octubre.
const filas = [];
for (let d = new Date("2026-10-06T00:00:00Z"); d <= new Date("2026-11-02T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) {
  const fecha = d.toISOString().slice(0, 10);
  if (fecha !== "2026-10-14") filas.push({ fecha, n: 10 });
}
const diario = serieDiaria("2026-10-06", "2026-11-02", filas, (f) => ({ n: f.n }));

describe("agrupación de series", () => {
  it("la serie diaria tiene un punto por día y null donde no hay datos", () => {
    expect(diario).toHaveLength(28);
    expect(diario.find((p) => p.fecha === "2026-10-14")).toMatchObject({ diasConDatos: 0, sumas: null });
  });

  it("por semana: semanas de lunes a domingo, y la que tiene un día sin datos queda incompleta", () => {
    const semanas = agruparPuntos(diario, "semana", sumar);
    expect(semanas.map((p) => p.fecha)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"]);
    // La primera semana empieza el martes 6: 6 de 7 días.
    expect(semanas[0]).toMatchObject({ desde: "2026-10-06", diasConDatos: 6, sumas: { n: 60 } });
    expect(puntoIncompleto(semanas[0])).toBe(true);
    // La semana del 12 tiene el 14 sin datos.
    expect(semanas[1]).toMatchObject({ diasConDatos: 6, sumas: { n: 60 } });
    expect(puntoIncompleto(semanas[2])).toBe(false);
  });

  it("por mes: los meses que el periodo no cubre completos quedan incompletos", () => {
    const meses = agruparPuntos(diario, "mes", sumar);
    expect(meses.map((p) => [p.fecha, p.diasConDatos, p.diasUnidad])).toEqual([
      ["2026-10-01", 25, 31],
      ["2026-11-01", 2, 30],
    ]);
    expect(meses.every(puntoIncompleto)).toBe(true);
  });

  it("la suma por cualquier agrupación es la misma", () => {
    const total = (ps: { sumas: S | null }[]) => ps.reduce((s, p) => s + (p.sumas?.n ?? 0), 0);
    expect(total(agruparPuntos(diario, "dia", sumar))).toBe(270);
    expect(total(agruparPuntos(diario, "semana", sumar))).toBe(270);
    expect(total(agruparPuntos(diario, "mes", sumar))).toBe(270);
  });
});
