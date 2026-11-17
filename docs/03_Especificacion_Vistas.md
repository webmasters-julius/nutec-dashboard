# Especificación de vistas del dashboard

**Última actualización: 16 de noviembre de 2026 (rev. 3)**
**Estado al 16 de noviembre de 2026:** construidas las vistas Resumen orgánico (sección 4) y Estrategia por cluster (sección 5), con el panel de cada búsqueda (sección 8, sin el bloque de Search Console) y la Guía de lectura. **No construidas:** vista Cluster (sección 6), vista Página (sección 7; hoy `/pagina` es un marcador que dice "Vista en construcción.") y vista Descubrimiento (sección 9). Quedan dos puntos por confirmar con NUTEC, listados al final, y varios textos marcados "por confirmar".
**Para:** el equipo de desarrollo y Claude Code (para implementar), y Dilan (como referencia de lo decidido).

Antes de leer este documento, lee `00_LEEME_Dashboard_SEO_NUTEC.md`. Las fórmulas de cada métrica están en `01_Analitica_Modelo_Datos_BigQuery.md`; este documento dice qué se muestra, dónde, cómo se rotula y por qué.

---

## 1. La regla que gobierna esta especificación

**Cada cifra debe decir qué mide.** El tablero junta tres herramientas que miden cosas distintas con nombres parecidos, y la forma más rápida de perder la confianza del cliente es que una cifra se lea como algo que no es.

Por eso, cada indicador del tablero cumple tres condiciones:

- **Muestra su fuente**, en el encabezado de la sección que lo agrupa ("Visibilidad en Google · Search Console") o junto al nombre cuando la cifra aparece fuera de una sección de una sola fuente, como en las columnas de una tabla que mezcla fuentes ("Clics · Search Console"). (Decisión del 6 de noviembre de 2026: en las tarjetas de una sección de una sola fuente, el nombre ya no repite la fuente.)
- **Tiene un ícono de ayuda**: un signo de interrogación junto al nombre que, al pasar el cursor, al enfocarlo con el teclado o al tocarlo en el celular, muestra una explicación de una o dos líneas de qué se cuenta. Los textos están en este documento y se usan tal cual. Va en **todos** los indicadores: si una tarjeta lo tiene y la de al lado no, parece que la segunda no necesita explicación.
- **Usa la definición de su herramienta de origen**, sin promedios ni ajustes propios. Si Yari aplica el mismo filtro y el mismo rango en Search Console o en GA4, debe ver la misma cifra.

---

## 2. Estructura del tablero

El tablero tiene dos vistas principales, de lo general a lo particular, cada una con su propia entrada en la navegación (corregido el 16 de noviembre de 2026: antes este apartado las describía como dos zonas, arriba y abajo, de una misma pantalla, y no es así como se construyó):

**Resumen orgánico (`/`).** En una sola pantalla y sin ruido: cómo se ve NUTEC en Google y qué produce el tráfico que llega desde Google. Son dos filas, una por fuente, y en cada una las tarjetas de indicadores van arriba y su gráfica principal debajo: cuatro tarjetas de Search Console con su minigráfica y la gráfica de impresiones y clics; tres tarjetas de GA4 y la gráfica de sesiones y conversiones. Después, el embudo orgánico y debajo la tabla de rendimiento por página. Cada indicador, gráfica y tabla va en su propio bloque, con espacio entre bloques. Es lo que alguien debe poder entender en menos de un minuto.

**Estrategia por cluster (`/clusters`).** El desglose por grupos de búsquedas, con las posiciones rastreadas en SEMrush. Desde aquí se abre el panel de cada búsqueda (sección 8). Bajar a cada cluster y a cada página queda para las vistas Cluster y Página, que no están construidas.

Aparte, una vista de **Descubrimiento** para encontrar búsquedas con oportunidad que todavía no se rastrean. No está construida.

**Navegación (16 de noviembre de 2026).** En pantallas anchas, un menú lateral con Resumen orgánico, Estrategia por cluster, Descubrimiento y Guía de lectura. Descubrimiento aparece deshabilitado con la etiqueta "Pronto", para que no parezca un error. Con el menú lateral contraído, en lugar del nombre se muestra la inicial "N". En pantallas chicas el menú lateral no se muestra: hay una barra superior con las vistas construidas (Resumen orgánico, Estrategia por cluster y Guía de lectura). Motivo: sin esa barra, en el celular no había forma de pasar de una vista a otra.

```
Resumen orgánico  (Search Console + GA4)
└── Estrategia por cluster  (SEMrush + las tres fuentes por cluster)
    └── Cluster
        ├── Página
        └── Keyword
Descubrimiento  (Search Console)
```

---

## 3. Elementos comunes

### Rango de fechas

**Un solo selector** arriba de toda la vista, siempre visible y compartido por todas las secciones: ninguna sección tiene su propio selector de fechas. Tiene cuatro atajos, **Últimos 7 días, Últimos 28 días, Mes actual y Mes anterior**, más un rango **Personalizado**. Se presenta como el de GA4: los atajos a la izquierda y el calendario a la derecha, con Cancelar y Aplicar; el botón muestra el atajo y sus fechas. El calendario marca los días de cada atajo según GA4. (Decisión del 9 de noviembre de 2026, que reemplaza a las pestañas de atajos más el calendario aparte y al selector dentro de la gráfica.)

**Valor por defecto: Últimos 28 días.** Son cuatro semanas completas: cada día de la semana aparece el mismo número de veces, y las comparaciones no se distorsionan por los fines de semana, que en un sitio industrial como el de NUTEC tienen mucho menos tráfico.

**Cada fuente usa su propio último día con datos.** Search Console tiene dos o tres días de retraso y GA4 uno. "Últimos 28 días" significa, para cada fuente, los 28 días que terminan en su último día con datos, igual que hacen sus propias interfaces. Así las cifras coinciden con lo que el cliente ve en cada herramienta. Las filas de Search Console y GA4 cubren por eso ventanas desplazadas uno o dos días entre sí, y la línea "datos hasta…" de cada fila lo hace visible.

No se usa una misma fecha de cierre para todas las fuentes: si "últimos 28 días" terminara ayer para Search Console, sus últimos días estarían vacíos, el periodo actual sumaría menos días que el anterior, y las impresiones y los clics mostrarían siempre una caída falsa.

**Comparación**, según el atajo:

| Atajo | Se compara contra |
|---|---|
| Últimos 7 y últimos 28 días | los 7 o 28 días inmediatamente anteriores |
| Mes actual | los mismos días del mes anterior: del 1 al 4 de noviembre contra del 1 al 4 de octubre. Si el mes anterior es más corto, se recorta a su último día |
| Mes anterior | el mes calendario previo completo: octubre contra septiembre, aunque tengan distinto número de días. Si la fuente todavía no cierra ese mes (los primeros días del mes siguiente), se compara contra los mismos días del mes previo, no contra el mes previo completo (16 de noviembre de 2026; motivo: comparar 28 días contra 31 daría una caída falsa) |
| Personalizado | el periodo inmediatamente anterior del mismo largo |

**Cuando no hay contra qué comparar**, el cambio dice "Sin periodo de comparación", nunca un porcentaje. Pasa en dos casos: cuando el periodo de comparación empieza, aunque sea en parte, antes del primer día con datos de la fuente (1 de enero de 2026 para Search Console y GA4), y el primer día de cada mes con el atajo "Mes actual", que todavía no tiene datos y lo indica con un mensaje en lugar de mostrar ceros.

