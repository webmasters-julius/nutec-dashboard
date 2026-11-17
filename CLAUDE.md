# Dashboard SEO de NUTEC — instrucciones para Claude Code

**Última actualización: 16 de noviembre de 2026**

Este archivo explica cómo construir la aplicación. Antes de escribir código, lee estos tres documentos del proyecto, en este orden:

1. `docs/00_LEEME_Dashboard_SEO_NUTEC.md` — qué es el proyecto, quién es quién, arquitectura y **glosario**. Si un término de este archivo no te resulta claro, está definido ahí.
2. `docs/01_Analitica_Modelo_Datos_BigQuery.md` — las tablas de BigQuery que consulta la aplicación y la definición exacta de cada métrica.
3. `docs/03_Especificacion_Vistas.md` — **qué muestra cada pantalla**: indicadores, gráficas, tablas y filtros de cada vista. Es la especificación que implementas.

Este archivo resume las reglas de métricas que afectan la interfaz. **Si algo aquí contradice a `01_Analitica_Modelo_Datos_BigQuery.md`, manda ese documento**, y hay que corregir este.

Estructura esperada del repositorio:

```
/CLAUDE.md
/docs/00_LEEME_Dashboard_SEO_NUTEC.md
/docs/01_Analitica_Modelo_Datos_BigQuery.md
/docs/02_Integracion_SEMrush_n8n.md
/docs/03_Especificacion_Vistas.md
/docs/04_Publicacion_y_Acceso.md
/app ...
```

---

## Qué es la aplicación

Un dashboard web que reúne en un solo lugar el desempeño de NUTEC en Google, a partir de tres fuentes: Google Search Console (cómo aparece NUTEC en los resultados de búsqueda), Google Analytics 4 (qué pasa cuando la gente llega al sitio) y SEMrush (en qué posición aparece NUTEC para 65 búsquedas elegidas por la estrategia de SEO).

La usan personas no técnicas, del lado de la agencia Julius y del lado del cliente. La persona que más la va a consultar también tiene acceso directo a Search Console y a Google Analytics, y va a comparar.

## El principio que decide todo lo demás

> **El dashboard refleja lo que dicen Search Console y GA4. No los reinterpreta.**

Si Search Console dice 1,240 impresiones para un mes, el dashboard dice 1,240. Cuando hay que agrupar datos, se agrupan de la misma forma en que lo hace la herramienta de origen. Cuando hay una diferencia inevitable con lo que el cliente ve en otra herramienta, se explica en la interfaz en lugar de esconderse.

Antes de inventar un cálculo, pregúntate cómo lo calcula la herramienta de origen. Casi siempre ya está resuelto, y la respuesta está en `01_Analitica_Modelo_Datos_BigQuery.md`.

---

## Stack

- **Next.js** con App Router y TypeScript.
- **BoardUI**, solo sus componentes gratuitos, sobre Tailwind v4 y React Aria. Ver la sección "Sistema de diseño".
- **Recharts** para las gráficas.
- **BigQuery** como única fuente de datos, consultado con `@google-cloud/bigquery` y una cuenta de servicio.
- Las consultas a BigQuery se ejecutan **solo en el servidor**. El navegador nunca recibe credenciales ni consulta BigQuery directamente.
- El proyecto de BigQuery y las credenciales van en variables de entorno, nunca en el repositorio.
- **Acceso con Clerk**, solo por invitación. `proxy.ts` protege todas las rutas menos `/ingresar` y `/registro`. Sin las llaves de Clerk la aplicación corre en local sin inicio de sesión y en producción bloquea todo. Ver `docs/04_Publicacion_y_Acceso.md`.

## Sistema de diseño: BoardUI

La interfaz se construye con **BoardUI** (`boardui.com`), un sistema de diseño para dashboards que copia el código de cada componente dentro del proyecto. **Se usa solo la versión gratuita**, publicada bajo licencia MIT. No hay licencia Pro.

**Preparación del proyecto:**

```bash
npx boardui@latest init --yes      # tokens de tema, tipografía, estilos globales y utilidades
npx boardui@latest skill           # instala la skill de BoardUI en .claude/skills/boardui
npx boardui@latest add <nombre> --yes
```

Configura también el servidor MCP de BoardUI (`npx -y boardui@latest mcp`) para consultar el catálogo, el código y los ejemplos de uso de cada componente antes de usarlo. **No reproduzcas componentes de memoria ni a partir de capturas**: instala el real.

**Reglas:**

