import { describe, expect, it } from "vitest";
import {
  alertasDe,
  bandaDe,
  cambioDeGrupo,
  cambioEnLugares,
  estadoDe,
  mediana,
  resumirBusqueda,
  type FilaRank,
} from "@/lib/posiciones";

const fila = (dia: number, posicion: number | null, extra: Partial<FilaRank> = {}): FilaRank => ({
  fecha: `2026-10-${String(dia).padStart(2, "0")}`,
  keyword_id: "k1",
  posicion,
  path_rankeado: posicion === null ? null : "/products-engineering/blankets",
  serp_tiene_aio: null,
  citado_en_aio: null,
  aio_verificado: false,
  ...extra,
});

describe("mediana", () => {
  it("dos días atípicos no mueven la posición típica", () => {
    expect(mediana([7, 7, 9, 9, 10, 45, 45])).toBe(9);
  });
  it("ignora los días en que no apareció y no inventa un valor", () => {
    expect(mediana([null, 4, null, 6])).toBe(5);
    expect(mediana([null, null])).toBeNull();
  });
});

describe("bandas: una regla que cubre todos los casos", () => {
  it("cada posición cae en una banda", () => {
    expect(bandaDe(7, 1)).toBe("top3");
    expect(bandaDe(7, 3)).toBe("top3");
    expect(bandaDe(7, 3.5)).toBe("top10");
    expect(bandaDe(7, 10)).toBe("top10");
    expect(bandaDe(7, 11)).toBe("top20");
    expect(bandaDe(7, 20)).toBe("top20");
    expect(bandaDe(7, 21)).toBe("top100");
    expect(bandaDe(7, 100)).toBe("top100");
  });
  it("no apareció y sin medición son bandas distintas", () => {
    expect(bandaDe(7, null)).toBe("no-aparece");
    expect(bandaDe(0, null)).toBe("sin-medicion");
  });
});

