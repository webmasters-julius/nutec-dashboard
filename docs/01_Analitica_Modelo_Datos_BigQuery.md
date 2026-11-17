# Modelo de datos en BigQuery — guía para el equipo de analítica

**Última actualización: 16 de noviembre de 2026**
**Para:** el equipo de analítica de Julius.
**Antes de leer este documento**, lee `00_LEEME_Dashboard_SEO_NUTEC.md`. Ahí está el contexto del proyecto, el principio que lo guía y el glosario de términos.

Este documento explica cómo entran los datos a BigQuery, cómo se organizan, cómo se calcula cada métrica y cómo se traslada el histórico que hoy vive en Supabase. Va de lo general a lo particular: primero la visión de conjunto, después cada fuente, después las tablas, después las fórmulas, y al final los procedimientos concretos.

**Este documento es la fuente de verdad para las definiciones de métricas.** El archivo `CLAUDE.md`, que usa el equipo de desarrollo, contiene un resumen de las mismas reglas. Si alguna vez los dos dicen cosas distintas, manda este documento, y hay que corregir el otro.

---

## 1. Visión general del modelo

### Qué tiene que lograr

El dashboard tiene que mostrar las mismas cifras que el cliente ve en Search Console y en Google Analytics 4. Por eso, el modelo no reconstruye ni reinterpreta datos de Google: los recibe ya procesados y los organiza para que la aplicación pueda consultarlos.

Para cada fuente se eligió la vía de entrada con una sola regla: **si Google ya entrega el dato con su procesamiento aplicado, se toma así; si no, se pide por API, que sí lo entrega procesado.**

| Fuente | Vía de entrada | Estado |
|---|---|---|
| Search Console | conector **Fivetran**, que lee la API de Search Console | en operación |
| Google Analytics 4 | conector **Fivetran**, que sincroniza los informes de GA4 por día (decisión del 6 de noviembre de 2026; antes: Data API consultada por n8n) | [por confirmar con analítica] |
| SEMrush | API de **Position Tracking**, consultada por **n8n** | por construir |

### Dónde vive cada cosa

Los datos pasan por varios datasets de BigQuery. Cada uno tiene un propósito distinto, y es importante respetar quién escribe y quién lee en cada uno.

| Dataset | Qué contiene | Quién escribe | Quién lee |
|---|---|---|---|
| `nutec_google_search_console` | las tablas que crea Fivetran con los datos de Search Console | solo Fivetran | staging |
| [por confirmar con analítica] | las tablas que crea Fivetran con los informes diarios de GA4 | solo Fivetran | staging |
| `nutec_raw` | las respuestas de la API de SEMrush tal como llegan desde n8n | solo n8n | staging |
| `nutec_staging` | los datos de todas las fuentes ya filtrados, con nombres de columna consistentes y URLs normalizadas | analítica | marts |
| `nutec_marts` | las tablas preparadas para el dashboard | analítica; excepción: el flujo de SEMrush en n8n escribe `fact_rank_daily` y mantiene `dim_keyword` (ver `02_Integracion_SEMrush_n8n.md`, secciones 6 y 9) | **solo la aplicación** |

Tres reglas que se desprenden de esta organización:

**Los datasets de Fivetran no se modifican a mano.** Fivetran los administra y puede reescribir sus tablas en cualquier sincronización. Cualquier filtro o transformación se hace en staging, leyendo de ahí.

**La aplicación solo lee de `nutec_marts`.** Nunca consulta staging, raw ni los datasets de Fivetran. Esto mantiene predecible el costo de BigQuery y permite cambiar cómo llegan los datos sin tocar la aplicación.

**Staging absorbe los cambios de las fuentes.** Si Google o SEMrush cambian el nombre de un campo, se ajusta staging y la aplicación no se entera.

Una recomendación práctica: staging puede empezar como **vistas** sobre las tablas de origen, y marts como vistas sobre staging. Si el costo o la velocidad de consulta lo piden más adelante, las tablas de marts se materializan. Empezar con vistas reduce el trabajo inicial y facilita corregir errores.

---

## 2. Cómo entra cada fuente

### 2.1 Search Console — conector Fivetran (en operación)

El equipo ya conectó Search Console a BigQuery con **Fivetran**. Es importante entender que esto **no es la exportación nativa de Search Console**: Fivetran consulta la API de Search Console y escribe los resultados. Las dos vías entregan datos ya procesados por Google —impresiones, clics, CTR y posición calculados igual que en la interfaz—, así que el principio del proyecto se cumple. Pero tienen esquemas y comportamientos distintos, y las fórmulas de este documento están escritas para Fivetran.

**Datos de referencia:**
- Dataset: `nutec_google_search_console`
- Propiedad: `sc-domain:nutec.com` (propiedad de dominio, que incluye todas las variantes del sitio)
- Primer día con datos: 1 de enero de 2026
- Zona horaria de la columna `date`: hora del Pacífico, como en toda la información de Search Console

**Qué tablas se usan y para qué.** Fivetran crea trece tablas. El dashboard necesita cuatro:

| Tabla de Fivetran | Qué contiene | Para qué se usa |
|---|---|---|
| `site_report_by_site` | totales del sitio por día, país y dispositivo | totales del sitio |
| `page_report` | totales por página | nivel página |
| `keyword_site_report_by_site` | totales por búsqueda, a nivel sitio | nivel keyword y cálculo de búsquedas ocultas |
| `keyword_page_report` | totales por búsqueda y página | qué búsquedas atraen tráfico a cada página |

**Tablas que no se usan, y por qué:**
- `site_report_by_page` y `keyword_site_report_by_page` **no incluyen la columna de página** cuando la propiedad es de dominio, como la de NUTEC. Parecen útiles para el nivel página por su nombre, pero no lo son. Los datos por página están en `page_report` y `keyword_page_report`.
- Las seis tablas `hourly_*` tienen datos por hora. El dashboard trabaja por día y por mes, así que solo agregarían volumen y costo.
- `sitemap` describe los mapas del sitio enviados a Google; no contiene métricas de rendimiento.