**Conteos con días faltantes (16 de noviembre de 2026).** En el Resumen orgánico, el cambio de los conteos (impresiones, clics, sesiones y conversiones) solo se calcula si los dos periodos tienen datos todos sus días. Si falta algún día en cualquiera de los dos, el cambio no se muestra, porque compararía 27 días contra 28. Las tasas (CTR, tasa de conversión) sí se comparan.

No se ofrece comparación contra el año anterior hasta que haya datos: enero de 2027 para Search Console y GA4, agosto de 2027 para posiciones.

### Cómo se muestran los cambios

El tipo de cifra decide cómo se expresa su cambio. Un mismo formato para todo produce lecturas falsas: un CTR que pasa de 1.0% a 1.1% "sube 10%", lo cual es cierto y engañoso a la vez.

| Tipo de cifra | Ejemplos | Cómo se muestra el cambio |
|---|---|---|
| Conteos | impresiones, clics, sesiones, conversiones | porcentaje relativo: **▲ 12.4%** |
| Tasas | CTR, tasa de conversión, tasa de interacción | puntos porcentuales: **▲ 0.4 pp** |
| Posiciones | posición promedio, posición rastreada | lugares: **▲ 2.1 lugares** |

En las posiciones, un número más bajo es mejor. **El color y la flecha indican si la situación mejoró, no si el número subió**: pasar de la posición 24.6 a la 22.5 se muestra como mejora, en verde, con la flecha hacia arriba. La ayuda de cada indicador de posición lo aclara.

### Fecha de actualización por fuente

Cada bloque indica hasta qué día tiene datos su fuente, por ejemplo "Search Console · datos hasta el 2 de noviembre". Search Console tiene dos o tres días de retraso, GA4 uno, y SEMrush depende de la frecuencia de carga. Sin esta línea, alguien compara una semana completa de una fuente con una incompleta de otra sin darse cuenta.

### Guía de lectura

Apartado propio, con su entrada en la navegación lateral y un enlace discreto junto al título de cada vista, que reúne en lenguaje llano los textos de ayuda de la vista. No va dentro de la pantalla principal: esa pantalla se dedica a los datos, y cada cifra conserva su ícono de ayuda con el mismo texto (decisión del 5 de noviembre de 2026, que reemplaza a la sección desplegable bajo los indicadores).

**Alcance al 16 de noviembre de 2026:** la guía reúne los textos del Resumen orgánico y de Estrategia por cluster (indicadores de visibilidad orgánica y de IA, columnas de la tabla de citación, cifras de cada cluster y columnas de cada búsqueda: secciones 5.1, 5.2, 5.3 y 5.5), el apartado "Estado de cada búsqueda" (5.6) y el apartado "Qué revisar" (5.4). Usa los mismos textos que los íconos de ayuda.

---

## 4. Resumen orgánico

**Pregunta que responde:** ¿cómo le está yendo a NUTEC en búsqueda orgánica en este periodo?

### 4.1 Fila 1 · Visibilidad en Google

Cuatro indicadores de Search Console, todos los países, búsqueda web, cada uno en **su propia tarjeta**, con espacio entre tarjetas. El encabezado de la fila dice qué días cubre, hasta qué día tiene datos Search Console y contra qué periodo se compara; así ese rango no se repite en cada cifra.

Cada indicador lleva su nombre (sin repetir la fuente, que ya dice el encabezado), su ícono de ayuda, la cifra, el cambio y una **minigráfica** con su evolución en el periodo (por día, o por semana en rangos de más de 90 días). Al pasar el cursor sobre la minigráfica se ve el día y su cifra. Estas tarjetas no llevan ícono decorativo, para que sean más bajas: la minigráfica es su elemento visual. Reglas de las minigráficas:

- El CTR y la posición de cada día se recalculan con las sumas de ese día; no se promedian.
- La minigráfica de posición tiene el eje invertido: subir en la gráfica es mejorar.
- El color de la línea sigue al cambio: verde si mejoró, rojo si empeoró, azul si no cambió o no hay comparación.
- Un día sin datos corta la línea. En impresiones y clics, una semana incompleta también la corta, para no simular una caída; al pasar el cursor se ve su cifra y cuántos días cubre.

(Decisión del 6 de noviembre de 2026: tarjetas separadas con minigráfica, que reemplazan a las tarjetas sin minigráfica.)

| Indicador | Qué se cuenta | Texto de ayuda |
|---|---|---|
| **Impresiones** | suma de impresiones | Veces que un resultado de NUTEC apareció en Google, aunque nadie le haya dado clic. |
| **Clics** | suma de clics | Veces que alguien le dio clic a un resultado de NUTEC en Google. |
| **CTR** | clics entre impresiones del periodo completo | Porcentaje de apariciones en Google que terminaron en clic. Se calcula sobre el total del periodo, no como promedio de días o páginas. |
| **Posición promedio** | promedio ponderado por impresiones | Lugar promedio en que aparece NUTEC en Google, contando más las búsquedas con más impresiones. Puede empeorar aunque ganes visibilidad: cuando NUTEC empieza a aparecer en búsquedas nuevas en lugares bajos, el promedio baja. Para seguir búsquedas concretas, usa la posición rastreada de la sección de clusters. |

### 4.2 Fila 2 · Resultados en el sitio

Tres indicadores de GA4, **solo del canal de búsqueda orgánica**. El rótulo del bloque lo dice: "Resultados en el sitio · GA4 · búsqueda orgánica". Cada uno va en su propia tarjeta, con espacio entre tarjetas, con su ícono de ayuda y su cambio, arriba de la gráfica principal de la fila (sección 4.3). No llevan minigráfica: su evolución está en la gráfica principal.

| Indicador | Qué se cuenta | Texto de ayuda |
|---|---|---|
| **Sesiones** | sesiones del canal orgánico | Visitas al sitio que llegaron desde resultados orgánicos de buscadores. |
| **Conversiones** | suma de eventos clave del canal orgánico | Acciones valiosas que completaron las visitas orgánicas, como enviar un formulario. Una visita puede completar varias. |
| **Tasa de conversión** | sesiones con al menos una conversión, entre sesiones | Porcentaje de visitas orgánicas en las que se completó al menos una conversión. No es conversiones entre sesiones: una visita puede completar varias conversiones, por eso esta tasa suele ser menor que esa división. |

**Usuarios no se muestra** (decisión del 6 de noviembre de 2026). Los usuarios no se pueden sumar entre días: una persona que visitó tres días distintos es un solo usuario en el periodo, y GA4 los cuenta para el rango completo. GA4 entra por el conector de Fivetran, que sincroniza los informes por día, así que con esos datos no se puede obtener la cifra de un rango cualquiera sin sumar días, y esa suma no coincidiría con GA4. Nunca se muestra una suma de usuarios diarios.

**Sobre Conversiones.** En GA4 se llaman eventos clave. Cuentan las que NUTEC tenga configuradas como tales en su propiedad; ver "Puntos por confirmar".

**Sobre clics y sesiones.** Clics (Search Console) y sesiones (GA4) nunca van a coincidir, y es la primera pregunta que va a surgir. La guía de lectura lo explica: un clic no siempre se convierte en una sesión registrada (por ejemplo, si la persona rechaza las cookies o cierra antes de que cargue la página), y una sesión orgánica puede venir de otros buscadores además de Google. Son dos herramientas midiendo dos momentos distintos.

### 4.3 Gráficas

Cada fila tiene una gráfica principal, a todo lo ancho, **debajo de sus tarjetas**:

