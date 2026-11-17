import Link from "next/link";

/** Página no encontrada, en español. */
export default function NoEncontrada() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-title-2-medium text-text-primary">Esta página no existe</h1>
      <p className="text-body-regular text-text-secondary">La liga puede estar mal escrita o la vista todavía no está disponible.</p>
      <Link href="/" className="text-body-medium text-text-primary underline underline-offset-2">
        Ir al Resumen orgánico
      </Link>
    </main>
  );
}