- **Solo componentes gratuitos.** Los de pago tienen la marca PRO en la documentación. **No los recrees** a partir de sus vistas previas públicas: el que no está en la versión gratuita se construye desde cero.
- **Dirección visual: la de BoardUI por defecto.** Sus colores, su tipografía (Inter), sus radios y sombras. No se personaliza la paleta ni se cambia la tipografía.
- **Usa siempre los tokens semánticos** de BoardUI (texto, fondo, borde, gráficas), nunca colores de la paleta base ni valores fijos. El modo oscuro funciona solo a través de la clase `.dark`, siempre que se respeten los tokens.
- **Las gráficas se construyen con Recharts y los tokens de gráfica de BoardUI.** Las gráficas de BoardUI que se necesitan son de pago. Las dos gratuitas (Revenue Chart Card y Orders Chart Card) sirven de referencia para el marco de la tarjeta, el encabezado y el tooltip, pero **no se usan tal cual**: están construidas para comparar contra el año anterior, y esa comparación no existe en nuestros datos hasta 2027.
- **Revisa los encabezados y textos que traen los componentes.** Cualquier "vs. año anterior", flecha de cambio o cifra de ejemplo que venga en un componente se quita o se conecta a datos reales con las reglas de este archivo.
- **Configura las fechas y números en español de México** (`es-MX`). Los componentes de fecha y número de BoardUI se basan en React Aria, que formatea según la configuración regional.

La tabla de qué componente se usa para cada elemento está en `docs/03_Especificacion_Vistas.md`.

---

## De dónde vienen los datos

La aplicación consulta **únicamente el dataset `nutec_marts`**. Nunca consulta `nutec_staging`, `nutec_raw` ni el dataset de Fivetran (`nutec_google_search_console`). Esas capas existen precisamente para que la aplicación no dependa de cómo llegan los datos.

```
SEMrush API ───→ n8n ──────┐
                           ├─→ nutec_staging ─→ nutec_marts ─→ esta aplicación
Search Console ─┐          │
GA4 ────────────┴─ Fivetran┘
```

Todas las tablas de hechos de `nutec_marts` están particionadas por `fecha`. **Toda consulta debe filtrar por fecha.** Sin ese filtro, BigQuery recorre la tabla completa y el costo crece sin necesidad.

Las fuentes se unen por **`path`**, la ruta de la página ya normalizada. Nunca uses la URL completa para unir tablas: cada fuente la escribe distinto.

---

## Navegación: de lo general a lo particular

La aplicación tiene cuatro niveles. Cada uno permite bajar al siguiente.

```
Sitio  →  Cluster  →  Página  →  Keyword
```

| Nivel | Search Console | GA4 | SEMrush |
|---|---|---|---|
| Sitio | sí | sí | sí |
| Cluster | sí | sí | sí |
| Página | sí | sí | sí |
| Keyword | sí | **no** | sí |

**GA4 no tiene datos a nivel keyword.** GA4 no registra con qué búsqueda llegó cada visita. En ese nivel, la sección de GA4 no se muestra. No inventes ni estimes una atribución de visitas por búsqueda.

**No toda página pertenece a un cluster.** `dim_pagina.cluster_id` puede estar vacío a propósito. Esas páginas se muestran en un grupo visible llamado "Sin cluster", nunca se ocultan.

Además de los cuatro niveles hay una vista de **descubrimiento de búsquedas**: lista búsquedas de Search Console con al menos 100 impresiones y posición promedio de Search Console entre 8 y 15, que suelen ser las oportunidades más rápidas de mejorar. Usa la posición de Search Console como filtro (ver la regla de posición más abajo). **Aún no está construida.**

---

## Reglas para mostrar métricas

Cada una de estas reglas evita un error concreto: una cifra que parece correcta pero no lo es.

**Los porcentajes se recalculan, nunca se promedian.** El CTR de un grupo de páginas es la suma de sus clics entre la suma de sus impresiones, no el promedio de sus CTR. Lo mismo para la tasa de engagement, la tasa de rebote y la tasa de eventos. Si se promedian, una página con diez impresiones pesa lo mismo que una con diez mil, y el resultado parece razonable pero está mal.

**Hay dos posiciones y nunca se mezclan.** "Posición promedio · Search Console" va en el resumen orgánico y en el detalle de páginas y búsquedas. "Posición rastreada · SEMrush" va en la estrategia por cluster. **Siempre con su fuente a la vista (en el nombre o en el encabezado de una sección de una sola fuente), nunca en la misma gráfica, nunca comparadas.** Las reglas completas están en la sección "Las dos posiciones" de `docs/03_Especificacion_Vistas.md`.

**La posición de SEMrush se resume con la mediana.** Si una búsqueda estuvo en 7, 7, 9, 9, 10, 45 y 45 durante una semana, la posición típica es 9, no 18.9. Dos días atípicos no deben mover la cifra.

