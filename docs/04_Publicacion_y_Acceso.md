# Publicación y acceso del Dashboard SEO de NUTEC

**Última actualización: 16 de noviembre de 2026**

Qué hace falta para que el dashboard deje de vivir en una computadora y lo puedan abrir el equipo de Julius y dos personas de NUTEC, sin que quede abierto a cualquiera con la liga.

Estado: **el código está preparado; no hay ninguna cuenta creada ni nada publicado.**

---

## Decisiones

| Tema | Decisión | Motivo |
|---|---|---|
| Hospedaje | Vercel, plan Pro | Next.js 16 con su caché funciona sin configuración; ligas de vista previa por cambio |
| Acceso | Clerk, plan gratuito, modo "solo por invitación" | Acceso por persona sin guardar contraseñas ni mantener una base de datos |
| Login propio con base de datos | Descartado | Obliga a cifrar contraseñas, recuperar accesos y mantener una base para unas cuantas personas |
| Protección por contraseña de Vercel | Descartado para el cliente | Es una sola contraseña compartida y cuesta 20 USD al mes por proyecto |

## Costos (precios publicados el 16 de noviembre de 2026, en USD)

| Concepto | Costo mensual |
|---|---|
| Vercel Pro (1 asiento de desarrollador, 20 USD de uso incluido, visores gratis) | 20 |
| Clerk Hobby (hasta 50,000 usuarios activos) | 0 |
| **Total** | **20** |

Alternativa de hospedaje: Render, instancia de 7 USD al mes (512 MB) en el plan Hobby de 0 USD. Más barato, pero la caché vive en la memoria del servidor y se pierde en cada reinicio.

Opcional en Clerk: plan Pro, 25 USD al mes (20 con pago anual), para sesiones de más de 7 días y para quitar la leyenda "Secured by Clerk".

Fuentes: vercel.com/pricing, render.com/pricing, clerk.com/pricing.

## Cómo funciona el acceso en el código

- `proxy.ts` protege **todas** las rutas, menos `/ingresar` y `/registro`, que pasa a Clerk para que muestre sus pantallas.
- **Segunda revisión en cada vista (16 de noviembre de 2026):** además del proxy, cada vista vuelve a revisar la sesión en el servidor antes de consultar datos (`lib/acceso-servidor.ts`). Motivo: que los datos no dependan de una sola barrera.
- **Lista de correos permitidos, opcional (16 de noviembre de 2026):** `NUTEC_CORREOS_PERMITIDOS` acepta correos o dominios separados por coma (por ejemplo `ana@nutec.com, @julius2grow.com`). Si está definida, solo esas personas ven los datos aunque tengan sesión; vacía, entra cualquiera con sesión. Es una segunda barrera del modo "solo por invitación" de Clerk.
- **Con las llaves de Clerk:** quien no tiene sesión va a `/ingresar`. `proxy.ts` exige las dos llaves (pública y secreta); `lib/acceso.ts`, que decide si se montan las pantallas y el botón de Clerk, solo mira la pública. Hay que poner siempre las dos juntas (precisado el 16 de noviembre de 2026).
- **Sin llaves, en local:** la aplicación corre sin inicio de sesión, como hasta ahora.
- **Sin llaves, en producción:** todas las páginas responden "El acceso al dashboard no está configurado" (error 503). Es a propósito: un tablero con datos del cliente no debe quedar abierto por un descuido de configuración.
- `/registro` es la pantalla a la que llega quien abre una invitación.
- La navegación muestra el botón de la persona que entró, con "Cerrar sesión".
- En pantallas chicas, donde no hay menú lateral, ese botón va en la barra superior.
- Las pantallas de ingreso están en español (`es-MX`), igual que las páginas de error y de "no existe" (16 de noviembre de 2026).

Otras protecciones agregadas el 16 de noviembre de 2026:

- **Encabezados de seguridad** en todas las respuestas: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `X-Robots-Tag: noindex` (el tablero no debe aparecer en buscadores ni incrustarse en otro sitio).
- **Tope de costo en BigQuery:** `BQ_MAX_BYTES_BILLED` limita cuántos bytes puede leer una consulta; por defecto, 2 GB. Una consulta que lo exceda falla en lugar de cobrarse.
- **Fuente de datos explícita:** `NUTEC_DATA_SOURCE` solo admite `ejemplo` o `bigquery`; cualquier otro valor da error, en lugar de caer en silencio en los datos de ejemplo.