- **Search Console:** impresiones y clics como dos curvas suaves, cada una con su área degradada debajo y su color; impresiones sobre el eje izquierdo y clics sobre el derecho, porque sus escalas son muy distintas (en un mismo eje, los clics quedarían planos en el fondo); al pasar el cursor, una línea guía vertical punteada marca el punto. Tiene un estilo distinto al de GA4 para que las dos filas no se vean iguales (decisión del 9 de noviembre de 2026).
- **GA4:** sesiones en barras redondeadas sobre el eje izquierdo y conversiones en línea con puntos sobre el derecho.

Las dos funcionan igual, con líneas guía horizontales punteadas (en Search Console, "barra" se refiere al punto de la curva):

- **Lector, arriba de la gráfica.** En reposo **no** muestra el total del periodo, que ya está en las tarjetas: muestra en gris "Pasa el cursor sobre la gráfica para ver cada día" (o "cada semana", "cada mes", según la agrupación). Al pasar el cursor por un punto, esa barra se resalta, las demás se atenúan, y el lector muestra la fecha (o el rango de la semana o el mes) y las cifras de las dos series en ese punto. En el celular, el lector se activa al tocar una barra.
- **Agrupación.** Un selector en la esquina de cada gráfica para **agrupar por día, semana o mes**. Al abrir la vista empieza por día en rangos de hasta 90 días y por semana en rangos más largos. Cambiar la agrupación no cambia el periodo ni las cifras totales, solo cómo se reparten. Semanas de lunes a domingo; meses de calendario. El periodo lo controla el selector de fechas global (sección 3); las gráficas no tienen selector de fechas propio.
- **Leyenda, debajo de la gráfica.** Un recuadro por serie, solo con su color y su nombre, sin cifras: las cifras están en el lector.
- **Días y periodos incompletos.** Un día sin datos no tiene barra y corta la línea. Una semana o un mes incompletos (porque el periodo no los cubre completos o porque les faltan días con datos) llevan la barra atenuada en GA4 y cortan la curva o la línea, y el lector dice cuántos días cubren.

(Decisiones del 6 y 9 de noviembre de 2026, que reemplazan a las dos gráficas lado a lado, a la gráfica con barras delgadas y minimapa, y al encabezado con el total del periodo.)

### 4.4 Rendimiento por página

En pantalla va debajo del embudo orgánico (4.5), como dice la sección 2; la numeración de estas dos secciones no sigue el orden de la pantalla.

Tabla con las páginas por las que entra el tráfico orgánico, **solo con datos de GA4**. **Se mide por página de entrada**: la primera página de cada visita. Así cada sesión cuenta una sola vez y la tabla suma al total de sesiones orgánicas.

| Columna | Fuente | Nota |
|---|---|---|
| Página | | ruta de la página; clic para abrir su detalle (al 16 de noviembre de 2026 abre `/pagina`, un marcador: la vista Página no está construida) |
| Sesiones | GA4 | orgánicas, que entraron por esta página |
| Tiempo promedio por sesión | GA4 | tiempo de interacción promedio de esas sesiones: segundos de interacción entre sesiones. Es la métrica de GA4 para páginas de destino; GA4 no tiene "tiempo en la página" por página de entrada |
| Conversiones | GA4 | de esas sesiones |
| Tasa de conversión | GA4 | de esas sesiones |

Muestra las 10 primeras y un enlace "Ver todas". Orden por defecto: **sesiones**, de mayor a menor. Se ordena con clic en el encabezado de cada columna de cifras (un segundo clic invierte el orden), con el chevron de las tablas de BoardUI. Al ordenar por tiempo promedio o por tasa de conversión se excluyen las páginas con menos de 30 sesiones en el periodo, porque una página con 2 sesiones y 1 conversión aparecería primero con 50%.

Texto de ayuda de Tiempo promedio por sesión en esta tabla: "Tiempo promedio que las visitas que entraron por esta página pasaron activas en el sitio." (redactado el 9 de noviembre de 2026, por confirmar).

(Decisión del 6 de noviembre de 2026: la tabla deja de mezclar Search Console y GA4, y los atajos de orden en pestañas se reemplazan por encabezados ordenables. Los clics y el CTR por página quedan para la vista Página.)

### 4.5 Embudo orgánico

Un embudo en el que cada paso es parte del anterior, todos medidos en la misma unidad:

| Paso | Qué se cuenta |
|---|---|
| **Sesiones orgánicas** | todas las visitas desde búsqueda orgánica |
| **Sesiones con interacción** | las que duraron más de 10 segundos, vieron dos o más páginas o completaron una conversión |
| **Sesiones con conversión** | las que completaron al menos una conversión |

Cada paso muestra su cifra y el porcentaje respecto del primero. El porcentaje del tercer paso es la **tasa de conversión** (el último paso entre el primero) y se rotula así, con su ícono de ayuda; no hay una línea aparte para la tasa (decisión del 9 de noviembre de 2026).

Se dibuja como un **flujo horizontal con transiciones curvas**: una columna por paso, cuya altura es proporcional a su cifra, unida al paso siguiente por una curva. Cada columna lleva en el centro una píldora con el porcentaje respecto del primer paso (en el tercero, "Tasa de conversión" y el porcentaje) y, debajo, un recuadro con el color, el nombre del paso, su ícono de ayuda y la cifra. Al pasar el cursor sobre un paso, los demás se atenúan.

La altura proporcional es lo que evita el problema del trapecio clásico de embudo, que deforma la proporción entre pasos: aquí la curva solo une un paso con el siguiente y no altera la altura de ninguno. Por eso un paso pequeño, como las sesiones con conversión, se ve como una franja delgada; no se engrosa para que se vea mejor.

Se construye desde cero con los tokens de gráfica de BoardUI. No es el Funnel Chart Card de BoardUI, que es de pago (decisión del 5 de noviembre de 2026, que reemplaza a las barras horizontales proporcionales).

**Por qué no sesiones, usuarios y conversiones.** Un embudo funciona cuando cada paso es un subconjunto del anterior. Usuarios no lo es: siempre hay menos usuarios que sesiones porque una persona visita varias veces, no porque "se cayeran" en el camino. Y las conversiones pueden superar a los usuarios, porque una persona puede convertir dos veces. El porcentaje entre esos pasos no significaría nada. 

### 4.6 Textos de ayuda de la tabla y el embudo

Igual que los de los indicadores, se usan tal cual.

| Elemento | Texto de ayuda |
|---|---|
| Embudo · Sesiones orgánicas | Todas las visitas al sitio que llegaron desde resultados orgánicos de buscadores. |
| Embudo · Sesiones con interacción | Visitas orgánicas que duraron más de 10 segundos, vieron dos o más páginas o completaron una conversión. Es la definición de GA4. |
| Embudo · Sesiones con conversión | Visitas orgánicas en las que se completó al menos una conversión. |
| Embudo · Tasa de conversión | Porcentaje de visitas orgánicas en las que se completó al menos una conversión. No es conversiones entre sesiones: una visita puede completar varias conversiones, por eso esta tasa suele ser menor que esa división. |
| Tabla · Página | Página por la que entraron las visitas desde búsqueda orgánica. |
| Tabla · Sesiones | Visitas orgánicas que entraron por esta página. |
| Tabla · Tiempo promedio por sesión | Tiempo promedio que las visitas que entraron por esta página pasaron activas en el sitio. |
| Tabla · Conversiones | Conversiones completadas en las visitas que entraron por esta página, aunque hayan ocurrido en otra página del sitio. |
| Tabla · Tasa de conversión | Porcentaje de las visitas que entraron por esta página en las que se completó al menos una conversión. |
| Cambio · Sin periodo de comparación (solo Search Console y GA4) | No hay datos suficientes del periodo anterior para comparar. Los datos de esta fuente empiezan el 1 de enero de 2026. |

