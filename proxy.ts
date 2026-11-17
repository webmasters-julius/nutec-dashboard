import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Control de acceso para toda la aplicación.
 *
 * - Con las llaves de Clerk: cualquier ruta que no sea la de ingreso o la de
 *   registro por invitación exige una sesión; sin ella, redirige al ingreso.
 * - Sin llaves, en desarrollo: deja pasar, para trabajar en local.
 * - Sin llaves, en producción: bloquea todo. Un tablero con datos del cliente
 *   no debe quedar abierto por un descuido de configuración.
 *
 * El `matcher` no cubre rutas que terminen en una extensión de archivo. Por
 * eso ninguna vista debe llevar la página en la ruta (va en `?path=`), no se
 * ponen datos en `public/`, y las vistas vuelven a revisar la sesión por su
 * cuenta (lib/acceso-servidor.ts).
 */
const activo = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
const esPublica = createRouteMatcher(["/ingresar(.*)", "/registro(.*)"]);

const conAcceso = activo
  ? clerkMiddleware(
      async (auth, req) => {
        if (!esPublica(req)) await auth.protect();
      },
      // El proxy no hereda las rutas que recibe ClerkProvider: sin esto, quien
      // no tiene sesión iría al portal de Clerk, fuera del dominio y en inglés.
      { signInUrl: "/ingresar", signUpUrl: "/registro" },
    )
  : null;

function sinLlaves() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("El acceso al dashboard no está configurado.", { status: 503 });
  }
  return NextResponse.next();
}

export default conAcceso ?? sinLlaves;

export const config = {
  matcher: [
    // Todo menos los archivos internos de Next.js y los estáticos.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