**La posición nunca aparece sola.** Siempre va acompañada de cuántas búsquedas del grupo están en el top 100. Un cluster en posición 6.4 con 5 de 29 búsquedas en el top 100 está peor que uno en 13.0 con 16 de 21. Sin el conteo, el primero parece mejor.

**La cobertura de posición es la lista rastreada, no toda la demanda.** Son 65 búsquedas elegidas por la estrategia. La interfaz dice "búsquedas rastreadas" y nunca sugiere que representa todo lo que la gente busca en Google.

**Los cambios entre periodos se calculan sobre elementos presentes en ambos periodos**, y la interfaz indica cuántos fueron. Si una búsqueda que no aparecía entra en la posición 80, incluirla haría que el periodo pareciera peor aunque se ganó visibilidad.

**Usuarios de GA4 no se muestra** (decisión del 6 de noviembre de 2026). Las sesiones y las conversiones se pueden sumar entre días; los usuarios no, porque una persona que visitó tres días distintos es un solo usuario en el periodo, y el conector entrega informes por día. **Nunca muestres una suma de usuarios diarios con la etiqueta "usuarios".**

**GA4 se mide por página de entrada.** En toda tabla de páginas, las sesiones y conversiones de GA4 se asignan a la página por la que entró la visita. Así cada sesión cuenta una vez y las páginas suman al total.

**La tasa de conversión es de sesiones, no de eventos.** Es el porcentaje de sesiones con al menos una conversión. No es conversiones entre sesiones: una sesión puede completar varias conversiones, y esa división podría pasar de 100%.

**Los cambios se expresan según el tipo de cifra.** Conteos en porcentaje relativo (▲ 12.4%), tasas en puntos porcentuales (▲ 0.4 pp) y posiciones en lugares (▲ 2.1 lugares). En las posiciones, un número más bajo es mejor: el color y la flecha indican si la situación mejoró, no si el número subió.

**Todo indicador tiene un ícono de ayuda.** Un signo de interrogación junto al nombre que, al pasar el cursor, al enfocarlo con el teclado o al tocarlo en el celular, muestra su texto de ayuda. Los textos están en `docs/03_Especificacion_Vistas.md` y se usan tal cual. Va en todos los indicadores, no solo en algunos: si una tarjeta lo tiene y la de al lado no, parece que la segunda no necesita explicación.

**Las búsquedas ocultas por privacidad se muestran.** Search Console oculta las búsquedas que hicieron muy pocas personas, así que la suma por búsqueda nunca llega al total del sitio. Muestra la diferencia como un renglón explícito: "No desglosado por privacidad".

**"Sin medir" no es cero.** Cuando un dato no se midió en el periodo elegido, la interfaz muestra **s/m** en gris, nunca `0`. El caso más frecuente es la citación en IA: si `aio_verificado` es falso, no se sabe si hubo cita, y un cero afirmaría que no la hubo. Un cero solo aparece cuando el dato se midió y su valor es cero.

**Antes de agregar un indicador, pregúntate qué significa su denominador.** Un indicador como "92 de 680 días verificados" puede ser aritméticamente correcto e inútil: si el 680 mezcla búsquedas que nunca fueron citadas con periodos de distinto largo, el cociente no describe nada. Un indicador que no se puede leer en voz alta sin explicarlo está mal construido. La versión útil de ese mismo dato es "11 de 65 búsquedas citadas en IA".

---

## Ventanas de datos

| Fuente | Primer día con datos |
|---|---|
| Search Console | 1 de enero de 2026 |
| Google Analytics 4 | 1 de enero de 2026 |
| SEMrush | 4 de agosto de 2026 |

Cuando el rango elegido incluye días anteriores al primer dato de una fuente, las métricas de esa fuente **no existen** en ese tramo. No se muestran como cero, no se dibujan como línea plana y no se incluyen en promedios ni medianas. La interfaz lo declara, por ejemplo: "La posición se mide desde el 4 de agosto de 2026".

Esto importa especialmente en rangos largos: si alguien pide de enero a octubre y la aplicación calcula la posición dividiendo entre todos los días del rango, el resultado no es un dato incompleto, es un dato **incorrecto con apariencia de correcto**.

Comparaciones contra el año anterior: disponibles desde enero de 2027 para Search Console y GA4, y desde agosto de 2027 para posición. Antes de esas fechas, la opción no debe ofrecerse.

---

## Estado y alertas

Cada búsqueda rastreada tiene **siempre un estado**, que describe su situación, y puede tener **cero o más alertas**, que señalan cambios que merecen revisión. Son conceptos distintos y se muestran por separado.

El estado debe calcularse con una sola regla que cubra todos los casos, con un caso final por defecto (en TypeScript, un `switch` con `default`). Si se calcula con condiciones sueltas, es fácil que algunas posiciones no caigan en ninguna y queden sin clasificar sin que nadie lo note.