El texto de "Sin periodo de comparación" de esta tabla es **solo para Search Console y GA4**; Estrategia por cluster usa los suyos (sección 5.5), porque las posiciones se miden desde el 4 de agosto de 2026 (aclarado el 16 de noviembre de 2026).

Los textos "Tabla · Clics", "Tabla · CTR" y "Guion en una celda" se movieron a la sección 7 (vista Página) el 16 de noviembre de 2026: la tabla de rendimiento por página ya no tiene columnas de Search Console (decisión del 6 de noviembre) y esos textos no se usan hoy en la interfaz.

### 4.7 Lo que no va en el resumen

- **Posiciones de SEMrush**: van en la sección de clusters.
- **Backlinks**: no forman parte de las fuentes del proyecto.
- **Comparación contra el año anterior**: no hay datos hasta 2027.
- **Otros canales de GA4**: el resumen es de búsqueda orgánica.

---

## 5. Estrategia por cluster

**Pregunta que responde:** ¿cómo va la visibilidad de NUTEC en el buscador orgánico y en la inteligencia artificial de Google, y qué búsquedas hay que revisar?

Vive en `/clusters`. Es una sola pantalla y **solo usa SEMrush**: las búsquedas rastreadas (hoy 65), agrupadas en clusters. Usa el mismo selector de fechas global (sección 3), con las ventanas de SEMrush: la posición se mide desde el 4 de agosto de 2026, y un periodo que empiece antes se recorta y lo avisa ("La posición se mide desde el 4 de agosto de 2026").

De arriba hacia abajo (decisiones del 9 de noviembre de 2026, a partir del monitor de posiciones en HTML):

### 5.1 Visibilidad orgánica

Tres tarjetas, cada una con su cambio y una minigráfica del conteo de cada día:

| Indicador | Qué se cuenta | Denominador | Texto de ayuda |
|---|---|---|---|
| **En top 100** | búsquedas con al menos un día con posición en el periodo | búsquedas con al menos un día medido ("32 de 65") | Búsquedas rastreadas en las que NUTEC aparece entre los primeros 100 resultados. |
| **En top 10** | búsquedas cuya posición típica (mediana de los días en que apareció) está entre 1 y 10 | el mismo | Búsquedas rastreadas cuya posición típica en el periodo está entre 1 y 10. |
| **En top 3** | igual, con mediana entre 1 y 3 | el mismo | Búsquedas rastreadas cuya posición típica en el periodo está entre 1 y 3. |

El cambio de estos conteos se expresa en búsquedas ("▲ 3 búsquedas", "= sin cambio"), no en porcentaje: con conteos chicos, "▲ 15%" dice menos que "▲ 3 búsquedas". Es una excepción a la tabla de la sección 3.

**Base de la comparación (9 de noviembre de 2026).** El cambio de cada conteo se calcula solo con las búsquedas presentes en ambos periodos: las que tienen al menos un día medido en los dos (visibilidad orgánica) o al menos un día con la IA verificada en los dos (visibilidad en IA). Motivo: si el periodo anterior tiene menos búsquedas medidas o verificadas, comparar los conteos completos muestra una subida o una caída que solo refleja que la base cambió. Ejemplo real: del 8 al 22 de septiembre la IA se verificó en 15 búsquedas y en el periodo anterior en 65; la tarjeta decía "▼ 25 búsquedas" sin que nada hubiera empeorado. El valor grande de la tarjeta sigue siendo el del periodo completo; solo el cambio usa la base común. Si ninguna búsqueda está en ambos periodos, se muestra "Sin periodo de comparación", con su propio texto de ayuda (5.5, 16 de noviembre de 2026).

Debajo, la **distribución de posiciones** (replanteada el 9 de noviembre de 2026; sustituye a la franja de bandas "antes y ahora", que resultó confusa): una barra apilada por día. Cada tramo es una banda de posición y su alto es el número de búsquedas que estuvieron en esa banda ese día, según la posición de ese día (no la mediana del periodo). El alto total de la barra son las búsquedas dentro del top 100. Bandas: posiciones 1 a 3, 4 a 10, 11 a 20 y 21 a 100. La banda de posiciones 1 a 3 va abajo, pegada a la base, para que su evolución se lea sin esfuerzo. Las búsquedas que no aparecen no se dibujan (no son una posición); el lector dice cuántas fueron. Un día sin medición queda vacío y el lector dice s/m.

**Cuatro bandas y su color (ajustado el 9 de noviembre de 2026).** Antes eran cinco (Top 3, Top 10, Borde de página 1, Página 2 y Página 3 o más) en una sola gama de índigo; se distinguían poco entre sí. Ahora son cuatro: **posiciones 1 a 3, 4 a 10, 11 a 20 y 21 a 100** (el 9 de noviembre se llamaban Top 3, Top 10, Top 20 y Top 100; ver el párrafo siguiente). La de posiciones 1 a 3 es la que más importa y lleva un color propio (verde), muy distinto del resto; las otras tres comparten la gama índigo, de más intensa a más tenue y con saltos amplios. El mismo código se usa en la franja en miniatura de cada cluster, en la marca de cada búsqueda y en la gráfica diaria del panel. El amarillo queda reservado para la citación en IA. Las bandas son solo para leer la distribución: el estado y las alertas siguen con sus propias reglas (Anexo B de `01_Analitica_Modelo_Datos_BigQuery.md`).

**Nombre visible de las bandas (16 de noviembre de 2026).** En la leyenda de la gráfica, en la franja de cada cluster y en el panel de la búsqueda, cada banda se nombra por su rango: "Posiciones 1 a 3", "Posiciones 4 a 10", "Posiciones 11 a 20" y "Posiciones 21 a 100". Antes decía "Top 10 (4 a 10)". Se cambió porque la banda no acumula (4 a 10) y los indicadores "En top 10" sí (1 a 10): la tarjeta decía 16 y el tramo de la gráfica 11, con el mismo nombre. "En top 100", "En top 10" y "En top 3" quedan reservados para los indicadores acumulados.

El lector de arriba dice, para el día bajo el cursor, "26 de 65 búsquedas en el top 100" y cuántas no aparecen; la leyenda muestra cuántas hubo en cada banda ese día.

**Agrupación por día, semana o mes (16 de noviembre de 2026).** La gráfica de distribución de posiciones y la tendencia de IA (5.2) llevan el mismo selector Día / Semana / Mes que las gráficas del Resumen orgánico; por defecto Día, y Semana en rangos de más de 90 días. Aquí los días **no se suman**, porque lo que se cuenta son búsquedas y la misma búsqueda aparece varios días:

- En la **distribución**, la banda de cada búsqueda en una semana o un mes sale de su posición típica (mediana) en ese tramo.
- En la **tendencia de IA**, una búsqueda cuenta como citada (o con resumen de IA) si lo estuvo al menos un día del tramo. Es la misma regla de las tarjetas, así que al agrupar los números suben: un día típico muestra 3 o 4 citadas y su semana, 7 u 8.

Una semana o un mes que no caen completos dentro del periodo van atenuados, no entran en la línea de tendencia, y el lector dice cuántos días cubren ("3 de 7 días").

**Nombre "En top 100" (9 de noviembre de 2026).** Antes "Visibles". Se cambió porque "visibles" no decía visibles dónde; "En top 100" sigue la misma forma que "En top 10" y "En top 3". En las filas de cluster también dice "16 de 21 en top 100".

