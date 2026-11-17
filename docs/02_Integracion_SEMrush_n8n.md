# Integración de SEMrush a BigQuery con n8n

**Última actualización: 16 de noviembre de 2026** (precisiones de nombres de columna y de vocabulario; el flujo y la API no cambian desde el 28 de octubre de 2026)
**Para:** Roberto, responsable de construir el flujo.
**Antes de leer este documento**, lee `00_LEEME_Dashboard_SEO_NUTEC.md` para el contexto general y el glosario. Este documento se complementa con `01_Analitica_Modelo_Datos_BigQuery.md`, que describe las tablas destino.

Este documento es la referencia completa del flujo de SEMrush. Va de lo general a lo particular: primero qué hace el flujo y qué necesitas, después el endpoint, cómo leer su respuesta, cómo convertirla en filas, cuánto cuesta y, al final, cómo comprobar que funciona.

Todo lo que dice este documento sobre la API está verificado de dos formas: contra la documentación oficial de SEMrush (`developer.semrush.com/api/projects/position-tracking`) y con consultas reales a la campaña de NUTEC hechas el 27 de octubre de 2026. Los ejemplos de respuesta son reales, no inventados.

---

## 1. Qué hace este flujo

SEMrush revisa todos los días en qué posición aparece NUTEC en Google para 65 búsquedas elegidas por la estrategia de SEO. También registra si Google citó a NUTEC dentro de su resumen generado con inteligencia artificial (AI Overview).

El flujo que vas a construir lleva esa información a BigQuery, donde la consulta el dashboard. Funciona así:

```
SEMrush API ──→ n8n ──→ BigQuery (nutec_raw) ──→ MERGE ──→ BigQuery (nutec_marts.fact_rank_daily)
```

En cada ejecución, el flujo:

1. Pide a SEMrush las posiciones de las 65 búsquedas para un rango de días.
2. Pide lo mismo una segunda vez, con otro parámetro, para saber si NUTEC fue citada en IA.
3. Combina las dos respuestas en una fila por búsqueda y por día.
4. Escribe esas filas en BigQuery sin duplicar las que ya existían.

Además, en una sola ocasión, el mismo flujo sirve para **recargar todo el histórico** desde que empezó la campaña (sección 10).

---

## 2. Lo que necesitas antes de empezar

**Una API key de SEMrush.** Se obtiene en la cuenta de SEMrush, en *Subscription info → API units*. Pídela a Dilan si no tienes acceso a esa sección.

**Saldo de unidades de API.** Cada consulta consume unidades de la cuenta. La sección 7 explica cuánto cuesta este flujo; confirma con Dilan que el saldo alcanza para la frecuencia que se elija.

**Acceso a BigQuery** con permiso para escribir en `nutec_raw` y ejecutar consultas `MERGE` sobre `nutec_marts`. Lo gestiona el equipo de analítica.

**Los identificadores de la campaña:**

| Dato | Valor |
|---|---|
| Proyecto SEMrush | NUTEC ENG, `29227350` |
| ID de campaña (Position Tracking) | `29227350_4592163` |
| Dominio rastreado | `www.nutec.com` |
| Máscara de URL que se usa en las consultas | `*.nutec.com/*` |
| Ubicación y dispositivo | Estados Unidos, escritorio |

**Cómo guardar la API key en n8n.** Crea una credencial de tipo *Query Auth* con el nombre de parámetro `key` y úsala en el nodo HTTP Request. **No escribas la key directamente en la URL del nodo**: quedaría visible en el flujo y en el historial de ejecuciones.

---

## 3. El endpoint

Todo el flujo usa **un solo endpoint**: el reporte de posiciones orgánicas de Position Tracking.

```
GET https://api.semrush.com/reports/v1/projects/29227350_4592163/tracking/
```

| Parámetro | Valor | Para qué sirve |
|---|---|---|
| `key` | la API key (desde la credencial) | autenticación |
| `action` | `report` | fijo |
| `type` | `tracking_position_organic` | el tipo de reporte |
| `url` | `*.nutec.com%2F*` | máscara del dominio; la diagonal va codificada como `%2F` |
| `date_begin` | fecha inicial en formato **`AAAAMMDD`** | por ejemplo `20261020` |
| `date_end` | fecha final en formato **`AAAAMMDD`** | por ejemplo `20261027` |
| `display_limit` | `100` | **obligatorio ponerlo**: si se omite, SEMrush devuelve solo 10 búsquedas |
| `display_offset` | `0` | para paginar (sección 8) |
| `linktype_filter` | `537395202` en la primera consulta; **sin este parámetro** en la segunda | ver sección 4 |

