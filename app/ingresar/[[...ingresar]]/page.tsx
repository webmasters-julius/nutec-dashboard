import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { ACCESO_ACTIVO } from "@/lib/acceso";

export const metadata: Metadata = { title: "Ingresar · Dashboard SEO · NUTEC" };

/** Pantalla de ingreso (componente de Clerk). Solo existe cuando el acceso está configurado. */
export default function Page() {
  if (!ACCESO_ACTIVO) notFound();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignIn />
    </main>
  );
}