No se muestra una "posición rastreada promedio" del sitio: un número que resume 65 búsquedas de intenciones distintas no describe nada, y empeora cada vez que se agrega una búsqueda nueva aunque nada haya empeorado. La posición se queda a nivel de cluster y de búsqueda, siempre con cuántas están visibles.

### 5.2 Visibilidad en IA

Tres tarjetas:

| Indicador | Qué se cuenta | Denominador | Texto de ayuda |
|---|---|---|---|
| **Citadas en IA** | búsquedas con al menos un día en que Google citó a NUTEC en su resumen de IA | búsquedas con al menos un día **verificado** en el periodo | Búsquedas rastreadas en las que Google citó a NUTEC en su resumen con inteligencia artificial al menos una vez. |
| **Con resumen de IA** | búsquedas en que Google mostró resumen de IA al menos un día verificado | búsquedas verificadas | Búsquedas en las que Google mostró un resumen con IA, cite o no a NUTEC. |
| **Con resumen de IA y sin cita** | las anteriores sin ninguna cita en el periodo | búsquedas con resumen de IA | Búsquedas en las que Google mostró un resumen con IA y no citó a NUTEC en ningún día del periodo. |

El denominador son las búsquedas **verificadas**, no las 65: las que no se revisaron en el periodo son "sin medir" y no cuentan como "no citadas". Si ninguna se verificó, las tarjetas dicen s/m. En "Con resumen de IA y sin cita", que el número suba se marca como empeoramiento.

Debajo, la citación en IA en **dos niveles** (replanteado el 9 de noviembre de 2026; sustituye a la cuadrícula de cuadritos y a las columnas por semana, que no se entendían):

1. **Nivel general: tendencia por día.** Dos líneas sobre las búsquedas verificadas cada día: en cuántas Google mostró un resumen de IA (línea punteada gris) y en cuántas NUTEC fue citada (línea amarilla con relleno). La distancia entre ambas es la oportunidad. El lector dice "4 búsquedas citadas en IA" y, al lado, "26 con resumen de IA · 64 verificadas" (texto ajustado el 16 de noviembre de 2026: la versión anterior, "4 citadas de 26 con resumen de IA", obligaba a interpretar el "de"). Un día sin verificación corta la línea y dice s/m, nunca 0.
2. **Nivel búsqueda: tabla "Citación por búsqueda".** Una fila por búsqueda con su rol, su cluster, los días con resumen de IA y los días citada, ambos sobre sus días verificados ("19 de 27 días"), con una barra de proporción en la columna de citada. Orden: de más a menos días citada; las no verificadas van al final con s/m. Filtros (se combinan): por cluster, por tipo de búsqueda (primaria, secundaria, variante; agregados el 16 de noviembre de 2026) y por citación (Todas, Citadas en IA, Con resumen de IA y sin cita). Muestra 8 con "Ver todas". Cada fila abre el panel de la búsqueda.

Las tarjetas cuentan búsquedas citadas **al menos un día** del periodo; la tendencia cuenta las citadas **cada día**. Por eso la tarjeta puede decir 11 y ningún día de la gráfica llegar a 11.

### 5.3 Clusters y búsquedas

Los clusters van en tarjetas desplegables, en el orden de `dim_cluster.numero`. Los que comparten **familia** (hoy "Blankets": Categoría Blankets y MaxWool 2300) van agrupados bajo el nombre de la familia. Su encabezado dice cuántos clusters y cuántas búsquedas rastreadas reúne ("Familia de 2 clusters · 50 búsquedas rastreadas en total") y, a la derecha, dos totales con su nombre arriba: "En top 100 · 26 de 50" y "En top 10 · 12 de 50", que son la suma de sus clusters. No tiene posición propia. (Aclarado el 16 de noviembre de 2026: antes decía "12 en top 10 · 26 de 50 en top 100" en un solo renglón y no se entendía qué era cada número.) Un filtro por rol (Todas, Primaria, Secundarias, Variantes) aplica a toda la lista.

**Encabezado de cluster (recompuesto el 16 de noviembre de 2026).** La versión anterior juntaba en un solo renglón "6.8 · 6 de 15 en top 100 · Posición rastreada · ▼ 1.7 lugares sobre 6 búsquedas" y no se entendía qué número era qué. Ahora tiene tres partes:

1. **Título:** nombre del cluster y, al lado, cuántas búsquedas rastreadas tiene ("15 búsquedas rastreadas"; el número sale de `dim_keyword`, así que cambia solo al agregar o quitar búsquedas). Debajo, la composición ("1 primaria · 9 secundarias · 5 variantes") y la página objetivo. A la derecha, el conteo de estados. Este renglón abre y cierra el cluster.
2. **Franja de bandas:** al pasar el cursor por un tramo, o tocarlo en el celular, el renglón de abajo dice cuántas búsquedas hay en ese tramo, nombrando el rango de posiciones: "3 búsquedas en posiciones 4 a 10", "9 búsquedas no aparecen". No dice "Top 10" a propósito: el tramo no acumula (4 a 10) y la cifra "En top 10" sí (1 a 10); con el mismo nombre parecerían contradecirse.
3. **Cinco cifras en un solo renglón, cada una con su nombre arriba y su ícono de ayuda:** En top 100 ("6 de 15"), En top 10 ("4 de 15"), Posición rastreada ("6.8 · típica de las 6 que aparecen"), Cambio de posición ("▼ 1.7 lugares · en 6 búsquedas"; guion si no hay comparación) y Citadas en IA ("5 de 15", o s/m). La aclaración va al lado del valor, no debajo, y el cambio tiene su propia columna, para que el encabezado no crezca en alto (ajuste del 16 de noviembre de 2026). **Denominadores (aclarado el 16 de noviembre de 2026).** En "En top 100" y "En top 10" el denominador son las búsquedas del cluster con al menos un día medido en el periodo; en "Citadas en IA", las que tienen al menos un día verificado (igual que en 5.1 y 5.2). Por eso puede ser menor que el número de búsquedas rastreadas del título. Los totales de la familia usan el mismo denominador. Ayuda de Cambio de posición (por confirmar): "Lugares que subió o bajó la posición típica del cluster contra el periodo anterior. Se calcula solo con las búsquedas que aparecieron en los dos periodos; por eso dice cuántas se compararon."

La posición rastreada del cluster es la mediana de las posiciones típicas de las búsquedas que aparecen en el top 100; las que no aparecen no tienen posición y no entran. El cambio compara la mediana actual contra la anterior usando solo las búsquedas que aparecieron en ambos periodos, y dice cuántas fueron. Texto de ayuda (por confirmar): "Posición típica de las búsquedas del cluster que sí aparecen en Google; las que no aparecen no entran en la cuenta. Léela junto con cuántas aparecen: pocas búsquedas bien colocadas no significan que el cluster vaya bien."

**Fila de búsqueda** (orden por rol y después por volumen):

| Columna | Nota |
|---|---|
| Búsqueda | con marca de color de su banda; la primaria destacada, la variante discreta; ícono si aparece con una página distinta a la objetivo |
| Volumen | búsquedas mensuales estimadas; guion si SEMrush no tiene estimación (volumen 0) |
| Posición | mediana del periodo; guion si no apareció |
| Cambio | en lugares; guion si no apareció en ambos periodos |
| Tendencia | línea con la posición de cada día del periodo; hacia arriba es mejor; el punto final lleva el color de la banda en que terminó; los días en que no apareció cortan la línea; "No aparece" si no apareció ningún día; s/m si no se midió |
| Cita en IA | citada / verificado: "7 de 7", o s/m en gris |
| Estado | Bien, Atender o Vigilar |