Ejemplo de la primera consulta, completa:

```
https://api.semrush.com/reports/v1/projects/29227350_4592163/tracking/?action=report&type=tracking_position_organic&url=*.nutec.com%2F*&date_begin=20261020&date_end=20261027&display_limit=100&display_offset=0&linktype_filter=537395202&key=TU_API_KEY
```

Dos detalles que fallan sin avisar:

**El formato de fecha es `AAAAMMDD`, sin guiones.** Así lo especifica la documentación oficial y así vienen las fechas en la respuesta.

**`display_limit` tiene un valor por defecto de 10.** Si no lo pones, recibes 10 búsquedas de 65 y la respuesta no da ningún error: simplemente faltan datos.

**Un endpoint opcional.** Si quieres saber cuál es el último día que SEMrush ya rastreó antes de pedir datos, existe el reporte `type=tracking_campaign_dates`, en la misma URL base. Cuesta 100 unidades por consulta. No es necesario si el flujo siempre pide hasta el día anterior a la ejecución.

---

## 4. Por qué cada ejecución hace dos consultas

Google muestra a veces, arriba de los resultados, un resumen generado con IA. Cuando ese resumen cita a NUTEC, SEMrush lo cuenta como si fuera una posición más. Eso contamina la posición orgánica: una búsqueda donde NUTEC está en el lugar 15 de los resultados normales puede aparecer en posición 1 solo porque el resumen de IA la mencionó.

Por eso se hacen dos consultas idénticas, que solo difieren en un parámetro:

**Consulta 1, con `linktype_filter=537395202`.** Ese valor excluye el resumen de IA, el paquete de mapas locales y los hoteles. De esta consulta se toma **la posición orgánica** y **la página de NUTEC que apareció**.

**Consulta 2, sin `linktype_filter`.** De esta consulta se toma **una sola cosa: si NUTEC fue citada en el resumen de IA** ese día. Su posición no se usa, porque es justamente la posición contaminada.

Las dos consultas se combinan por búsqueda y por día. Si alguna de las dos falla para un día, ese día no se escribe completo (sección 9).

---

## 5. Cómo leer la respuesta

La respuesta es JSON. Esta es una respuesta real de la campaña de NUTEC, recortada a una búsqueda y dos días, sin los campos que no se usan:

```json
{
  "total": 65,
  "limit": 2,
  "offset": 0,
  "data": {
    "0": {
      "Pi": "5013306885752054828",
      "Ph": "ceramic blanket",
      "Kb": "20260819",
      "Tg": { "0": "cluster maxwool 2300", "1": "variante" },
      "Nq": "260",
      "Dt": {
        "20261025": { "*.nutec.com/*": "-" },
        "20261026": { "*.nutec.com/*": "-" }
      },
      "Lu": {
        "20261025": { "*.nutec.com/*": "" },
        "20261026": { "*.nutec.com/*": "" }
      },
      "Sf": {
        "20261025": ["org", "rel", "img", "vid", "stl", "adb", "res", "aio"],
        "20261026": ["org", "rel", "img", "vid", "stl", "res", "aio"]
      },
      "Lt": {
        "20261025": { "*.nutec.com/*": [] },
        "20261026": { "*.nutec.com/*": [] }
      }
    }
  }
}
```

SEMrush usa códigos de dos letras para los campos. Estos son los que importan:

| Campo | Significado | Formato |
|---|---|---|
| `total` | cuántas búsquedas tiene la campaña en total | número; sirve para paginar |
| `data` | las búsquedas, como objeto con llaves `"0"`, `"1"`, … | **no es un arreglo**; hay que iterar sus valores |
| `Pi` | identificador único de la búsqueda en SEMrush | texto. **Guárdalo como texto**: algunos identificadores tienen 20 dígitos y no caben en un entero |
| `Ph` | la búsqueda | texto, en inglés |
| `Kb` | fecha en que la búsqueda se agregó a la campaña | `AAAAMMDD`; puede venir como texto o número |
| `Tg` | etiquetas de la búsqueda | objeto con llaves `"0"`, `"1"`, … (sección 6) |
| `Nq` | búsquedas mensuales estimadas | texto con un número |
| `Dt` | posición de NUTEC, por día | `{ fecha: { máscara: posición } }`. Posición es un número del 1 al 100, o `"-"` |
| `Lu` | página de NUTEC que apareció, por día | `{ fecha: { máscara: url } }`. Texto vacío si no apareció |
| `Sf` | elementos que tenía la página de resultados de Google, por día | `{ fecha: [códigos] }`. `"aio"` = había resumen de IA |
| `Lt` | en qué tipo de resultado apareció NUTEC, por día | `{ fecha: { máscara: [códigos] } }`. Contiene `"aio"` si NUTEC fue citada en el resumen de IA |