describe("estado", () => {
  // Una secundaria prioritaria (100 o más búsquedas al mes), medida 20 días y visible todos.
  const base = { diasMedidos: 20, diasVisible: 20, rol: "secundaria" as const, volumen: 300, anterior: null };
  // Periodo anterior medido 20 días; si tuvo posición, apareció todos.
  const antes = (mediana: number | null) => ({ diasMedidos: 20, diasVisible: mediana === null ? 0 : 20, mediana });
  const estado = (k: Partial<Parameters<typeof estadoDe>[0]> & { mediana: number | null }) => estadoDe({ ...base, ...k }).estado;

  it("Bien: primera página y sin caída, sea o no prioritaria", () => {
    expect(estado({ mediana: 1 })).toBe("Bien");
    expect(estado({ mediana: 4 })).toBe("Bien");
    expect(estado({ mediana: 10 })).toBe("Bien");
    expect(estado({ mediana: 9, rol: "variante", volumen: 0 })).toBe("Bien");
    // Bajó 4 lugares: todavía no cuenta como caída.
    expect(estado({ mediana: 8, anterior: antes(4) })).toBe("Bien");
  });

  it("Vigilar: primera página con caída, o segunda página", () => {
    expect(estado({ mediana: 8, anterior: antes(3) })).toBe("Vigilar");
    expect(estado({ mediana: 11 })).toBe("Vigilar");
    expect(estado({ mediana: 20 })).toBe("Vigilar");
    expect(estado({ mediana: 15, rol: "primaria" })).toBe("Vigilar");
  });

  it("Atender: solo búsquedas prioritarias que están lejos, no aparecen o caen", () => {
    expect(estado({ mediana: 21 })).toBe("Atender");
    expect(estado({ mediana: 42, rol: "primaria", volumen: 0 })).toBe("Atender");
    expect(estado({ mediana: null, diasVisible: 0 })).toBe("Atender");
    // En la segunda página y bajando.
    expect(estado({ mediana: 18, anterior: antes(12) })).toBe("Atender");
  });

  it("una búsqueda que no es prioritaria nunca queda en Atender", () => {
    const noPrioritarias = [
      { rol: "variante" as const, volumen: 900 },
      { rol: "secundaria" as const, volumen: 90 },
      { rol: "secundaria" as const, volumen: null },
    ];
    for (const k of noPrioritarias) {
      expect(estado({ ...k, mediana: 60 })).toBe("Vigilar");
      expect(estado({ ...k, mediana: null, diasVisible: 0 })).toBe("Vigilar");
      expect(estado({ ...k, mediana: 18, anterior: antes(11) })).toBe("Vigilar");
    }
  });

  it("una prioritaria que está lejos pero mejora queda en Vigilar", () => {
    expect(estado({ mediana: 35, anterior: antes(60) })).toBe("Vigilar");
    // Antes no aparecía y ahora sí: también es mejora.
    expect(estado({ mediana: 70, anterior: antes(null) })).toBe("Vigilar");
    // Mejoró 3 lugares: no alcanza.
    expect(estado({ mediana: 35, anterior: antes(38) })).toBe("Atender");
  });

  it("si aparece menos de la mitad de los días, su posición no cuenta", () => {
    // Posición 3, pero solo 3 de 27 días: no es "Bien".
    expect(estado({ mediana: 3, diasMedidos: 27, diasVisible: 3 })).toBe("Atender");
    expect(estado({ mediana: 3, diasMedidos: 27, diasVisible: 3, rol: "variante" })).toBe("Vigilar");
    expect(estado({ mediana: 3, diasMedidos: 27, diasVisible: 14 })).toBe("Bien");
  });

  it("sin medición es Vigilar, y siempre hay un motivo", () => {
    const sinMedir = estadoDe({ ...base, diasMedidos: 0, diasVisible: 0, mediana: null });
    expect(sinMedir.estado).toBe("Vigilar");
    expect(sinMedir.motivo).toBe("No se midió en este periodo.");
    expect(estadoDe({ ...base, mediana: 5 }).motivo.length).toBeGreaterThan(0);
  });

  it("la posición del periodo anterior tampoco cuenta si apareció menos de la mitad de los días", () => {
    // Antes: 1 de 28 días en la posición 5. Ahora: 28 de 28 en la 12. No es una caída: empezó a aparecer.
    const k = { rol: "primaria" as const, diasMedidos: 28, diasVisible: 28, mediana: 12, anterior: { diasMedidos: 28, diasVisible: 1, mediana: 5 } };
    expect(estado(k)).toBe("Vigilar");
    expect(estadoDe({ ...base, ...k }).motivo).toBe("Está en la segunda página de Google, cerca de la primera.");
  });

  it("sin periodo de comparación no se evalúa caída ni mejora", () => {
    expect(estado({ mediana: 9, anterior: null })).toBe("Bien");
    expect(estado({ mediana: 40, anterior: null })).toBe("Atender");
  });
});

describe("resumen de una búsqueda", () => {
  it("distingue no medido, no apareció y apareció", () => {
    // 5 días medidos (falta el día 3), 3 con posición.
    const r = resumirBusqueda([fila(1, 8), fila(2, null), fila(4, 10), fila(5, null), fila(6, 9)]);
    expect(r).toMatchObject({ diasMedidos: 5, diasVisible: 3, mediana: 9, mejor: 8, peor: 10, banda: "top10" });
  });
  it("los días sin verificar no cuentan como no citada", () => {
    const r = resumirBusqueda([
      fila(1, 4),
      fila(2, 4, { aio_verificado: true, citado_en_aio: true, serp_tiene_aio: true }),
      fila(3, 4, { aio_verificado: true, citado_en_aio: false, serp_tiene_aio: true }),
    ]);
    expect(r).toMatchObject({ diasVerificados: 2, diasCitada: 1, diasConResumenIa: 2 });
    expect(resumirBusqueda([fila(1, 4), fila(2, 5)]).diasVerificados).toBe(0);
  });
  it("cuenta con qué páginas apareció", () => {
    const r = resumirBusqueda([fila(1, 4), fila(2, 5), fila(3, 6, { path_rankeado: "/blog/what-is-ceramic-fiber" })]);
    expect(r.paginaPrincipal).toBe("/products-engineering/blankets");
    expect(r.paginas).toHaveLength(2);
  });
});

