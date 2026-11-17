/**
 * Textos que ve el cliente, los mismos de docs/03_Especificacion_Vistas.md.
 * Si un texto cambia, se cambia primero en la especificación.
 */

export const AYUDA = {
  // 4.1 Fila 1 · Visibilidad en Google
  impresiones: "Veces que un resultado de NUTEC apareció en Google, aunque nadie le haya dado clic.",
  clics: "Veces que alguien le dio clic a un resultado de NUTEC en Google.",
  ctr: "Porcentaje de apariciones en Google que terminaron en clic. Se calcula sobre el total del periodo, no como promedio de días o páginas.",
  posicionPromedio:
    "Lugar promedio en que aparece NUTEC en Google, contando más las búsquedas con más impresiones. Puede empeorar aunque ganes visibilidad: cuando NUTEC empieza a aparecer en búsquedas nuevas en lugares bajos, el promedio baja. Para seguir búsquedas concretas, usa la posición rastreada de la sección de clusters.",

  // 4.2 Fila 2 · Resultados en el sitio
  sesiones: "Visitas al sitio que llegaron desde resultados orgánicos de buscadores.",
  conversiones: "Acciones valiosas que completaron las visitas orgánicas, como enviar un formulario. Una visita puede completar varias.",
  tasaConversion: "Porcentaje de visitas orgánicas en las que se completó al menos una conversión. No es conversiones entre sesiones: una visita puede completar varias conversiones, por eso esta tasa suele ser menor que esa división.",

  // 4.6 Textos de ayuda de la tabla y el embudo
  embudoSesiones: "Todas las visitas al sitio que llegaron desde resultados orgánicos de buscadores.",
  embudoInteraccion:
    "Visitas orgánicas que duraron más de 10 segundos, vieron dos o más páginas o completaron una conversión. Es la definición de GA4.",
  embudoConversion: "Visitas orgánicas en las que se completó al menos una conversión.",
  embudoTasaConversion: "Porcentaje de visitas orgánicas en las que se completó al menos una conversión. No es conversiones entre sesiones: una visita puede completar varias conversiones, por eso esta tasa suele ser menor que esa división.",
  tablaPagina: "Página por la que entraron las visitas desde búsqueda orgánica.",
  tablaSesiones: "Visitas orgánicas que entraron por esta página.",
  tablaConversiones:
    "Conversiones completadas en las visitas que entraron por esta página, aunque hayan ocurrido en otra página del sitio.",
  tablaTasaConversion:
    "Porcentaje de las visitas que entraron por esta página en las que se completó al menos una conversión.",
  sinPeriodoComparacion:
    "No hay datos suficientes del periodo anterior para comparar. Los datos de esta fuente empiezan el 1 de enero de 2026.",

  // 5. Estrategia por cluster: por qué no hay cambio contra el periodo anterior
  sinPeriodoComparacionSemrush:
    "No hay datos suficientes del periodo anterior para comparar. Las posiciones se miden desde el 4 de agosto de 2026.",
  sinBusquedasComparables: "Ninguna búsqueda se midió en los dos periodos, así que no hay con qué comparar.",

  // 5. Estrategia por cluster · Indicadores de posiciones rastreadas
  rastreadasTop10: "Búsquedas rastreadas cuya posición típica en el periodo está entre 1 y 10.",
  rastreadasVisibles: "Búsquedas rastreadas en las que NUTEC aparece entre los primeros 100 resultados.",
  rastreadasCitadasIa:
    "Búsquedas rastreadas en las que Google citó a NUTEC en su resumen con inteligencia artificial al menos una vez.",

  // Redactados el 9 de noviembre de 2026 a petición de Dilan (antes "[Texto pendiente]"); por confirmar.
  // Sección 3: periodo que todavía no tiene datos de la fuente (por ejemplo, "Mes actual" el día 1).
  mesSinDatos: "Este periodo todavía no tiene datos de esta fuente. Elige otro periodo o vuelve a consultar más tarde.",
  // Sección 4.4
  exclusionMenos30:
    "No se incluyen las páginas con menos de 30 sesiones: con tan pocas visitas, su tiempo y su tasa cambian mucho de un día a otro.",
  tablaTiempo: "Tiempo promedio que las visitas que entraron por esta página pasaron activas en el sitio.",
  // Sección 5
  top3: "Búsquedas rastreadas cuya posición típica en el periodo está entre 1 y 3.",
  conResumenIa: "Búsquedas en las que Google mostró un resumen con IA, cite o no a NUTEC.",
  resumenSinCita: "Búsquedas en las que Google mostró un resumen con IA y no citó a NUTEC en ningún día del periodo.",
  diasConResumenIa: "Días en que Google mostró un resumen con IA para esta búsqueda, de los días en que se revisó.",
  posicionRastreada:
    "Posición típica de la búsqueda en el periodo, según SEMrush: la del día de en medio al ordenar los días en que apareció en Google. Un día atípico no la mueve.",
  posicionCluster:
    "Posición típica de las búsquedas del cluster que sí aparecen en Google; las que no aparecen no entran en la cuenta. Léela junto con cuántas aparecen: pocas búsquedas bien colocadas no significan que el cluster vaya bien.",
  cambioCluster:
    "Lugares que subió o bajó la posición típica del cluster contra el periodo anterior. Se calcula solo con las búsquedas que aparecieron en los dos periodos; por eso dice cuántas se compararon.",
  tendencia:
    "Cómo se movió la posición día a día en el periodo. Si la línea sube, la búsqueda mejoró; si baja, empeoró. Los huecos son días en que no apareció entre los primeros 100 resultados.",
  diasVisible: "Días en que NUTEC apareció entre los primeros 100 resultados, de los días en que se revisó.",
  citacionIa: "Días en que Google citó a NUTEC en su resumen con IA, de los días en que se revisó.",
  sinMedir: "Sin medir: en este periodo no se revisó si Google citó a NUTEC. No significa que no haya cita.",
  volumen: "Búsquedas mensuales estimadas por SEMrush en Estados Unidos.",
  cambio: "Lugares que subió o bajó contra el periodo anterior. Solo se calcula si la búsqueda apareció en los dos periodos.",
  estado:
    "Bien: está en la primera página de Google y no viene cayendo. Vigilar: no pide acción por ahora, pero conviene seguirla. Atender: búsqueda prioritaria que está lejos de la primera página o no aparece, y no está mejorando.",
} as const;

