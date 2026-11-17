import { describe, expect, it } from "vitest";
import { calcularCambio, ctr, posicionPromedio, sumarGsc, tasaConversion } from "@/lib/metricas";
import { formatoEntero, formatoPorcentaje, formatoRango, textoCambio } from "@/lib/formato";

describe("los porcentajes se recalculan, no se promedian", () => {
  it("CTR de un grupo = suma de clics / suma de impresiones", () => {
    const chica = { impresiones: 10, clics: 5, posicionPorImpresiones: 0 }; // 50%
    const grande = { impresiones: 10_000, clics: 100, posicionPorImpresiones: 0 }; // 1%
    // El promedio de CTR daría 25.5%; el correcto es 105 / 10,010.
    expect(ctr(sumarGsc(chica, grande))).toBeCloseTo(105 / 10_010);
  });

  it("posición de Search Console ponderada por impresiones", () => {
    const s = sumarGsc(
      { impresiones: 100, clics: 0, posicionPorImpresiones: 100 * 3 },
      { impresiones: 900, clics: 0, posicionPorImpresiones: 900 * 20 },
    );
    expect(posicionPromedio(s)).toBeCloseTo(18.3);
  });

  it("tasa de conversión es de sesiones, nunca pasa de 100%", () => {
    expect(tasaConversion({ sesiones: 10, sesionesConEngagement: 6, conversiones: 14, sesionesConConversion: 3, segundosInteraccion: 0 })).toBe(0.3);
  });

  it("sin denominador no hay tasa", () => {
    expect(ctr({ impresiones: 0, clics: 0, posicionPorImpresiones: 0 })).toBeNull();
  });
});

describe("los cambios se expresan según el tipo de cifra", () => {
  it("conteos en porcentaje relativo", () => {
    expect(textoCambio(calcularCambio("conteo", 1124, 1000))).toBe("▲ 12.4%");
  });
  it("tasas en puntos porcentuales", () => {
    expect(textoCambio(calcularCambio("tasa", 0.011, 0.015))).toBe("▼ 0.4 pp");
  });
  it("posiciones en lugares: bajar el número es mejorar", () => {
    const c = calcularCambio("posicion", 22.5, 24.6);
    expect(c.sentido).toBe("mejora");
    expect(textoCambio(c)).toBe("▲ 2.1 lugares");
  });
  it("sin cambio se marca con =", () => {
    expect(textoCambio(calcularCambio("conteo", 1000, 1000))).toBe("= 0.0%");
  });
  it("un periodo anterior en cero no produce un porcentaje", () => {
    expect(calcularCambio("conteo", 5, 0).valor).toBeNull();
  });
});

describe("formato es-MX", () => {
  it("miles con coma y decimales con punto", () => {
    expect(formatoEntero(1240)).toBe("1,240");
    expect(formatoPorcentaje(0.0184)).toBe("1.8%");
  });
  it("rangos de fechas", () => {
    expect(formatoRango("2026-10-06", "2026-11-02")).toBe("6 oct – 2 nov 2026");
    expect(formatoRango("2026-10-01", "2026-10-04")).toBe("1 – 4 oct 2026");
  });
});