**Filtrar siempre por tipo de búsqueda.** Las tablas incluyen una columna `search_type` con valores como `web`, `image`, `video` y `news`. La interfaz de Search Console muestra por defecto solo búsqueda web. Para reflejarla, **staging debe filtrar `search_type = 'web'`**. Si no se filtra, las cifras incluirán búsquedas de imágenes y video y serán más altas que las que ve el cliente.

**Los totales entre tablas no van a coincidir, y eso es correcto.** La suma de impresiones de `page_report` no es igual al total de `site_report_by_site`. No es un error del conector: Search Console cuenta de forma distinta cuando agrupa por sitio que cuando agrupa por página, y además omite algunos datos por privacidad. La regla es: **los totales del sitio salen siempre de `site_report_by_site`, y las tablas por página o por búsqueda se usan solo para el desglose.** Nunca se suman tablas de distintas familias entre sí.

**Fivetran no incluye las búsquedas anonimizadas.** Search Console oculta las búsquedas que hicieron muy pocas personas, para proteger su privacidad. La exportación nativa de Search Console las incluye marcadas; **Fivetran simplemente no las sincroniza**. Por eso, la suma de todas las búsquedas siempre será menor que el total del sitio. Esa diferencia se calcula y se muestra en el dashboard como un renglón explícito llamado "No desglosado por privacidad" (la fórmula está en la sección 5).

**Las correcciones de Google ya están resueltas.** Search Console sigue ajustando las cifras de los días recientes durante dos o tres días después. Fivetran resuelve esto solo: todos los días vuelve a sincronizar los últimos siete días y reemplaza lo que haya cambiado. **No hace falta construir ningún proceso de reprocesamiento para esta fuente.**

### 2.2 Google Analytics 4 — conector Fivetran ([estado por confirmar con analítica])

**Cambio de vía de entrada (decisión del 6 de noviembre de 2026, registrada aquí el 16 de noviembre de 2026).** GA4 entra por el conector de Fivetran, que sincroniza los informes de GA4 por día. Ya no se consulta la Data API desde n8n: el flujo diario de GA4 en n8n no se construye.

**Datos de referencia:**
- Dataset: [por confirmar con analítica]
- Estado del conector: [por confirmar con analítica]
- Primer día con datos: 1 de enero de 2026

**Por qué no la exportación nativa.** GA4 puede exportar directamente a BigQuery, pero lo que exporta son eventos individuales sin procesar. Para obtener sesiones, engagement o canal de llegada habría que reconstruirlos a partir de esos eventos, y el resultado no coincidiría con la interfaz de GA4, porque la interfaz aplica procesamientos que la exportación no trae (umbrales de privacidad y la forma de agrupar sesiones). Los informes que sincroniza el conector traen las métricas ya calculadas por GA4; que coincidan con la interfaz se valida en el paso 8 de la sección 8.

Si la exportación nativa de eventos ya está activada, se puede dejar corriendo como reserva para análisis futuros, pero **no alimenta ninguna tabla de este modelo**.

**Qué informes debe sincronizar el conector.** Dos, por día:

| Informe | Dimensiones | Métricas |
|---|---|---|
| Tráfico por página de entrada | `date`, `landingPage`, `sessionDefaultChannelGroup` | `sessions`, `engagedSessions`, `keyEvents`, `sessionKeyEventRate`, `userEngagementDuration` |
| Conversiones por evento | `date`, `landingPage`, `sessionDefaultChannelGroup`, `eventName` | `keyEvents` |

**Por qué página de entrada (`landingPage`) y no página vista (`pagePath`).** Con `pagePath`, una visita que recorre tres páginas se cuenta en las tres, y la suma por página supera el total del sitio. Con `landingPage`, cada sesión se asigna a la página por la que entró: las páginas suman al total, y la cifra conecta con Search Console, porque el clic en Google aterriza justo en esa página.

**Sesiones con conversión.** GA4 no entrega directamente cuántas sesiones tuvieron al menos una conversión; entrega la tasa (`sessionKeyEventRate`). Se guarda la cantidad, calculada por fila como `ROUND(sessionKeyEventRate × sessions)`, para poder sumarla después. Al sumar varias filas puede haber una diferencia de redondeo de una o dos sesiones contra la interfaz; es esperable y no requiere corrección.

Conviene mantener pocas dimensiones por informe. Cuando un informe combina demasiadas, GA4 puede aplicar muestreo o eliminar filas por umbrales de privacidad, y entonces las cifras dejan de coincidir con la interfaz por la forma del informe, no por error de nadie.

**Usuarios no se cargan ni se muestran (decisión del 6 de noviembre de 2026).** Las sesiones y los eventos se pueden sumar: las sesiones de un mes son la suma de las sesiones de cada día. **Los usuarios no.** Una persona que visitó el sitio tres días distintos cuenta como un usuario en cada día, pero como un solo usuario en el mes. Como el conector entrega informes diarios, la cifra de usuarios de un rango solo se podría obtener sumando días, y esa suma no coincidiría con GA4. Por eso el dashboard no tiene tarjeta de usuarios y la tabla `fact_ga4_usuarios_periodo`, que traía los usuarios por atajo de fecha desde n8n, ya no forma parte del modelo. **Nunca se muestra una suma de usuarios diarios con el nombre de "usuarios".**

**Correcciones de Google.** GA4 también ajusta las cifras de los días recientes durante uno a tres días. Hay que confirmar que el conector vuelve a sincronizar esos días y reemplaza lo que haya cambiado, como hace el de Search Console ([por confirmar con analítica]). Si solo se agregan filas nuevas, las cifras coinciden con la interfaz las primeras semanas y después empiezan a separarse sin que nadie pueda decir desde cuándo.

**Zona horaria.** Hay que confirmar en qué zona horaria está configurada la propiedad de GA4. Si es distinta a la del Pacífico, los días de GA4 y de Search Console no van a cerrar a la misma hora, y los totales diarios entre las dos fuentes se desplazarán ligeramente. No es un error de cálculo, pero conviene documentarlo para que nadie lo investigue como si lo fuera.

### 2.3 SEMrush — API de Position Tracking vía n8n (por construir)