/** Rótulos y mensajes de la especificación. */
export const ROTULO = {
  filaGsc: "Visibilidad en Google · Search Console",
  filaGa4: "Resultados en el sitio · GA4 · búsqueda orgánica",
  graficaGsc: "Impresiones y clics · Search Console",
  graficaGa4: "Sesiones y conversiones · GA4 orgánico",
  sinPeriodoComparacion: "Sin periodo de comparación",
  noDesglosadoPrivacidad: "No desglosado por privacidad",
  verTodas: "Ver todas",
} as const;

/**
 * Sección 4.2, "Sobre clics y sesiones": la guía de lectura lo explica. Son
 * las frases de la especificación, sin redactar nada nuevo. Por confirmar.
 */
export const GUIA_CLICS_Y_SESIONES = [
  "Clics (Search Console) y sesiones (GA4) nunca van a coincidir.",
  "Un clic no siempre se convierte en una sesión registrada (por ejemplo, si la persona rechaza las cookies o cierra antes de que cargue la página), y una sesión orgánica puede venir de otros buscadores además de Google.",
  "Son dos herramientas midiendo dos momentos distintos.",
] as const;

/**
 * Guía de lectura: qué significa cada estado de una búsqueda rastreada
 * (especificación, sección 5.6; regla en lib/posiciones.ts).
 */
export const GUIA_ESTADOS = {
  introduccion:
    "Cada búsqueda rastreada tiene un estado que resume su situación en una palabra. Se calcula con su posición típica en el periodo elegido y con cuánto cambió contra el periodo anterior. Solo Atender pide una acción; por eso se reserva para las búsquedas prioritarias.",
  bien: "Aparece en la primera página de Google (posición 1 a 10) y no viene cayendo. No hay nada que hacer.",
  vigilar:
    "No pide acción por ahora, pero conviene seguirla. Pasa cuando está en la segunda página (posición 11 a 20); cuando sigue en la primera página pero bajó 5 lugares o más; cuando es prioritaria y está lejos, pero va mejorando; o cuando no es prioritaria y está lejos o todavía no aparece.",
  atender:
    "Búsqueda prioritaria que necesita trabajo: está más allá de la segunda página (posición 21 o más), no aparece en Google o aparece menos de la mitad de los días, y no está mejorando. También cuando está en la segunda página y bajó 5 lugares o más.",
  prioritaria:
    "La búsqueda primaria de cada cluster y las secundarias con 100 o más búsquedas al mes. Las variantes son otras formas de escribir la misma búsqueda: mejoran al trabajar la primaria y las secundarias, por eso nunca se marcan como Atender.",
} as const;

/**
 * Guía de lectura: qué significan las alertas de "Qué revisar"
 * (especificación, sección 5.4; reglas en lib/posiciones.ts).
 */
export const GUIA_ALERTAS = {
  introduccion:
    "\"Qué revisar\" reúne lo que cambió contra el periodo anterior y los hallazgos que conviene conocer. Cada alerta lleva una prioridad, que dice cuánto importa. Una búsqueda puede no tener ninguna alerta.",
  prioridades: {
    Urgente: "Una búsqueda prioritaria salió de la primera página de Google, o dejó de aparecer estando en ella.",
    Atender: "Pide una acción: afecta a una búsqueda prioritaria, o una búsqueda cualquiera salió de la primera página.",
    Vigilar: "Conviene saberlo; no pide acción por ahora.",
    Bien: "Buena noticia: la búsqueda mejoró.",
  },
  tipos: {
    CAÍDA:
      "Perdió 5 lugares o más contra el periodo anterior, o dejó de aparecer. No se avisa cuando una búsqueda no prioritaria ya estaba más allá de la segunda página: a esa altura el movimiento es ruido.",
    MEJORA: "Ganó 5 lugares o más, o empezó a aparecer en Google.",
    "URL AJENA":
      "Google muestra una página de NUTEC distinta a la página objetivo del cluster. Si de todos modos está en la primera página, solo conviene saberlo.",
    "URL INESTABLE": "Google alterna entre dos páginas de NUTEC para la misma búsqueda.",
    INTERMITENTE: "Apareció menos de la mitad de los días medidos.",
    "IA SIN CAPTURA": "Está en la primera página y Google muestra un resumen de IA casi todos los días, pero no cita a NUTEC.",
    "DATO INSUFICIENTE": "Se midió menos de la mitad de los días del periodo; la posición típica no es confiable.",
  },
} as const;