**Columna Tendencia (9 de noviembre de 2026).** Sustituye a la "tira de posición" (una escala horizontal de 1 a 100 con un punto, una cola y un carril de "No aparece"), que no se entendía: pedía aprender una escala propia para leer un dato que ya estaba en la columna Posición. La tendencia responde la pregunta que faltaba: ¿va mejorando o empeorando? La columna "Días en top 100" salió de la fila para dar espacio al nombre de la búsqueda; sigue en el panel.

Clic en la fila abre el panel de la búsqueda (sección 8). En el celular la fila muestra la búsqueda, la posición, el estado y la tendencia.

Search Console y GA4 por cluster, y la fila "Sin cluster", no van en esta pantalla: quedan para la vista Cluster (sección 6), donde se puede aclarar que esas fuentes miden páginas y SEMrush mide búsquedas.

### 5.4 Qué revisar

Va al final de la vista (9 de noviembre de 2026): es la lista de pendientes que sale de todo lo anterior.

Junto al título van los conteos por prioridad ("5 Atender · 23 Vigilar"). Debajo, hasta 5 alertas, con "Ver todas". Van primero las de mayor prioridad y después por rol y volumen. Cada una muestra su prioridad, su nombre, la búsqueda, el cluster y el detalle, y abre el panel de la búsqueda.

**Alertas redefinidas el 16 de noviembre de 2026**, con el mismo criterio que los estados (5.6): la prioridad dice cuánto importa. Antes la lista tenía unas 40 alertas, muchas en rojo.

| Prioridad | Qué significa |
|---|---|
| **Urgente** | Una búsqueda prioritaria salió de la primera página de Google, o dejó de aparecer estando en ella. |
| **Atender** | Pide una acción: afecta a una búsqueda prioritaria, o una búsqueda cualquiera salió de la primera página. |
| **Vigilar** | Conviene saberlo; no pide acción por ahora. |
| **Bien** | Buena noticia: la búsqueda mejoró. |

| Alerta | Qué significa (texto de la guía de lectura) |
|---|---|
| Caída | Perdió 5 lugares o más contra el periodo anterior, o dejó de aparecer. No se avisa cuando una búsqueda no prioritaria ya estaba más allá de la segunda página: a esa altura el movimiento es ruido. |
| Mejora | Ganó 5 lugares o más, o empezó a aparecer en Google. |
| Otra página | Google muestra una página de NUTEC distinta a la página objetivo del cluster. Si de todos modos está en la primera página, solo conviene saberlo. |
| Cambia de página | Google alterna entre dos páginas de NUTEC para la misma búsqueda. |
| Intermitente | Apareció menos de la mitad de los días medidos. |
| Oportunidad en IA | Está en la primera página y Google muestra un resumen de IA casi todos los días, pero no cita a NUTEC. |
| Pocos datos | Se midió menos de la mitad de los días del periodo; la posición típica no es confiable. |

**Detalle de cada alerta (registrado el 16 de noviembre de 2026, tal como está en `lib/posiciones.ts`; por confirmar).** Es la frase que acompaña a cada alerta en "Qué revisar" y en el panel de la búsqueda. Lo que va entre llaves se sustituye por el dato.

| Alerta | Detalle |
|---|---|
| Caída | Dejó de aparecer en Google (estaba en la posición {posición anterior}) |
| Caída | Salió de la primera página: bajó {n} lugares (de {posición anterior} a {posición actual}) |
| Caída | Bajó {n} lugares (de {posición anterior} a {posición actual}) |
| Otra página | Aparece con {página con la que aparece}; la página objetivo es {página objetivo} |
| Cambia de página | Alterna entre {página 1} ({n} días) y {página 2} ({n} días) |
| Oportunidad en IA | Google mostró resumen de IA {n} de {verificados} días y no citó a NUTEC |
| Intermitente | Apareció solo {n} de {medidos} días |
| Mejora | Empezó a aparecer en Google (posición {posición actual}) |
| Mejora | Entró a la primera página: subió {n} lugares (de {posición anterior} a {posición actual}) |
| Mejora | Subió {n} lugares (de {posición anterior} a {posición actual}) |
| Pocos datos | Se midió solo {n} de {días del periodo} días; la posición típica no es confiable |

**Texto de entrada del apartado "Qué revisar" de la guía (registrado el 16 de noviembre de 2026; por confirmar):**

> "Qué revisar" reúne lo que cambió contra el periodo anterior y los hallazgos que conviene conocer. Cada alerta lleva una prioridad, que dice cuánto importa. Una búsqueda puede no tener ninguna alerta.

Las alertas se muestran con estos nombres, no con los códigos internos en mayúsculas (CAÍDA, URL AJENA…). Las reglas exactas y la prioridad de cada caso están en el Anexo B de `01_Analitica_Modelo_Datos_BigQuery.md`. La guía de lectura tiene un apartado "Qué revisar" con estas dos tablas.

### 5.5 Textos de ayuda de esta vista

Redactados el 9 de noviembre de 2026 a petición de Dilan y ya visibles en la interfaz (antes decía "[Texto pendiente]"). Quedan por confirmar.

| Elemento | Texto |
|---|---|
| En top 3 | Búsquedas rastreadas cuya posición típica en el periodo está entre 1 y 3. |
| Con resumen de IA (tarjeta) | Búsquedas en las que Google mostró un resumen con IA, cite o no a NUTEC. |
| Con resumen de IA (columna) | Días en que Google mostró un resumen con IA para esta búsqueda, de los días en que se revisó. |
| Con resumen de IA y sin cita | Búsquedas en las que Google mostró un resumen con IA y no citó a NUTEC en ningún día del periodo. |
| Posición | Posición típica de la búsqueda en el periodo, según SEMrush: la del día de en medio al ordenar los días en que apareció en Google. Un día atípico no la mueve. |
| Tendencia | Cómo se movió la posición día a día en el periodo. Si la línea sube, la búsqueda mejoró; si baja, empeoró. Los huecos son días en que no apareció entre los primeros 100 resultados. |
| Días en top 100 | Días en que NUTEC apareció entre los primeros 100 resultados, de los días en que se revisó. |
| Citación en IA | Días en que Google citó a NUTEC en su resumen con IA, de los días en que se revisó. |
| s/m | Sin medir: en este periodo no se revisó si Google citó a NUTEC. No significa que no haya cita. |
| Volumen | Búsquedas mensuales estimadas por SEMrush en Estados Unidos. |
| Cambio | Lugares que subió o bajó contra el periodo anterior. Solo se calcula si la búsqueda apareció en los dos periodos. |
| Estado | Bien: está en la primera página de Google y no viene cayendo. Vigilar: no pide acción por ahora, pero conviene seguirla. Atender: búsqueda prioritaria que está lejos de la primera página o no aparece, y no está mejorando. |

El texto "Citación en IA" se usa con tres rótulos: "Cita en IA" (columna de la fila de búsqueda), "Citada en IA" (columna de la tabla "Citación por búsqueda") y "Citación en IA" (panel de la búsqueda).

Textos de "Sin periodo de comparación" en esta vista (redactados el 16 de noviembre de 2026; por confirmar). Motivo: la vista usaba el texto del Resumen orgánico, que dice que los datos empiezan el 1 de enero de 2026, y eso no es cierto para las posiciones.