SEMrush revisa todos los días en qué posición aparece NUTEC en Google para 65 búsquedas, en tres clusters, desde Estados Unidos y en escritorio. No tiene exportación directa a BigQuery, así que se consulta su API desde n8n. Campaña: `29227350_4592163`. Primer día con datos: 4 de agosto de 2026.

**La referencia completa de este flujo está en `02_Integracion_SEMrush_n8n.md`**: el endpoint, cómo leer la respuesta, cómo convertirla en filas, el costo y las comprobaciones. Aquí solo se resumen las cuatro reglas que afectan al modelo de datos:

**Cada ejecución hace dos consultas.** La primera, con un filtro que excluye el resumen de IA de Google, entrega la posición orgánica. La segunda, sin ese filtro, entrega si NUTEC fue citada en IA. Solo los días cubiertos por las dos se marcan con `aio_verificado = true`. Como el flujo siempre hace las dos, todo lo que cargue queda verificado.

**Los días anteriores al alta de cada búsqueda no se escriben.** SEMrush los devuelve con el mismo valor que usa para "no apareció en Google", pero significan "todavía no se medía". Escribirlos infla la cobertura sin ninguna señal visible.

**Las búsquedas y sus roles vienen de etiquetas en SEMrush**, y el flujo mantiene `dim_keyword` actualizada a partir de ellas. Los roles se corrigen en SEMrush, nunca a mano en BigQuery.

**SEMrush no corrige posiciones de días pasados**, así que no hace falta reprocesar días ya cargados. Basta con que cada ejecución cubra los días desde la anterior, con un día de traslape.

---

## 3. Normalización de URLs

Para unir las tres fuentes hay que comparar páginas, y cada fuente escribe las URLs de forma distinta. Search Console entrega la dirección completa (`https://www.nutec.com/products-engineering/blankets`). GA4 entrega solo la ruta (`/products-engineering/blankets`). SEMrush entrega la dirección completa, a veces con una diagonal final. Sin un formato común, la misma página aparece como tres páginas distintas y las uniones fallan sin avisar.

**La llave para unir fuentes es la ruta normalizada (`path`).** Se obtiene aplicando estas reglas en este orden:

1. Quitar el protocolo y el dominio (`https://www.nutec.com`).
2. Convertir todo a minúsculas.
3. Quitar el fragmento (todo lo que va después de `#`).
4. Quitar los parámetros (todo lo que va después de `?`). En GA4, usar la dimensión `landingPage`, que ya viene sin parámetros.
5. Quitar la diagonal final, excepto en la página de inicio, que queda como `/`.

```sql
CREATE OR REPLACE FUNCTION nutec_staging.norm_path(u STRING) AS (
  COALESCE(
    NULLIF(
      REGEXP_REPLACE(
        LOWER(REGEXP_EXTRACT(u, r'^(?:https?://)?[^/?#]*([^?#]*)')),
        r'/$', ''),
      ''),
    '/')
);
```

Esta función no decodifica caracteres especiales escritos con `%`. Las URLs actuales de NUTEC no los usan, pero el sitio tiene páginas en español bajo `/es/`, y si alguna llega a llevar acentos en la dirección habrá que agregar ese paso.

La URL completa se guarda también, para mostrarla y para enlazar, pero **nunca se usa para unir tablas**.

---

## 4. Tablas de marts

Esta sección describe las tablas que consulta la aplicación. Todas las tablas de hechos se **particionan por `fecha`** y se agrupan (`CLUSTER BY`) por la columna que más se usa para filtrar. Toda consulta de la aplicación debe filtrar por fecha; si no, BigQuery recorre la tabla completa y el costo crece sin necesidad.

### Dimensiones

**`dim_cluster`** — un renglón por cluster.

| Columna | Descripción |
|---|---|
| `cluster_id` | identificador; se conserva el mismo que tenía en Supabase |
| `numero` | orden de presentación (1 HOME, 2 Categoría Blankets, 3 MaxWool 2300) |
| `nombre` | nombre visible |
| `familia` | familia de producto que agrupa varios clusters (por ejemplo "Blankets"), **o vacío**; el dashboard agrupa bajo ese nombre los clusters que la comparten (añadida el 9 de noviembre de 2026; existía en Supabase) |
| `etiqueta_semrush` | etiqueta de cluster en SEMrush |
| `url_objetivo` | página del sitio que la estrategia asigna a este cluster |
| `path_objetivo` | la misma, normalizada |

`url_objetivo` **se captura a mano**; no existe en ninguna fuente. Permite detectar cuándo una búsqueda del cluster está apareciendo en Google con una página distinta a la planeada, que en NUTEC pasa con frecuencia: varios artículos del blog compiten con las páginas de producto.

**`dim_keyword`** — un renglón por búsqueda rastreada.

| Columna | Descripción |
|---|---|
| `keyword_id` | identificador de la búsqueda en SEMrush (campo `Pi` de su API), **guardado como texto** porque algunos tienen 20 dígitos |
| `cluster_id` | cluster al que pertenece |
| `keyword` | la búsqueda, en inglés |
| `rol` | `primaria`, `secundaria` o `variante` |
| `volumen` | búsquedas mensuales estimadas por SEMrush |

Debe haber **exactamente una búsqueda primaria por cluster**.

**`dim_pagina`** — un renglón por página.

| Columna | Descripción |
|---|---|
| `path` | ruta normalizada; llave para unir fuentes |
| `url_completa` | dirección completa, para mostrar |
| `tipo` | `home`, `categoria`, `producto`, `blog` u `otro` |
| `cluster_id` | cluster al que pertenece, **o vacío** |

`cluster_id` puede quedar vacío a propósito. Hay páginas con tráfico que no pertenecen a ningún cluster, y artículos del blog que aparecen para búsquedas de varios clusters a la vez. **No se debe forzar una asignación** para que todo cuadre; el dashboard muestra esas páginas en un grupo visible de "sin cluster".

### Hechos de SEMrush

**`fact_rank_daily`** — un renglón por búsqueda, por día medido.

