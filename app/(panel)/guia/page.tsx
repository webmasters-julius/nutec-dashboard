import type { Metadata } from "next";
import { GuiaLectura } from "@/components/nutec/guia-lectura";

export const metadata: Metadata = { title: "Guía de lectura · Dashboard SEO · NUTEC" };

export default function Guia() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 lg:px-2 lg:py-2">
      <h1 className="text-title-1-medium text-text-primary">Guía de lectura</h1>
      <GuiaLectura />
    </main>
  );
}