Vocabulario para el cliente: **Urgente, Atender, Vigilar y Bien**. Los cambios se muestran con ▲ ▼ =. Nunca uses códigos internos como P1 o P2.

Las reglas de estado y de alertas están en el Anexo B de `01_Analitica_Modelo_Datos_BigQuery.md` y se calculan en `lib/posiciones.ts`. Se redefinieron el 16 de noviembre de 2026 y ya no siguen las funciones de Supabase: solo "Atender" pide una acción y se reserva para las búsquedas prioritarias (la primaria de cada cluster y las secundarias con 100 o más búsquedas al mes). Las búsquedas reciben tres estados (Bien, Vigilar, Atender); "Urgente" es solo prioridad de alerta. Las cuatro bandas de posición (1 a 3, 4 a 10, 11 a 20 y 21 a 100) están en la sección 5.1 de `docs/03_Especificacion_Vistas.md`.

---

## Convenciones de interfaz

**Idioma.** La interfaz está en español. Las búsquedas y las URLs se muestran en inglés, tal como son, porque el mercado es Estados Unidos. Se traducen los nombres de las métricas, no los de las búsquedas.

**Audiencia no técnica.** Cada métrica debe poder explicarse en una frase, sin jerga. Incluye una guía de lectura que explique cada columna o indicador en lenguaje llano. El tablero anterior la tenía y resultó necesaria. Va en un apartado propio, siempre accesible desde la navegación, y no dentro de la pantalla principal, que se dedica a los datos.

**Roles de búsqueda.** Cada búsqueda tiene un rol: primaria, secundaria o variante. Muéstralo con una jerarquía visual clara (la primaria más destacada, la variante más discreta) y ordena las búsquedas dentro de cada cluster por rol y después por volumen.

**Dirección visual.** La de BoardUI por defecto, sin personalizar. Ver "Sistema de diseño".

---

## Lo que existe hoy

**Construido (16 de noviembre de 2026):** Resumen orgánico, Estrategia por cluster con el panel de cada búsqueda, Guía de lectura y control de acceso con Clerk (sin probar con llaves), todo sobre datos de ejemplo (`NUTEC_DATA_SOURCE=ejemplo`). **Pendiente:** las vistas Cluster, Página (hoy un marcador en `/pagina`) y Descubrimiento.

**Antecedente:** un tablero en HTML con datos fijos que cubre solo SEMrush: tres clusters, 65 búsquedas, gráficos de evolución por búsqueda, filtros por rol y tooltips. Sirve como referencia de qué información resultó útil. **No se reutiliza su código.**

**En BigQuery:** Search Console ya está entrando por Fivetran y GA4 entrará por el mismo camino. SEMrush entra con un flujo de n8n. Las capas `nutec_staging` y `nutec_marts` las está construyendo el equipo de analítica en paralelo. Mientras tanto, se trabaja contra datos de ejemplo con la misma estructura que describe `01_Analitica_Modelo_Datos_BigQuery.md`.

## Orden de construcción sugerido

1. Estructura del proyecto, BoardUI (`init` y skill) y conexión del servidor con BigQuery.
2. **Resumen orgánico** completo: las dos filas de indicadores con su ícono de ayuda, las dos gráficas, la tabla de rendimiento por página y el embudo. Va primero porque es la vista principal y solo depende de Search Console y GA4, cuyos datos ya existen.
3. Estrategia por cluster y vista **Cluster**, con la gráfica de distribución de posiciones.
4. Vista **Página**.
5. Vista **Keyword**, con la gráfica de posición rastreada.
6. Vista **Descubrimiento**.

Mientras `nutec_marts` no esté listo, trabaja con datos de ejemplo que respeten exactamente la estructura de sus tablas, e incluye a propósito los casos difíciles: días sin dato, una búsqueda sin verificar en IA y una página sin datos en una de las fuentes.

---

## Antes de dar por terminada una vista

- ¿Cada cifra se puede explicar en una frase a alguien no técnico?
- ¿Los porcentajes se recalculan sobre el grupo, en lugar de promediarse?
- ¿Los denominadores de porcentajes y tasas están visibles o explicados?
- ¿Se distingue "no hay dato" de "el dato es cero"?
- ¿Cada posición dice su fuente, y las dos nunca aparecen juntas?
- ¿La posición va acompañada del número de búsquedas en el top 100?
- ¿Cada indicador tiene su ícono de ayuda con el texto de la especificación?
- ¿Los cambios usan la unidad que corresponde: %, pp o lugares?
- ¿El rango elegido respeta el primer día de datos de cada fuente?
- ¿Todas las consultas filtran por fecha?