| Cuándo | Texto |
|---|---|
| No hay periodo anterior con datos de posición | No hay datos suficientes del periodo anterior para comparar. Las posiciones se miden desde el 4 de agosto de 2026. |
| Hay periodo anterior, pero ninguna búsqueda se midió (o se verificó) en los dos | Ninguna búsqueda se midió en los dos periodos, así que no hay con qué comparar. |

Otros dos textos redactados el 9 de noviembre de 2026, también por confirmar:

| Elemento | Texto |
|---|---|
| Periodo todavía sin datos de la fuente (sección 3) | Este periodo todavía no tiene datos de esta fuente. Elige otro periodo o vuelve a consultar más tarde. |
| Páginas excluidas al ordenar por tiempo o tasa (sección 4.4) | No se incluyen las páginas con menos de 30 sesiones: con tan pocas visitas, su tiempo y su tasa cambian mucho de un día a otro. |

### 5.6 Estados: Bien, Vigilar y Atender

Redefinidos el 16 de noviembre de 2026. **Motivo:** con la regla anterior (la de Supabase) solo el top 3 era "Bien" y casi todo lo demás era "Atender"; el tablero se leía como una lista de advertencias. El criterio nuevo es que **solo "Atender" pide una acción**, así que se reserva para las búsquedas prioritarias que no van mejorando.

| Estado | Qué significa para quien lo lee |
|---|---|
| **Bien** | Aparece en la primera página de Google (posición 1 a 10) y no viene cayendo. No hay nada que hacer. |
| **Vigilar** | No pide acción por ahora, pero conviene seguirla. Pasa cuando está en la segunda página (posición 11 a 20); cuando sigue en la primera página pero bajó 5 lugares o más; cuando es prioritaria y está lejos, pero va mejorando; o cuando no es prioritaria y está lejos o todavía no aparece. |
| **Atender** | Búsqueda prioritaria que necesita trabajo: está más allá de la segunda página (posición 21 o más), no aparece en Google o aparece menos de la mitad de los días, y no está mejorando. También cuando está en la segunda página y bajó 5 lugares o más. |

**Búsqueda prioritaria:** La búsqueda primaria de cada cluster y las secundarias con 100 o más búsquedas al mes. Las variantes son otras formas de escribir la misma búsqueda: mejoran al trabajar la primaria y las secundarias, por eso nunca se marcan como Atender.

La tabla exacta de reglas, en orden, está en el Anexo B de `01_Analitica_Modelo_Datos_BigQuery.md`, junto con la frase de motivo que muestra el panel para cada caso. Dos precisiones del 16 de noviembre de 2026, detalladas ahí: una búsqueda que aparece menos de la mitad de los días medidos cuenta como que no aparece, en el periodo actual y en el anterior, y las alertas usan esa misma posición; y los cortes son "10 o menos" y "20 o menos", así que una posición típica de 10.5 cuenta como segunda página y 20.5 como más allá de la segunda.

**Texto de entrada del apartado "Estado de cada búsqueda" de la guía (registrado el 16 de noviembre de 2026; por confirmar):** "Cada búsqueda rastreada tiene un estado que resume su situación en una palabra. Se calcula con su posición típica en el periodo elegido y con cuánto cambió contra el periodo anterior. Solo Atender pide una acción; por eso se reserva para las búsquedas prioritarias."

En la interfaz:

- **Colores:** Bien en verde, Atender en naranja y Vigilar en gris. Vigilar no pide acción, así que no lleva un color de advertencia; el único color cálido de la vista es Atender.
- **Orden:** en el encabezado de cada cluster los conteos van como Bien, Vigilar, Atender.
- **Motivo:** el panel de cada búsqueda dice, debajo del estado, por qué lo tiene, en una frase ("Está en la segunda página de Google, cerca de la primera.").
- **Guía de lectura:** tiene un apartado "Estado de cada búsqueda" con estos textos.

Las alertas de "Qué revisar" se redefinieron el mismo día con este criterio (5.4): ninguna búsqueda en "Bien" tiene una alerta Urgente o Atender.

---

## 6. Vista Cluster

**Estado al 16 de noviembre de 2026: no construida.** No existe la ruta de un cluster; lo que sigue es la especificación.

**Pregunta que responde:** ¿cómo va este grupo de búsquedas y la página que debería atraerlas?

**Encabezado:** nombre del cluster, página objetivo con enlace, y composición: "1 primaria · 6 secundarias · 14 variantes".

**Aclaración que la vista hace explícita.** Search Console y GA4 miden **las páginas del cluster**, con todas las búsquedas que llegan a ellas. SEMrush mide **las búsquedas rastreadas del cluster**, sin importar con qué página aparecen. Por eso un cluster puede tener muchas impresiones y malas posiciones al mismo tiempo. Cada bloque lleva una línea que dice qué está midiendo.

**Indicadores:** las dos filas del resumen limitadas a las páginas del cluster, y los tres conteos de SEMrush limitados a sus búsquedas.

**Gráfica: distribución de posiciones en el tiempo.** Barras apiladas que muestran, cada día, cuántas búsquedas del cluster hay en cada banda: posiciones 1 a 3, 4 a 10, 11 a 20 y 21 a 100 (la misma gráfica y las mismas cuatro bandas de la sección 5.1; corregido el 16 de noviembre de 2026: antes decía áreas apiladas y nombraba las bandas como top 3, top 10, top 20 y top 100). Cuenta lo que pasa sin promediar: si cinco búsquedas suben de la segunda página a la primera, se ve crecer la banda correspondiente.

**Tabla de búsquedas rastreadas:**

| Columna | Nota |
|---|---|
| Búsqueda | clic para abrir el detalle |
| Rol | primaria destacada, variante discreta |
| Volumen | búsquedas mensuales estimadas |
| Posición rastreada | mediana del periodo; guion si no apareció ningún día |
| Días en top 100 | apareció / medido: "18 de 22" (antes "Visible", "18/22") |
| Citación en IA | citada / verificado: "7 de 7", o **s/m** en gris si no se verificó |
| Cambio | en lugares, contra el periodo anterior |
| Estado | Bien, Atender o Vigilar |
| Página que aparece | marcada si es distinta a la página objetivo del cluster |

Orden por defecto: rol y después volumen. Filtro rápido por rol.

**Tabla de páginas del cluster:** las mismas columnas que la tabla de rendimiento por página del resumen.

**Alertas del cluster:** las activas en el periodo, cada una con su búsqueda y enlace al detalle.

---

## 7. Vista Página

**Estado al 16 de noviembre de 2026: no construida.** `/pagina` es un marcador que muestra la ruta elegida y "Vista en construcción."; lo que sigue es la especificación.

**Pregunta que responde:** ¿qué hace esta página por NUTEC?

**Indicadores:** las dos filas del resumen limitadas a esta página (en GA4, las sesiones que entraron por ella), más cuántas búsquedas rastreadas aparecen con esta página.

**Gráficas:** las mismas dos del resumen, limitadas a la página.

**Tabla de búsquedas de Search Console que llevan a la página:** búsqueda, impresiones, clics, CTR y posición promedio. Las que también rastrea SEMrush llevan una marca. Al final, el renglón **"No desglosado por privacidad"** con lo que Search Console no asigna a ninguna búsqueda, para que la tabla sume al total de arriba.

**Tabla de búsquedas rastreadas que aparecen con esta página:** búsqueda, cluster, días en que apareció con esta página y posición rastreada en esos días. Si la búsqueda pertenece a otro cluster, se marca: es la señal de que dos páginas de NUTEC compiten entre sí.

**Tabla de conversiones:** nombre del evento clave y conteo, para las sesiones que entraron por esta página.