| Columna | Descripción |
|---|---|
| `fecha` | día de la medición (partición) |
| `keyword_id` | búsqueda (agrupación) |
| `dispositivo` | hoy siempre `desktop` |
| `posicion` | posición orgánica, o vacío |
| `url_rankeada` | la página de NUTEC que apareció ese día |
| `path_rankeado` | la misma, normalizada |
| `serp_tiene_aio` | si la página de resultados mostró resumen de IA |
| `citado_en_aio` | si NUTEC fue citada en el resumen de IA, o vacío |
| `aio_verificado` | si ese día se hizo la consulta de citación en IA |
| `fuente` | origen del dato |

Llave única: `fecha`, `keyword_id` y `dispositivo`.

**La aplicación consulta esta tabla con `dispositivo = 'desktop'`** (desde el 16 de noviembre de 2026). Motivo: si algún día se carga otro dispositivo, las filas no se mezclan ni se cuentan dos veces por búsqueda y día.

**Tres significados que no se pueden confundir:**

| Situación | Cómo se representa |
|---|---|
| Ese día no se midió la búsqueda | **no existe la fila** |
| Se midió y NUTEC no apareció entre los primeros 100 resultados | la fila existe con `posicion` vacía |
| Se midió y NUTEC apareció | la fila existe con `posicion` entre 1 y 100 |

**Citación en IA:** `citado_en_aio` queda **vacío** cuando no se verificó, `false` cuando se verificó y no hubo cita, y `true` cuando sí la hubo. Con este diseño, cualquier conteo o porcentaje ignora automáticamente los días sin verificar, sin que quien escribe la consulta tenga que acordarse de filtrarlos.

### Hechos de Search Console

Una tabla por cada tabla de Fivetran que se usa, todas ya filtradas a `search_type = 'web'`.

| Tabla de marts | Origen en Fivetran | Columnas |
|---|---|---|
| `fact_gsc_sitio_dia` | `site_report_by_site` | `fecha`, `pais`, `dispositivo`, `impresiones`, `clics`, `posicion_gsc` |
| `fact_gsc_pagina_dia` | `page_report` | las anteriores más `path` y `url_completa` |
| `fact_gsc_query_dia` | `keyword_site_report_by_site` | las de sitio más `query` |
| `fact_gsc_query_pagina_dia` | `keyword_page_report` | las de sitio más `query`, `path` y `url_completa` |

La columna de posición se llama `posicion_gsc`, no `posicion`, para que nadie la confunda con la posición de SEMrush (ver sección 5).

### Hechos de GA4

| Tabla | Columnas |
|---|---|
| `fact_ga4_pagina_dia` | `fecha`, `path` (página de entrada), `canal`, `sesiones`, `sesiones_con_engagement`, `conversiones`, `sesiones_con_conversion`, `segundos_interaccion` |
| `fact_ga4_conversion_dia` | `fecha`, `path` (página de entrada), `canal`, `nombre_evento`, `conversiones` |

**`segundos_interaccion`** (añadida el 6 de noviembre de 2026 para la tabla de rendimiento por página): `userEngagementDuration` del mismo informe de tráfico por página de entrada. Hay que incluirla en el informe del conector de Fivetran y en la tabla.

**`canal`**: el valor de `sessionDefaultChannelGroup` tal como lo entrega GA4. La aplicación filtra `canal = 'Organic Search'` (`lib/datos/tipos.ts`, `CANAL_ORGANICO`).

**`fact_ga4_usuarios_periodo` se eliminó del modelo el 16 de noviembre de 2026**: el dashboard no muestra usuarios (ver sección 2.2) y la aplicación no consulta esa tabla.

Los eventos van en formato largo —un renglón por evento— y no como columnas. Así, cuando NUTEC configure un evento nuevo, aparece solo, sin cambiar la estructura de la tabla.

**Solo se guardan cantidades que se pueden sumar, nunca porcentajes.** La tasa de engagement de un mes no es el promedio de las tasas diarias; se calcula a partir de las sesiones y las sesiones con engagement del mes. Por eso la tabla guarda esas dos cantidades y no la tasa.

---

## 5. Definiciones de métricas

La regla general: **cada métrica se calcula de la misma forma en que la calcula la herramienta de origen.** Cuando hay que agrupar —por cluster, por mes, por página— se suman las cantidades base y se recalcula el porcentaje o el promedio sobre el grupo. Nunca se promedian porcentajes ni promedios ya calculados.

### Search Console

| Métrica | Cálculo |
|---|---|
| Impresiones | `SUM(impresiones)` |
| Clics | `SUM(clics)` |
| CTR | `SUM(clics) / SUM(impresiones)` |
| Posición de Search Console | `SUM(posicion_gsc * impresiones) / SUM(impresiones)` |
| No desglosado por privacidad | impresiones de `fact_gsc_sitio_dia` menos la suma de impresiones de `fact_gsc_query_dia`, para el mismo filtro de fechas, país y dispositivo; igual para clics |

Sobre el **CTR**: promediar los CTR de varias páginas da un número que parece razonable y es incorrecto, porque trata igual a una página con diez impresiones y a una con diez mil. Search Console lo recalcula sobre el grupo, y nosotros también.

Sobre la **posición de Search Console**: Fivetran la entrega como un promedio por fila. Para agruparla hay que ponderar por impresiones. Se muestra siempre rotulada con su fuente (ver "Dos posiciones" más abajo).

### Google Analytics 4

| Métrica | Cálculo | Nota |
|---|---|---|
| Sesiones | `SUM(sesiones)` | |
| Conversiones | `SUM(conversiones)` | eventos clave; una sesión puede tener varias |
| Tasa de conversión | `SUM(sesiones_con_conversion) / SUM(sesiones)` | porcentaje de sesiones con al menos una conversión |
| Tasa de engagement | `SUM(sesiones_con_engagement) / SUM(sesiones)` | |
| Tasa de rebote | `1 - tasa de engagement` | no es el rebote de la versión anterior de Google Analytics |
| Tiempo de interacción promedio por sesión | `SUM(segundos_interaccion) / SUM(sesiones)` | `segundos_interaccion` es `userEngagementDuration` de GA4; es la métrica del informe de páginas de destino. Se recalcula sobre el grupo, nunca se promedia |


