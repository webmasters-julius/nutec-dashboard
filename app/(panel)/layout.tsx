import { Navegacion, NavegacionMovil } from "@/components/nutec/navegacion";

/**
 * Marco de las vistas del dashboard: la navegación lateral y el contenido.
 * Las pantallas de ingreso y de registro quedan fuera de este grupo y van
 * solas, sin navegación, porque quien las ve todavía no ha entrado.
 */
export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    // Una sola columna del alto de la pantalla: la barra móvil no suma scroll a una vista corta.
    <div className="flex min-h-screen flex-col">
      <NavegacionMovil />
      <div className="flex flex-1 gap-4 p-0 lg:p-4">
        <div className="sticky top-4 hidden h-[calc(100vh-2rem)] lg:block">
          <Navegacion />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