**Textos de ayuda reservados para esta vista** (venían de la sección 4.6; movidos el 16 de noviembre de 2026; hoy no se usan en la interfaz):

| Elemento | Texto de ayuda |
|---|---|
| Clics | Clics desde Google hacia esta página, según Search Console. |
| CTR | Porcentaje de las apariciones de esta página en Google que terminaron en clic. |
| Guion en una celda | Sin datos de esta fuente para esta página en el periodo. |

---

## 8. Vista Keyword

**Pregunta que responde:** ¿dónde aparece NUTEC para esta búsqueda?

Se abre como panel lateral desde cualquier tabla, sin perder la vista anterior.

**Estado al 16 de noviembre de 2026:** construido como panel dentro de Estrategia por cluster (se abre desde la fila de búsqueda, la tabla "Citación por búsqueda" y "Qué revisar"), con el encabezado, los indicadores, la gráfica diaria, el estado con su motivo y sus alertas, y el historial de páginas. **Pendiente:** el bloque de Search Console.

**Encabezado:** búsqueda, rol, cluster y volumen.

**Gráfica de posición rastreada diaria** (construida; escala comprimida con las bandas de posición de fondo; un carril arriba para la citación en IA con tres estados, y un carril abajo para los días en que no apareció; una línea punteada cuando cambia la página que aparece; lector arriba en lugar de recuadro flotante):
- Eje vertical **invertido**: la posición 1 arriba.
- Los días en que NUTEC no apareció se ven como un **corte en la línea**, no como caída a cero.
- Los días con cita en el resumen de IA llevan una **marca** sobre el punto.
- Los días anteriores a que la búsqueda se rastreara no se dibujan, y se indica desde cuándo hay datos.
- Al pasar el cursor: fecha, posición, página que apareció y si hubo cita en IA.

**Indicadores:** posición rastreada, días en top 100 (antes "visible"), citación en IA y cambio.

**Search Console para esta búsqueda exacta (pendiente, no construido):** impresiones, clics, CTR y posición promedio, rotulada "Posición promedio · Search Console" y en un bloque separado de la gráfica. Si la búsqueda no aparece en Search Console, se muestra **"Sin datos en Search Console"**, nunca cero: puede que no haya tenido impresiones o que Search Console la haya ocultado por privacidad, y no hay forma de distinguirlo.

**Historial de páginas:** qué páginas de NUTEC aparecieron y cuántos días cada una.

**Sin bloque de GA4:** GA4 no registra con qué búsqueda llegó cada visita.

---

## 9. Vista Descubrimiento

**Estado al 16 de noviembre de 2026: no construida.** En la navegación aparece deshabilitada con la etiqueta "Pronto"; lo que sigue es la especificación.

**Pregunta que responde:** ¿qué búsquedas están cerca de dar resultados y todavía no las rastreamos?

Tabla de búsquedas de Search Console del periodo con al menos **100 impresiones** y **posición promedio entre 8 y 15**, es decir, en el borde de la primera página. Columnas: búsqueda, página principal que aparece, impresiones, clics, CTR, posición promedio y si ya está rastreada en SEMrush. Orden por impresiones.

Interruptor para **excluir búsquedas de marca** (las que contienen "nutec"), activado por defecto: casi siempre tienen buen desempeño y llenan la lista sin ser oportunidades.

---

## 10. Las dos posiciones

El tablero muestra dos posiciones distintas. Las dos son correctas y casi nunca coinciden, porque miden cosas diferentes:

| | Posición promedio · Search Console | Posición rastreada · SEMrush |
|---|---|---|
| Qué mide | el promedio en todas las búsquedas reales en que apareció NUTEC | la posición de 65 búsquedas elegidas, revisadas una vez al día |
| Cómo se resume | promedio ponderado por impresiones | mediana de los días del periodo |
| Dónde aparece | resumen orgánico, vista Página, vista Keyword, Descubrimiento | estrategia por cluster, vista Cluster, vista Keyword |

**Reglas de convivencia:**
- **Siempre con su fuente a la vista.** Nunca dice solo "Posición" sin que se sepa de qué herramienta es: la fuente va en el nombre o en el encabezado de la sección de una sola fuente que la contiene. En una vista donde aparecen las dos posiciones, como la vista Keyword, cada una lleva la fuente en su propio nombre.
- **Nunca en la misma gráfica**, y nunca en columnas contiguas de una misma tabla.
- **Nunca se calcula la diferencia entre ellas** ni se presentan como comparables.
- Donde aparecen las dos, como en la vista Keyword, van en bloques separados, cada uno con su ayuda.

---

## 11. Componentes

El tablero usa **BoardUI, solo componentes gratuitos**, con su apariencia por defecto. Reglas en `CLAUDE.md`.

| Elemento | Componente |
|---|---|
| Navegación lateral | Sidebar; en pantallas chicas, una barra superior propia con las vistas (ver sección 2) |
| Migas de pan | Breadcrumb (pendiente: no se usa todavía) |
| Selector de fechas y atajos | Date Range Picker (con los atajos en su columna izquierda) |
| Indicadores | franja propia con minigráficas (Recharts); ícono de ayuda de Stat Cards |
| Tablas | Data Table |
| Rol, estado, cambio | Chip, Badge |
| Detalle de una búsqueda | Drawer |
| Guía de lectura | apartado propio en la navegación (Sidebar) |
| Textos de ayuda | Tooltip |
| Filtros e interruptores | Select y Segmented Control; Switch para el interruptor de Descubrimiento (pendiente) |
| Estados de carga | Skeleton |

**Se construyen con Recharts o con SVG propio, y con los tokens de BoardUI**, porque las equivalentes de BoardUI son de pago (tabla actualizada el 16 de noviembre de 2026: todavía listaba la franja "antes y ahora" y la cuadrícula de citación en IA, que las secciones 5.1 y 5.2 sustituyeron el 9 de noviembre):

| Gráfica | Dónde |
|---|---|
| Minigráficas de impresiones, clics, CTR y posición | resumen |
| Gráfica principal de fila: impresiones y clics (dos curvas con área degradada) o sesiones y conversiones (barras redondeadas y línea con puntos); dos ejes, lector arriba, agrupación por día, semana o mes | resumen; Cluster y Página (pendientes) |
| Embudo de tres pasos | resumen |
| Minigráficas de En top 100, En top 10 y En top 3 | Estrategia por cluster |
| Distribución de posiciones (barras apiladas por día, semana o mes) | Estrategia por cluster; Cluster (pendiente) |
| Franja de bandas de cada cluster | Estrategia por cluster |
| Tendencia de citación en IA (dos líneas, por día, semana o mes) | Estrategia por cluster |
| Tendencia de posición por búsqueda | Estrategia por cluster |
| Posición rastreada diaria (eje invertido, cortes y marcas) | Keyword |

---

## 12. Puntos por confirmar con NUTEC

Ninguno bloquea el inicio del desarrollo: se pueden construir las vistas y conectar los datos cuando se confirmen.

**Qué eventos son conversiones.** El tablero cuenta como conversión lo que NUTEC tenga marcado como evento clave en GA4. Hay que revisar esa lista: si incluye eventos de poco valor, como ver una página, la tasa de conversión se infla y deja de significar algo. Lo ideal es que solo estén las acciones comerciales: formularios de contacto o cotización, clics en teléfono o correo, descargas de fichas técnicas.

**País por defecto en Search Console.** El tablero muestra todos los países, como Search Console al abrirlo. Si NUTEC prefiere ver solo Estados Unidos por defecto, es un cambio de configuración, no de diseño.
