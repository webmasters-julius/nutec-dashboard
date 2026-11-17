import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/base/skeleton/skeleton";

export const metadata: Metadata = { title: "Página · Dashboard SEO · NUTEC" };

/**
 * Vista Página: se construye en el paso 4 del orden de construcción.
 * Mientras tanto, la tabla del resumen enlaza aquí con la ruta elegida.
 */
async function Contenido({ searchParams }: { searchParams: PageProps<"/pagina">["searchParams"] }) {
  const { path } = await searchParams;
  const ruta = Array.isArray(path) ? path[0] : path;
  return (
    <>
      <h1 className="text-title-1-medium break-words text-text-primary">{ruta ?? "/"}</h1>
      <p className="text-body-regular text-text-secondary">Vista en construcción.</p>
      <Link href="/" className="text-body-medium text-text-primary underline underline-offset-2">
        Resumen orgánico
      </Link>
    </>
  );
}

export default function Pagina({ searchParams }: PageProps<"/pagina">) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-6 lg:px-2 lg:py-2">
      <Suspense fallback={<Skeleton shape="text" className="h-8 w-64" />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