Para leer los campos `Dt`, `Lu` y `Lt` siempre se usa la llave de la máscara, **`*.nutec.com/*`**, exactamente igual a como se envió en el parámetro `url` pero sin codificar.

**Campos que se ignoran:** `In`, `Cp`, `Gs`, `Be`, `Fi`, `Diff`, `Diff1`, `Diff7`, `Diff30`, `Vi`, `Sov`, `Tr`, `Tc` y `Sfc`. Son métricas derivadas de SEMrush (visibilidad, tráfico estimado, cambios precalculados) que el proyecto no usa. El tráfico estimado de SEMrush en particular se excluye a propósito, porque no coincide con el tráfico real que mide GA4.

---

## 6. Cómo convertir la respuesta en filas

Cada combinación de búsqueda y día produce **una fila**. Esta tabla indica de dónde sale cada columna:

| Columna en BigQuery | Origen | Regla |
|---|---|---|
| `fecha` | llave de `Dt` | convertir `AAAAMMDD` a fecha |
| `semrush_pi` | `Pi` | como texto. Es el nombre en la tabla de aterrizaje (`nutec_raw.semrush_posiciones`); en `nutec_marts.fact_rank_daily` y en `dim_keyword` la misma columna se llama **`keyword_id`** (ver `01_Analitica_Modelo_Datos_BigQuery.md`, sección 4), y es la que lee la aplicación (precisado el 16 de noviembre de 2026) |
| `keyword` | `Ph` | |
| `posicion` | consulta 1, `Dt[fecha]["*.nutec.com/*"]` | si es `"-"`, **vacío (NULL)**; si es número, ese número |
| `url_rankeada` | consulta 1, `Lu[fecha]["*.nutec.com/*"]` | si es texto vacío, NULL |
| `serp_tiene_aio` | consulta 1, `Sf[fecha]` | `true` si la lista contiene `"aio"` |
| `citado_en_aio` | consulta 2, `Lt[fecha]["*.nutec.com/*"]` | `true` si la lista contiene `"aio"`; `false` si no |
| `aio_verificado` | | `true` si la consulta 2 se hizo para ese día |
| `dispositivo` | | fijo: `desktop` |
| `fuente` | | fijo: `semrush_position_tracking` |

### La regla más importante: los días anteriores a `Kb`

Cuando pides un rango de fechas, SEMrush devuelve **todos los días del rango para todas las búsquedas**, incluso los días anteriores a que la búsqueda se agregara a la campaña. En esos días, la posición viene como `"-"`, igual que cuando NUTEC no apareció en Google.

Son dos situaciones completamente distintas que se ven idénticas en la respuesta:

| Situación | Cómo viene en `Dt` | Qué hacer |
|---|---|---|
| El día es anterior a `Kb`: la búsqueda todavía no se rastreaba | `"-"` | **no escribir ninguna fila** |
| El día es igual o posterior a `Kb` y NUTEC no apareció entre los primeros 100 | `"-"` | escribir la fila con `posicion` vacía |

**La única forma de distinguirlas es comparar la fecha contra `Kb`.** Si se escriben filas para los días anteriores, las cifras de cobertura del dashboard quedan infladas con días que nunca se midieron, y no hay ninguna señal visible del error. Una comprobación adicional: en los días anteriores a `Kb`, el campo `Sf` de esa fecha suele venir vacío o nulo.

### Las etiquetas: cluster y rol

Cada búsqueda tiene dos etiquetas en `Tg`:

- Una que empieza con `cluster ` e indica su cluster: `cluster home`, `cluster category blankets` o `cluster maxwool 2300`.
- Otra que indica su rol: `primaria`, `secundaria` o `variante`.

**No asumas que la etiqueta de cluster está en `"0"` y la de rol en `"1"`.** Identifícalas por su contenido. Con ellas el flujo mantiene actualizada la tabla `dim_keyword`: si aparece una búsqueda nueva o cambia un rol en SEMrush, se refleja en la siguiente ejecución. El cluster se resuelve buscando la etiqueta en la columna `etiqueta_semrush` de `dim_cluster`. Si una búsqueda trae una etiqueta de cluster que no existe en `dim_cluster`, el flujo debe avisar en lugar de inventar un cluster.