**Usuarios** no es una métrica del dashboard (decisión del 6 de noviembre de 2026; ver sección 2.2).

**Embudo orgánico.** Tres pasos en la misma unidad, cada uno parte del anterior: `SUM(sesiones)`, `SUM(sesiones_con_engagement)` y `SUM(sesiones_con_conversion)`. Usuarios no es un paso del embudo porque no es un subconjunto de las sesiones.

### SEMrush

| Métrica | Cálculo |
|---|---|
| Posición típica de una búsqueda | mediana de `posicion` en los días del rango en que apareció |
| Cobertura de una búsqueda | días con `posicion` no vacía, sobre días medidos (filas existentes) |
| Posición típica de un cluster o página | mediana de las posiciones típicas de sus búsquedas visibles, **siempre acompañada del número de búsquedas visibles** |
| Citación en IA | días con `citado_en_aio = true`, sobre días con `aio_verificado = true` |
| Cambio entre periodos | se calcula solo sobre búsquedas visibles en ambos periodos, y se informa cuántas fueron |

En la interfaz, "búsqueda visible" se dice **"en top 100"** y la cobertura se escribe "18 de 22" (nombres del 9 y 16 de noviembre de 2026; ver `03_Especificacion_Vistas.md`, sección 5.1).

**Por qué mediana.** Si una búsqueda estuvo en las posiciones 7, 7, 9, 9, 10, 45 y 45 durante una semana, el promedio es 18.9 y la mediana es 9. Los dos días en 45 son atípicos; la mediana describe mejor dónde está la búsqueda la mayor parte del tiempo.

**Por qué la posición de un cluster va siempre con el número de búsquedas visibles.** Un cluster con posición típica 6.4 pero solo 5 de sus 29 búsquedas visibles está peor que uno con posición 13.0 y 16 de 21 visibles. Sin el conteo, el primero parece mejor.

**Por qué los cambios se calculan sobre búsquedas presentes en ambos periodos.** Si una búsqueda que antes no aparecía entra en la posición 80, al incluirla el promedio del periodo empeora, aunque en realidad se ganó visibilidad. Comparando solo las búsquedas presentes en los dos periodos, el cambio refleja lo que de verdad se movió.

**Posición de una página.** Una página no tiene posición propia: la hereda de las búsquedas rastreadas con las que aparece. Se atribuye usando la página que apareció **cada día** (`path_rankeado`), no la página objetivo del cluster. Una misma búsqueda puede contribuir a dos páginas distintas dentro de un mismo rango, porque Google a veces alterna entre una página de producto y un artículo del blog. Eso es correcto, y además deja ver cuándo dos páginas de NUTEC compiten entre sí.

### Dos posiciones

El tablero muestra dos posiciones distintas, y las dos son correctas:

**Posición promedio · Search Console** (`posicion_gsc`): el promedio, ponderado por impresiones, de la posición en que apareció NUTEC en todas las búsquedas reales. Aparece en el resumen orgánico, en la vista Página, en la vista Keyword y en Descubrimiento. Tiene una trampa que su texto de ayuda debe explicar: empeora cuando NUTEC empieza a aparecer en búsquedas nuevas en lugares bajos, aunque eso sea una ganancia de visibilidad.

**Posición rastreada · SEMrush**: para cada una de las 65 búsquedas elegidas, revisadas una vez al día desde una sola ubicación, la mediana de su posición en los días del periodo en que apareció. Aparece en la estrategia por cluster, en la vista Cluster y en la vista Keyword.

Casi nunca coinciden, porque miden cosas distintas. Por eso **siempre se rotulan con su fuente, nunca aparecen en la misma gráfica y nunca se comparan entre sí**. Las reglas completas de convivencia están en `03_Especificacion_Vistas.md`.

La cobertura de la posición rastreada es la lista de búsquedas elegidas, no toda la demanda. Hoy son 65. La interfaz dice "búsquedas rastreadas".

---

## 6. Ventanas de datos

| Fuente | Primer día con datos |
|---|---|
| Search Console | 1 de enero de 2026 |
| Google Analytics 4 | 1 de enero de 2026 |
| SEMrush | 4 de agosto de 2026 |

**Regla:** cuando un rango de fechas incluye días anteriores al primer dato de una fuente, las métricas de esa fuente **no existen** en ese tramo. No se cuentan como cero, no se promedian como si fueran días sin actividad y no se dibujan como línea plana.

Ejemplo: si alguien pide de enero a octubre, Search Console y GA4 responden los diez meses, pero la posición solo existe desde el 4 de agosto. Si se calculara la posición típica de enero a octubre dividiendo entre todos los días del rango, el resultado no sería un dato incompleto: sería un dato **incorrecto con apariencia de correcto**.

**Comparaciones contra el año anterior:** disponibles desde enero de 2027 para Search Console y GA4, y desde agosto de 2027 para posición.

Enero a julio de 2026 es la línea base: cómo estaba NUTEC en búsqueda y visitas antes de que empezara el seguimiento de posiciones.

---

## 7. El histórico de posiciones: de Supabase a BigQuery

### Qué hay en Supabase

Hasta ahora las posiciones se guardaban en un proyecto de Supabase (`kdkbggralursupkrfkcl`, "Julius SEO Tracking", plan gratuito). Contiene:

- **1,660 filas** de posiciones diarias, del 4 de agosto al 22 de septiembre de 2026.
- La definición de los tres clusters y las 65 búsquedas.
- Seis funciones SQL con la lógica de reportes y alertas (ver Anexo B).

Supabase se da de baja como parte de este proyecto. Por ser plan gratuito, el proyecto **se pausa solo** después de un tiempo sin uso; se puede restaurar desde el panel de Supabase, pero hay que hacerlo antes de leerlo.

**Supabase no es la única copia de las posiciones.** Las posiciones se cargaron originalmente pidiéndole a SEMrush rangos de fechas hacia atrás, y SEMrush conserva el histórico de la campaña mientras la campaña exista. Lo que sí vive **solo** en Supabase son algunos datos capturados a mano —en particular la página objetivo de cada cluster— y la lógica de las funciones.

