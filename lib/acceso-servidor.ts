import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ACCESO_ACTIVO, RUTA_INGRESO } from "@/lib/acceso";

/**
 * Segunda barrera de acceso, dentro de cada vista que lee datos. El proxy ya
 * exige sesión, pero es una sola puerta: si una ruta quedara fuera de su
 * `matcher`, la vista entregaría los datos. Aquí se vuelve a revisar.
 *
 * Además, si existe NUTEC_CORREOS_PERMITIDOS (correos o dominios separados por
 * coma, por ejemplo "ana@nutec.com, @julius2grow.com"), solo esas personas
 * ven los datos. Así el "solo por invitación" no depende únicamente de un
 * ajuste del panel de Clerk.
 *
 * Lee la solicitud: debe llamarse dentro de un <Suspense>.
 * Devuelve false cuando la persona tiene sesión pero no está en la lista.
 */
export async function exigirAcceso(): Promise<boolean> {
  if (!ACCESO_ACTIVO) return true;
  const { userId } = await auth();
  if (!userId) redirect(RUTA_INGRESO);

  const permitidos = (process.env.NUTEC_CORREOS_PERMITIDOS ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  if (permitidos.length === 0) return true;

  const usuario = await currentUser();
  // Solo cuentan los correos verificados: uno sin verificar no prueba quién es la persona.
  const correos = (usuario?.emailAddresses ?? [])
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  return correos.some((correo) => permitidos.some((p) => (p.startsWith("@") ? correo.endsWith(p) : correo === p)));
}