Los roles se corrigen siempre en SEMrush, nunca a mano en BigQuery.

---

## 7. Cuánto cuesta y con qué frecuencia correrlo

**SEMrush cobra 100 unidades por cada búsqueda que devuelve el reporte, sin importar cuántos días abarque la consulta.** Pedir un día o una semana cuesta exactamente lo mismo. Lo confirma la documentación oficial y lo comprobamos con consultas reales:

| Consulta de prueba | Unidades consumidas |
|---|---|
| 1 búsqueda, 1 día | 100 |
| 1 búsqueda, 7 días | 100 |
| 2 búsquedas, 2 días | 200 |

Con 65 búsquedas y dos consultas por ejecución, **cada ejecución cuesta 13,000 unidades**, sin importar el rango de días que cubra. Eso hace que la frecuencia sea la variable que decide el costo:

| Frecuencia | Rango que pide cada ejecución | Unidades al mes (aprox.) |
|---|---|---|
| Diaria | el día anterior | 390,000 |
| Dos veces por semana | los últimos 4 días | 112,000 |
| Semanal | los últimos 8 días | 56,000 |

Los datos que llegan al dashboard son diarios en todos los casos; lo que cambia es con cuánto retraso aparecen. Con frecuencia semanal, el dashboard puede tener hasta siete días de atraso en las posiciones.

**La frecuencia es una decisión de Dilan**, porque depende del saldo de unidades y de cuán actualizado necesita estar el dashboard. Mientras se decide, la recomendación es **semanal**, los lunes, pidiendo los últimos 8 días: el día extra de traslape cubre cualquier día que SEMrush haya procesado tarde, y como la escritura no duplica filas (sección 9), repetir un día no causa problemas.

Si el número de búsquedas rastreadas crece, el costo crece en proporción: cada búsqueda nueva suma 200 unidades por ejecución.

---

## 8. Paginación

Con `display_limit=100`, las 65 búsquedas actuales caben en una sola página. Aun así, el flujo debe paginar, para no romperse cuando se agreguen búsquedas:

1. Primera llamada con `display_offset=0`.
2. Leer `total` de la respuesta.
3. Mientras `display_offset + 100 < total`, sumar 100 a `display_offset` y repetir.

Cada página cobra solo las búsquedas que devuelve, así que paginar no aumenta el costo.

---

## 9. Escribir en BigQuery sin duplicar

Las dos reglas que tiene que cumplir la escritura:

**Se puede ejecutar dos veces sin duplicar.** Si el flujo falla a la mitad y se vuelve a correr, o si dos ejecuciones cubren el mismo día, el resultado en BigQuery debe ser idéntico. Para eso, cada fila se identifica por la combinación de **`fecha`, búsqueda (`keyword_id`) y `dispositivo`**, y se escribe con `MERGE`: si la combinación ya existe, se actualiza; si no, se inserta.

**Un día se escribe completo o no se escribe.** Si la consulta 1 funcionó pero la consulta 2 falló, no hay que escribir esos días con `aio_verificado = false` como si fuera normal: hay que marcar la ejecución como fallida y reintentar. Si hace falta escribir parcialmente, `aio_verificado` debe quedar en `false` y `citado_en_aio` vacío, nunca `false`.

El patrón recomendado en n8n:

1. Los nodos HTTP Request hacen las dos consultas.
2. Un nodo Code combina las respuestas y produce una lista de filas, aplicando la regla de `Kb`.
3. Un nodo de BigQuery inserta esas filas en una tabla de aterrizaje, `nutec_raw.semrush_posiciones`, agregando una columna con el identificador de la ejecución y la fecha y hora de carga.
4. Un segundo nodo de BigQuery ejecuta el `MERGE` desde la tabla de aterrizaje hacia `nutec_marts.fact_rank_daily`, solo con las filas de esa ejecución.

Este flujo es el único que escribe en `nutec_marts` sin pasar por staging: `fact_rank_daily` y `dim_keyword`. `01_Analitica_Modelo_Datos_BigQuery.md` (sección 1) lo registra como la excepción a la regla de que marts lo escribe analítica (precisado el 16 de noviembre de 2026, porque los dos documentos no decían lo mismo).