### Dos caminos

| | A. Migrar desde Supabase | B. Recargar desde SEMrush con n8n |
|---|---|---|
| Qué se hace | exportar CSV, cargar y transformar | el flujo de n8n carga desde el 4 de agosto |
| Esfuerzo | medio; exportar, cargar y transformar | bajo; es una ejecución del flujo normal con un rango largo |
| Costo | ninguno | **13,000 unidades de SEMrush, una sola vez** |
| Citación en IA | queda verificada solo en parte (ver tabla de abajo) | queda verificada **todos los días** |
| Historia recuperada | desde septiembre para la mayoría de las búsquedas | desde el día en que cada búsqueda se agregó a la campaña, en algunos casos desde agosto |
| Comprobación | cifras esperadas conocidas | se compara contra la interfaz de SEMrush |

**Recomendación: camino B.** SEMrush cobra 100 unidades por búsqueda devuelta sin importar cuántos días abarque la consulta, así que recargar todo el histórico cuesta lo mismo que una ejecución normal del flujo. A cambio deja la citación en IA verificada en todo el histórico y recupera días que nunca se cargaron en Supabase. El procedimiento está en la sección 10 de `02_Integracion_SEMrush_n8n.md`.

El camino A queda documentado abajo como alternativa, por si el saldo de unidades no lo permite.

**En cualquiera de los dos caminos hay que exportar de Supabase:**
- La tabla `clusters`, porque contiene la página objetivo de cada cluster, capturada a mano.
- Las definiciones de las seis funciones del Anexo B. También existen en el archivo `references/funciones.sql` de la skill `seo-reportes-posiciones`, que funciona como respaldo.

### Procedimiento del camino A

**Paso 1 — Exportar.** Desde el editor de tablas de Supabase, exportar a CSV las cuatro tablas completas: `clients`, `clusters`, `keywords` y `rank_snapshots`.

**Paso 2 — Cargar sin transformar.** Cargar los CSV en `nutec_staging` como `sb_clients`, `sb_clusters`, `sb_keywords` y `sb_rank_snapshots`, con `bq load` o desde la consola. **Conservar los identificadores originales de los clusters.** Las búsquedas, en cambio, usan en BigQuery el identificador de SEMrush (`Pi`), así que el paso 4 traduce el identificador de Supabase al de SEMrush usando el texto de la búsqueda. Para eso, `dim_keyword` debe estar cargada antes del paso 4; la carga el flujo de n8n en su primera ejecución.

**Paso 3 — Completar la información de citación en IA.** Este paso no es opcional. En Supabase, la columna `cited_in_ai_overview` no admite valores vacíos y por defecto vale `false`. Eso significa que en el CSV **un día en que no se revisó la citación y un día en que se revisó y no hubo cita aparecen igual: `false`**. La información de qué días se revisaron no está en la base de datos; está en esta tabla:

| Cluster | `number` | Días en que sí se revisó la citación en IA |
|---|---|---|
| HOME | 1 | 1 al 22 de septiembre de 2026 |
| Categoría Blankets | 2 | 1 al 7 de septiembre de 2026 |
| MaxWool 2300 | 3 | 1 al 7 de septiembre de 2026 |

En agosto no se revisó la citación en IA ningún día.

**Paso 4 — Transformar y cargar a marts.**

```sql
INSERT INTO nutec_marts.fact_rank_daily (
  fecha, keyword_id, dispositivo, posicion, url_rankeada, path_rankeado,
  serp_tiene_aio, citado_en_aio, aio_verificado, fuente
)
SELECT
  fecha,
  keyword_id,
  dispositivo,
  posicion,
  url_rankeada,
  nutec_staging.norm_path(url_rankeada),
  serp_tiene_aio,
  IF(aio_verificado, citado_crudo, NULL),
  aio_verificado,
  fuente
FROM (
  SELECT
    s.captured_on              AS fecha,
    d.keyword_id,
    s.device                   AS dispositivo,
    s.position                 AS posicion,
    s.url                      AS url_rankeada,
    s.serp_has_ai_overview     AS serp_tiene_aio,
    s.cited_in_ai_overview     AS citado_crudo,
    s.source                   AS fuente,
    s.captured_on BETWEEN DATE '2026-09-01'
      AND IF(c.number = 1, DATE '2026-09-22', DATE '2026-09-07') AS aio_verificado
  FROM nutec_staging.sb_rank_snapshots s
  JOIN nutec_staging.sb_keywords k ON k.id = s.keyword_id
  JOIN nutec_marts.dim_keyword    d ON d.keyword = k.keyword
  JOIN nutec_staging.sb_clusters c ON c.id = k.cluster_id
);
```

**Paso 5 — Comprobar antes de dar por buena la carga.**

```sql
SELECT
  COUNT(*)                                            AS filas,
  COUNT(DISTINCT keyword_id)                          AS keywords,
  MIN(fecha)                                          AS desde,
  MAX(fecha)                                          AS hasta,
  COUNTIF(citado_en_aio)                              AS dias_citados,
  COUNT(DISTINCT IF(citado_en_aio, keyword_id, NULL)) AS kws_citadas,
  COUNTIF(aio_verificado)                             AS filas_verificadas
FROM nutec_marts.fact_rank_daily;
```

| Resultado | Valor esperado |
|---|---|
| `filas` | 1660 |
| `keywords` | 65 |
| `desde` | 2026-08-04 |
| `hasta` | 2026-09-22 |
| `dias_citados` | 92 |
| `kws_citadas` | 11 |
| `filas_verificadas` | 680 |

Estos valores se verificaron contra Supabase el 23 de septiembre de 2026. **Antes de migrar, conviene repetir la misma consulta directamente en Supabase** para confirmar que nada cambió desde entonces.

Además, debe haber exactamente una búsqueda primaria por cluster:

```sql
SELECT cluster_id, COUNTIF(role = 'primaria') AS primarias
FROM nutec_staging.sb_keywords
GROUP BY cluster_id;
```