describe("cambios entre periodos", () => {
  it("bajar el número es mejorar", () => {
    expect(cambioEnLugares(24.6, 22.5)).toBe(2.1);
  });
  it("una búsqueda que entra en la posición 80 no cuenta como empeoramiento", () => {
    expect(cambioEnLugares(null, 80)).toBeNull();
    const g = cambioDeGrupo([
      { anterior: 12, actual: 10 },
      { anterior: 20, actual: 18 },
      { anterior: null, actual: 80 },
    ]);
    expect(g).toEqual({ lugares: 2, comparables: 2 });
  });
});

describe("alertas", () => {
  const objetivo = "/products-engineering/blankets";
  const semana = (pos: (number | null)[], extra: Partial<FilaRank> = {}) => pos.map((p, i) => fila(i + 1, p, extra));
  const siete = (p: number | null, extra: Partial<FilaRank> = {}) => semana([p, p, p, p, p, p, p], extra);
  const alertas = (filas: FilaRank[], antes: number | null | undefined, prioritaria = false, diasPeriodo = 7) =>
    alertasDe({
      resumen: resumirBusqueda(filas),
      anterior: antes === undefined ? null : { diasMedidos: 7, diasVisible: antes === null ? 0 : 7, mediana: antes },
      pathObjetivo: objetivo,
      prioritaria,
      diasPeriodo,
    });
  const de = (lista: ReturnType<typeof alertas>, tipo: string) => lista.find((a) => a.tipo === tipo);

  it("Caída: Urgente solo si una prioritaria sale de la primera página", () => {
    expect(de(alertas(siete(14), 9, true), "CAÍDA")?.prioridad).toBe("Urgente");
    expect(de(alertas(siete(14), 9, false), "CAÍDA")?.prioridad).toBe("Atender");
    // Bajó 5 pero sigue en la primera página: solo conviene saberlo.
    expect(de(alertas(siete(8), 3, true), "CAÍDA")?.prioridad).toBe("Vigilar");
    // Prioritaria que baja fuera de la primera página.
    expect(de(alertas(siete(30), 22, true), "CAÍDA")?.prioridad).toBe("Atender");
  });

  it("Caída: una búsqueda no prioritaria que ya estaba lejos no genera alerta", () => {
    expect(de(alertas(siete(42), 37, false), "CAÍDA")).toBeUndefined();
    // Estaba en la segunda página: sí se avisa, como Vigilar.
    expect(de(alertas(siete(24), 16, false), "CAÍDA")?.prioridad).toBe("Vigilar");
    // Menos de 5 lugares no es caída.
    expect(de(alertas(siete(12), 9, true), "CAÍDA")).toBeUndefined();
  });

  it("Caída: dejar de aparecer también cuenta", () => {
    const a = de(alertas(siete(null), 6, true), "CAÍDA");
    expect(a?.prioridad).toBe("Urgente");
    expect(a?.detalle).toBe("Dejó de aparecer en Google (estaba en la posición 6)");
    expect(de(alertas(siete(null), 60, false), "CAÍDA")).toBeUndefined();
    // Nunca apareció: no es una caída.
    expect(de(alertas(siete(null), null, true), "CAÍDA")).toBeUndefined();
  });

  it("Mejora es una buena noticia, y solo donde importa", () => {
    const a = de(alertas(siete(9), 14), "MEJORA");
    expect(a?.prioridad).toBe("Bien");
    expect(a?.detalle).toBe("Entró a la primera página: subió 5 lugares (de 14 a 9)");
    expect(de(alertas(siete(60), 70, false), "MEJORA")).toBeUndefined();
    expect(de(alertas(siete(60), 70, true), "MEJORA")?.prioridad).toBe("Bien");
    // Antes no aparecía y ahora sí.
    expect(de(alertas(siete(34), null), "MEJORA")?.detalle).toBe("Empezó a aparecer en Google (posición 34)");
    expect(alertas(siete(9), 12)).toEqual([]);
  });

  it("Otra página: nunca es Urgente; Atender solo si es prioritaria y no está en la primera página", () => {
    const otra = { path_rankeado: "/blog/what-is-ceramic-fiber" };
    expect(de(alertas(siete(5, otra), 5, true), "URL AJENA")?.prioridad).toBe("Vigilar");
    expect(de(alertas(siete(15, otra), 15, true), "URL AJENA")?.prioridad).toBe("Atender");
    expect(de(alertas(siete(15, otra), 15, false), "URL AJENA")?.prioridad).toBe("Vigilar");
  });

  it("Cambia de página: un día suelto con otra página no cuenta", () => {
    const otra = { path_rankeado: "/blog/what-is-ceramic-fiber" };
    const unDia = [...semana([5, 5, 5, 5, 5, 5]), fila(7, 5, otra)];
    expect(de(alertas(unDia, 5), "URL INESTABLE")).toBeUndefined();
    const tresDias = [...semana([5, 5, 5, 5]), fila(5, 5, otra), fila(6, 5, otra), fila(7, 5, otra)];
    expect(de(alertas(tresDias, 5), "URL INESTABLE")?.prioridad).toBe("Vigilar");
  });

  it("Intermitente: menos de la mitad de los días", () => {
    expect(de(alertas(semana([5, null, null, null, 5, null, null]), 5, true), "INTERMITENTE")?.prioridad).toBe("Atender");
    expect(de(alertas(semana([5, null, null, null, 5, null, null]), 5, false), "INTERMITENTE")?.prioridad).toBe("Vigilar");
    // Apareció 4 de 7 días: no es intermitente.
    expect(de(alertas(semana([5, null, 5, null, 5, null, 5]), 5), "INTERMITENTE")).toBeUndefined();
    expect(de(alertas(siete(null), null), "INTERMITENTE")).toBeUndefined();
  });

  it("Oportunidad en IA solo con IA verificada, resumen frecuente, sin cita y en la primera página", () => {
    const verificada = { aio_verificado: true, serp_tiene_aio: true, citado_en_aio: false };
    expect(de(alertas(siete(6, verificada), 6), "IA SIN CAPTURA")?.prioridad).toBe("Vigilar");
    // Sin verificar no se sabe: no hay alerta.
    expect(de(alertas(siete(6), 6), "IA SIN CAPTURA")).toBeUndefined();
  });

  it("Pocos datos: se midió menos de la mitad de los días del periodo", () => {
    expect(de(alertas(semana([6, 6, 6]), null, false, 28), "DATO INSUFICIENTE")?.detalle).toContain("3 de 28 días");
    // En un periodo de 3 días, 3 días medidos son todos: no hay alerta.
    expect(de(alertas(semana([6, 6, 6]), null, false, 3), "DATO INSUFICIENTE")).toBeUndefined();
  });

  it("usa la misma posición confiable que el estado, en los dos periodos", () => {
    // Antes casi no aparecía (1 de 28 días en la 5) y ahora aparece siempre en la 12: es mejora, no caída.
    const mes = Array.from({ length: 28 }, (_, i) => fila(i + 1, 12));
    const lista = alertasDe({
      resumen: resumirBusqueda(mes),
      anterior: { diasMedidos: 28, diasVisible: 1, mediana: 5 },
      pathObjetivo: objetivo,
      prioritaria: true,
      diasPeriodo: 28,
    });
    expect(de(lista, "CAÍDA")).toBeUndefined();
    expect(de(lista, "MEJORA")?.detalle).toBe("Empezó a aparecer en Google (posición 12)");

    // Antes estable en la 8; ahora solo 2 de 28 días en la 3: no es mejora ni oportunidad en IA, es intermitente.
    const casiNada = Array.from({ length: 28 }, (_, i) => fila(i + 1, i < 2 ? 3 : null, { aio_verificado: true, serp_tiene_aio: true, citado_en_aio: false }));
    const otra = alertasDe({
      resumen: resumirBusqueda(casiNada),
      anterior: { diasMedidos: 28, diasVisible: 28, mediana: 8 },
      pathObjetivo: objetivo,
      prioritaria: false,
      diasPeriodo: 28,
    });
    expect(otra.map((a) => a.tipo)).toEqual(["INTERMITENTE"]);
  });

  it("sin periodo de comparación no hay caída ni mejora", () => {
    expect(alertas(siete(14), undefined, true)).toEqual([]);
  });
});