Probado: sin llaves, en local funciona y en producción bloquea. **No probado: el flujo con llaves** (ingresar, invitación, cerrar sesión), porque todavía no existe la cuenta de Clerk.

## Lo que implica usar Clerk

1. **Una cuenta de Clerk a nombre de Julius.** De ahí salen dos llaves: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`.
2. **Dos instancias:** una de desarrollo (llaves `pk_test_` / `sk_test_`) y una de producción (`pk_live_` / `sk_live_`).
3. **Para producción, un dominio propio** donde se puedan agregar registros DNS, por ejemplo `seo.julius2grow.com`. Clerk lo exige; los registros exactos los da su panel.
4. **Modo "solo por invitación"** (Restricted / Invite-only) activado en su panel. Los usuarios se dan de alta invitando su correo.
5. **Ingreso con Google o Microsoft en producción:** requiere credenciales propias, creadas en Google Cloud o en Microsoft Entra. En desarrollo Clerk presta unas compartidas. Para empezar sin ese paso, se puede usar solo el código que llega por correo.
6. **Límites del plan gratuito:** la sesión dura 7 días fijos, las pantallas llevan la leyenda "Secured by Clerk", y admite hasta 3 proveedores de ingreso.

Dos puntos por confirmar al crear la cuenta:
- Que el modo "solo por invitación" esté disponible en producción con el plan gratuito. La documentación solo marca como de pago la lista de correos permitidos.
- Que el área de sistemas de NUTEC permita entrar con su cuenta de Microsoft a una aplicación externa. Si no, esas personas entran con el código por correo.

## Pasos, en orden

| # | Paso | Quién |
|---|---|---|
| 1 | Confirmar en git todo el trabajo pendiente y subir el repositorio a GitHub como repositorio **privado** (hoy solo existe en una computadora). Debe ser privado porque contiene datos reales del cliente: `lib/datos/ejemplo/semrush-base.json` y `docs/` | Julius |
| 2 | Crear la cuenta de Clerk y una aplicación; activar "solo por invitación" | Julius |
| 3 | Poner las llaves de desarrollo en `.env.local` y probar el ingreso en local | Julius pone las llaves; Claude prueba y corrige |
| 4 | Crear el proyecto en Vercel desde el repositorio | Julius |
| 5 | Cargar en Vercel las variables: las de Clerk y las de BigQuery | Julius |
| 6 | Definir el dominio y agregar los registros DNS de Vercel y de Clerk | Julius |
| 7 | Pasar Clerk a producción y cambiar a las llaves `pk_live_` / `sk_live_` | Julius |
| 8 | Invitar los correos de Julius y de NUTEC | Julius |

Las llaves nunca van en el chat ni en el repositorio: solo en `.env.local` y en las variables de Vercel.

## Variables de entorno

Son todas las de `.env.example` (tabla completada el 16 de noviembre de 2026).

| Variable | Para qué |
|---|---|
| `NUTEC_DATA_SOURCE` | `ejemplo` (por defecto, datos generados con la estructura de `nutec_marts`) o `bigquery` para datos reales. Cualquier otro valor da error |
| `BQ_PROJECT_ID` | Proyecto de Google Cloud |
| `BQ_DATASET` | Dataset; por defecto `nutec_marts`, el único que lee la aplicación |
| `BQ_LOCATION` | Ubicación del dataset (opcional) |
| `BQ_CREDENTIALS_JSON` | Llave JSON de la cuenta de servicio, en una sola línea. Es la que se usa en Vercel |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta al archivo de la llave, como alternativa a la anterior. Solo en local: en Vercel no hay archivo |
| `BQ_MAX_BYTES_BILLED` | Opcional: tope de bytes que puede leer una consulta de BigQuery; por defecto 2 GB |
| `NUTEC_HOY` | Opcional, para pruebas: fija el día de hoy (`AAAA-MM-DD`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk, llave pública |
| `CLERK_SECRET_KEY` | Clerk, llave secreta |
| `NUTEC_CORREOS_PERMITIDOS` | Opcional: correos o dominios que pueden ver los datos, separados por coma. Vacío = cualquiera con sesión |
