"use client";

import { useEffect } from "react";

/** Pantalla de error de las vistas, en español. Next la muestra si falla la carga de datos. */
export default function ErrorDeVista({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex flex-col gap-3 px-4 py-6 lg:px-2 lg:py-2">
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-background-secondary-default px-4 py-6">
        <h1 className="text-title-3-semibold text-text-primary">No se pudieron cargar los datos</h1>
        <p className="max-w-2xl text-body-regular text-text-secondary">
          Ocurrió un problema al consultar la información. Vuelve a intentarlo en unos minutos; si sigue igual, avisa a tu contacto en Julius.
        </p>
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer rounded-2lg border border-border-button-default bg-background-primary-default px-3 py-2 text-body-medium text-text-primary outline-none transition-colors duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          Volver a intentar
        </button>
      </div>
    </main>
  );
}
