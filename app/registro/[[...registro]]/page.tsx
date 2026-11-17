import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { ACCESO_ACTIVO } from "@/lib/acceso";

export const metadata: Metadata = { title: "Aceptar invitación · Dashboard SEO · NUTEC" };

/**
 * Registro por invitación (componente de Clerk). A esta pantalla llega quien
 * abre el enlace de una invitación; con el modo "solo por invitación" de
 * Clerk, nadie más puede crear una cuenta aquí.
 */
export default function Page() {
  if (!ACCESO_ACTIVO) notFound();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignUp />
    </main>
  );
}
