/** Aviso para quien inició sesión con un correo que no está autorizado a ver el dashboard. */
export function SinAcceso() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-background-secondary-default px-4 py-6">
      <h1 className="text-title-3-semibold text-text-primary">Tu cuenta no tiene acceso a este dashboard</h1>
      <p className="max-w-2xl text-body-regular text-text-secondary">
        Iniciaste sesión, pero tu correo no está en la lista de personas autorizadas. Pide acceso a tu contacto en Julius.
      </p>
    </div>
  );
}
