/**
 * Control de acceso (Clerk). Está activo solo cuando existe la llave pública
 * de Clerk: así la aplicación sigue corriendo en local, sin inicio de sesión,
 * mientras no se configure. En producción sin llaves, proxy.ts bloquea todo.
 *
 * Sirve en el servidor y en el navegador: las variables NEXT_PUBLIC_ se
 * incluyen en el código del navegador al compilar.
 */
export const ACCESO_ACTIVO = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Rutas de ingreso y de registro por invitación; son las únicas públicas. */
export const RUTA_INGRESO = "/ingresar";
export const RUTA_REGISTRO = "/registro";