Si algún valor no coincide, **no hay que dar de baja Supabase** hasta entender la diferencia, porque es el único momento en que todavía se puede comparar contra el origen.

---

## 8. Orden de trabajo

| Paso | Tarea | Estado |
|---|---|---|
| 1 | Conectar Search Console a BigQuery | **hecho** (Fivetran) |
| 2 | Crear los datasets `nutec_raw`, `nutec_staging` y `nutec_marts`, y la función `norm_path` | por hacer |
| 3 | Crear las vistas de staging y marts para Search Console, con filtro `search_type = 'web'` | por hacer |
| 4 | Exportar de Supabase la tabla `clusters` y las definiciones de funciones | por hacer |
| 5 | Construir el flujo de SEMrush en n8n (Roberto; ver `02_Integracion_SEMrush_n8n.md`) | por hacer |
| 6 | Recargar el histórico de posiciones con ese flujo (camino B de la sección 7) | por hacer |
| 7 | Configurar el conector de Fivetran para GA4 (informes por página de entrada y por evento) y crear sus vistas de staging y marts | [por confirmar con analítica] |
| 8 | Validar las cifras de marts contra las interfaces de Search Console, GA4 y SEMrush | por hacer |
| 9 | Dar de baja Supabase | al final |

Los pasos 3, 5 y 7 se pueden trabajar en paralelo. El paso 6 requiere que antes estén listos el 4 y el 5. El paso 9 va al final por una razón: mientras Supabase exista, cualquier duda sobre el histórico se puede resolver comparando contra el origen.

---

## Anexo A. Esquema de Supabase (referencia)

Esquema verificado el 16 de octubre de 2026. Sirve como referencia para el camino A; no es el diseño destino.

**`clients`**: `id` (bigint), `slug` (text), `name` (text), `domain` (text), `semrush_project_id` (text), `semrush_campaign_id` (text), `is_active` (bool), `created_at` (timestamptz).

**`clusters`**: `id` (bigint), `client_id` (bigint), `number` (int), `name` (text), `semrush_tag` (text), `familia` (text), `url_objetivo` (text), `created_at` (timestamptz).

**`keywords`**: `id` (bigint), `client_id` (bigint), `cluster_id` (bigint), `keyword` (text), `role` (text, por defecto `secundaria`), `search_volume` (int), `parent_id` (bigint), `is_active` (bool), `created_at` (timestamptz). Hay un índice que impide más de una búsqueda primaria por cluster.

**`rank_snapshots`**: `id` (bigint), `keyword_id` (bigint), `client_id` (bigint), `captured_on` (date), `device` (text, por defecto `desktop`), `position` (int, admite vacío), `url` (text), `source` (text), `serp_has_ai_overview` (bool, admite vacío), `cited_in_ai_overview` (bool, **no admite vacío, por defecto `false`**), `created_at` (timestamptz). Llave única: `keyword_id`, `captured_on`, `device`.

---

## Anexo B. Estado y alertas: reglas vigentes y lógica histórica de Supabase

Supabase tiene seis funciones que calculan el estado de cada búsqueda y las alertas. **Sirven solo como referencia histórica**: desde el 16 de noviembre de 2026 las reglas vigentes de estado y de alertas son las tablas de este anexo, que la aplicación calcula en `lib/posiciones.ts`; ya no se traslada la lógica de `estado_keywords` ni de `alertas`. Todas reciben un rango de fechas y comparan contra el periodo inmediato anterior del mismo largo.

| Función | Qué calcula |
|---|---|
| `reporte_keywords` | detalle por búsqueda: días medidos, cobertura, mediana, cambio, citación en IA, páginas |
| `estado_keywords` | un estado por búsqueda: Bien, Atender o Vigilar |
| `alertas` | eventos puntuales que requieren atención |
| `reporte_clusters` | resumen por cluster con el conteo de estados |
| `evolucion_clusters` | evolución mensual por cluster, con cambios sobre búsquedas presentes en ambos meses |
| `evolucion_keywords` | evolución mensual por búsqueda |

**Estado y alerta son conceptos distintos.** El **estado** describe la situación de una búsqueda y **toda búsqueda tiene uno siempre**. Se asigna con la posición del periodo, su cambio contra el periodo anterior y si la búsqueda es prioritaria (ver las reglas más abajo). La **alerta** es un evento: algo que cambió y merece revisión. Una búsqueda puede tener cero alertas o varias.

Esta separación existe por una razón práctica: si el estado se calcula con condiciones sueltas en lugar de una sola regla que cubra todos los casos, es fácil que algunas posiciones no caigan en ninguna condición y queden sin clasificar sin que nadie lo note. Al trasladar la lógica, el estado debe salir de una sola expresión `CASE` con un caso final por defecto.

Las alertas son siete: **CAÍDA**, **URL AJENA**, **URL INESTABLE**, **IA SIN CAPTURA**, **INTERMITENTE**, **MEJORA** y **DATO INSUFICIENTE**. Cuándo se dispara cada una y con qué prioridad está en la tabla "Reglas de las alertas" de este anexo; los umbrales de la función `alertas` de Supabase ya no aplican (corregido el 16 de noviembre de 2026: este párrafo todavía remitía a esa función).

**Reglas del estado (redefinidas el 16 de noviembre de 2026).** El estado ya no sigue la función `estado_keywords` de Supabase. Con aquella regla, "Bien" era solo el top 3 y una búsqueda en la posición 4 quedaba en "Atender": sobre los datos de ejemplo salían 25 de 65 búsquedas en Atender y solo 7 en Bien, y el tablero se leía como una lista de pendientes. La regla nueva reserva "Atender" para lo que de verdad pide una acción. La aplicación la calcula en `lib/posiciones.ts` (`estadoDe`); si analítica calcula el estado en BigQuery, debe usar esta misma tabla.

Definiciones previas:

- **Posición:** la mediana del periodo. Si la búsqueda apareció en menos de la mitad de los días medidos, su posición no es confiable y se trata como "no aparece". **Esta regla se aplica igual al periodo actual y al periodo anterior, y las alertas usan esa misma posición** (16 de noviembre de 2026; antes solo se aplicaba al periodo actual y las alertas usaban la mediana sin este filtro). Motivo: estado y alertas deben leer la misma posición. Consecuencia: una búsqueda intermitente no genera Caída, Mejora ni Oportunidad en IA; solo Intermitente.
- **Cortes de página:** la primera página es una posición de **10 o menos**; la segunda, mayor de 10 y de **20 o menos**; "21 o más" es cualquier posición mayor de 20. Una mediana con medio punto cae del lado de arriba: 10.5 cuenta como segunda página y 20.5 como "21 o más" (16 de noviembre de 2026). En las tablas de abajo, "de 1 a 10", "de 11 a 20" y "de 21 o más" se leen con estos cortes.
- **Prioritaria:** la primaria del cluster, o una secundaria con volumen de 100 o más. Las variantes nunca son prioritarias: son otras formas de escribir la misma búsqueda y mejoran al trabajar las demás.
- **Cayó / mejoró:** perdió o ganó 5 lugares o más contra el periodo anterior (los mismos umbrales de las alertas CAÍDA y MEJORA). También cuenta como mejora que antes no apareciera y ahora sí. Si no hay periodo de comparación, no se evalúa.

| Estado | Regla, en este orden | Motivo que muestra la interfaz |
|---|---|---|
| Vigilar | sin días medidos | No se midió en este periodo. |
| Vigilar | posición de 1 a 10 y cayó | Sigue en la primera página de Google, pero bajó 5 lugares o más. |
| Bien | posición de 1 a 10 | Está en la primera página de Google. |
| Atender | posición de 11 a 20, prioritaria y cayó | Búsqueda prioritaria en la segunda página de Google y bajando. |
| Vigilar | posición de 11 a 20 | Está en la segunda página de Google, cerca de la primera. |
| Vigilar | posición de 21 o más, prioritaria y mejoró | Búsqueda prioritaria todavía lejos de la primera página, pero mejorando. |
| Atender | posición de 21 o más y prioritaria | Búsqueda prioritaria lejos de la primera página de Google. |
| Vigilar | posición de 21 o más | Está lejos de la primera página de Google; no es prioritaria. |
| Atender | aparece menos de la mitad de los días y es prioritaria | Búsqueda prioritaria que aparece en Google menos de la mitad de los días. |
| Vigilar | aparece menos de la mitad de los días | Aparece en Google menos de la mitad de los días; no es prioritaria. |
| Atender | no aparece y es prioritaria | Búsqueda prioritaria que no aparece en Google. |
| Vigilar | cualquier otro caso (no aparece y no es prioritaria) | Todavía no aparece en Google; no es prioritaria. |

Efecto sobre los datos de ejemplo (últimos 28 días): de 7 Bien, 33 Vigilar y 25 Atender se pasa a 14 Bien, 44 Vigilar y 7 Atender.

**Reglas de las alertas (redefinidas el 16 de noviembre de 2026).** Tampoco siguen ya la función `alertas` de Supabase. Con aquellas reglas, "Qué revisar" mostraba unas 40 alertas sobre los datos de ejemplo, 17 de ellas en "Urgente" solo porque la búsqueda aparecía con otra página; una búsqueda podía estar "Bien" y tener al lado una alerta "Urgente"; y bajar de la posición 37 a la 42 era "Urgente". Criterio nuevo: la prioridad dice cuánto importa, con las mismas definiciones de posición, prioritaria y cambio que usa el estado. La aplicación las calcula en `lib/posiciones.ts` (`alertasDe`).

| Alerta (nombre en la interfaz) | Cuándo | Prioridad |
|---|---|---|
| CAÍDA (Caída) | antes aparecía y ahora no aparece ningún día | Urgente si es prioritaria y estaba en la primera página; Atender si es prioritaria o estaba en la primera página; Vigilar si estaba en la segunda página; sin alerta en otro caso |
| CAÍDA (Caída) | perdió 5 lugares o más | Urgente si es prioritaria y salió de la primera página; Atender si salió de la primera página; Vigilar si sigue en la primera página; Atender si es prioritaria; Vigilar si estaba en la segunda página; sin alerta en otro caso |
| URL AJENA (Otra página) | la página con la que más aparece no es la página objetivo del cluster | Atender si es prioritaria y no está en la primera página; Vigilar en otro caso. Nunca Urgente: es un hallazgo, no un cambio |
| URL INESTABLE (Cambia de página) | una segunda página aparece al menos 2 días y al menos 20% de los días en que apareció | Vigilar |
| IA SIN CAPTURA (Oportunidad en IA) | Google mostró resumen de IA en 80% o más de los días verificados, sin ninguna cita, y la mediana está en la primera página | Vigilar |
| INTERMITENTE (Intermitente) | apareció menos de la mitad de los días medidos | Atender si es prioritaria; Vigilar en otro caso |
| MEJORA (Mejora) | antes no aparecía y ahora sí; o ganó 5 lugares o más y es prioritaria o queda dentro de las dos primeras páginas | Bien |
| DATO INSUFICIENTE (Pocos datos) | se midió menos de la mitad de los días del periodo | Vigilar |

Cambios respecto a Supabase: la caída incluye "dejó de aparecer" (antes no generaba alerta); la alternancia de páginas ya no se dispara por un día suelto; la intermitencia baja de "menos de 85% de los días" a "menos de la mitad"; "pocos datos" se mide contra el largo del periodo y no contra un número fijo de días (en un periodo de 3 días, las 65 búsquedas tenían alerta); y la mejora pasa de "Vigilar" a "Bien".

Efecto sobre los datos de ejemplo (últimos 28 días): de unas 40 alertas con 17 o más en Urgente, a 28: ninguna Urgente, 5 Atender y 23 Vigilar. Ninguna búsqueda en "Bien" tiene una alerta Urgente o Atender.

Vocabulario para el cliente: los estados se comunican como **Urgente, Atender, Vigilar y Bien**, y los cambios con los símbolos ▲ ▼ =. Nunca se usan códigos internos como P1 o P2. Las búsquedas solo reciben tres estados (Bien, Vigilar y Atender); "Urgente" existe solo como prioridad de una alerta.