La tabla de aterrizaje conserva lo que llegó de SEMrush en cada ejecución. Si algún día hay que investigar una cifra rara, ahí está el dato original.

**Reintentos.** Si SEMrush responde con un error de servidor (código 5xx) o de límite de solicitudes (429), reintentar hasta tres veces con espera creciente. Si responde con un error de autenticación o de parámetros (4xx distinto de 429), no reintentar: avisar, porque reintentar no lo va a arreglar y sí puede consumir unidades.

**Avisos.** Conviene que el flujo avise cuando una ejecución falle y cuando el número de búsquedas devueltas cambie respecto de la ejecución anterior. Un cambio en el conteo suele significar que alguien agregó o quitó búsquedas en SEMrush, y vale la pena saberlo.

---

## 10. Recarga del histórico (una sola vez)

La campaña tiene datos desde el **4 de agosto de 2026**. Como el costo no depende del número de días, recargar todo el histórico cuesta lo mismo que una ejecución normal: **13,000 unidades**, pidiendo del 4 de agosto hasta ayer en las dos consultas.

Esta recarga tiene dos ventajas sobre migrar el histórico desde Supabase:

**La citación en IA queda verificada todos los días.** En Supabase solo se verificó en algunos periodos de septiembre. Con la recarga, `aio_verificado` queda en `true` para todo el histórico.

**Se recupera más historia.** Varias búsquedas se agregaron a la campaña en agosto (por ejemplo, las del cluster MaxWool 2300 tienen `Kb = 20260819`), pero en Supabase solo se cargaron desde septiembre. La recarga trae todos los días desde el `Kb` de cada búsqueda.

**Lo que sigue saliendo de Supabase** son los datos que no existen en SEMrush: la tabla de clusters con la página objetivo de cada uno. Eso lo resuelve el equipo de analítica como parte de la migración, y es requisito previo para que el flujo pueda resolver el cluster de cada búsqueda.

**Tamaño de la respuesta.** Una consulta con 65 búsquedas y unos 90 días es una respuesta JSON grande, pero manejable para n8n. Si el nodo Code se vuelve lento, se puede dividir el rango en tramos mensuales; ten en cuenta que **cada tramo cobra de nuevo** las 13,000 unidades.

---

## 11. Cómo comprobar que funciona

Antes de programar el flujo, conviene validarlo con estas comprobaciones.

**Contra la interfaz de SEMrush.** Elige tres búsquedas —una con buena posición, una que no aparece en Google y una citada en IA— y un día concreto. Compara lo que quedó en BigQuery contra lo que muestra Position Tracking en la interfaz de SEMrush para ese día. Deben coincidir la posición, la página y la citación.

**Conteo de filas.** Para un rango de fechas, el número de filas debe ser igual a la suma, para cada búsqueda, de los días del rango a partir de su `Kb`. Si hay más filas, se están escribiendo días anteriores a `Kb`.

**Una primaria por cluster.** En `dim_keyword` debe haber exactamente tres búsquedas con rol `primaria`, una por cluster.

**Citación verificada.** Para todo lo cargado por este flujo, `aio_verificado` debe ser `true` en todas las filas.

**Idempotencia.** Ejecuta el flujo dos veces seguidas con el mismo rango. El número de filas en `fact_rank_daily` no debe cambiar.

---

## 12. Errores comunes

| Error | Síntoma | Causa |
|---|---|---|
| Faltan búsquedas | llegan 10 en lugar de 65 | no se puso `display_limit` |
| Posiciones demasiado buenas | búsquedas en posición 1 que en Google están más abajo | la consulta 1 se hizo sin `linktype_filter=537395202` |
| Cobertura inflada | más filas de las esperadas; búsquedas "visibles" en días en que no se medían | se escribieron días anteriores a `Kb` |
| Error de fecha | SEMrush devuelve error o datos vacíos | fechas con guiones; el formato es `AAAAMMDD` |
| Datos vacíos sin error | la respuesta trae búsquedas pero sin posiciones | la máscara de `url` no coincide; debe ser `*.nutec.com/*` |
| Identificadores corruptos | dos búsquedas distintas con el mismo `Pi` | `Pi` se guardó como número y perdió precisión; debe ser texto |
| Filas duplicadas | el mismo día y búsqueda aparece dos veces | se usó `INSERT` en lugar de `MERGE` |
| La key aparece en el historial | la API key visible en las ejecuciones de n8n | se escribió en la URL en vez de usar una credencial |
