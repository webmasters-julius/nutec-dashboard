"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { RiBookOpenLine, RiCompass3Line, RiDashboardLine, RiStackLine } from "@remixicon/react";
import { ACCESO_ACTIVO } from "@/lib/acceso";
import { cx } from "@/utils/cx";
import { DashboardSidebar, type DashboardNavItem } from "@/components/application/dashboard/dashboard-sidebar";

/**
 * Navegación lateral (Sidebar de BoardUI). Las vistas que todavía no existen
 * aparecen deshabilitadas, con los nombres de la especificación. La guía de
 * lectura es un apartado propio, al final, para no competir con los datos.
 */
const VISTAS: DashboardNavItem[] = [
  { key: "resumen", label: "Resumen orgánico", icon: RiDashboardLine, href: "/" },
  { key: "clusters", label: "Estrategia por cluster", icon: RiStackLine, href: "/clusters" },
  // Todavía no está construida: va deshabilitada y lo dice, para que no parezca un error.
  { key: "descubrimiento", label: "Descubrimiento", icon: RiCompass3Line, disabled: true, badge: "Pronto" },
  { key: "guia", label: "Guía de lectura", icon: RiBookOpenLine, href: "/guia" },
];

function Marca({ contraida }: { contraida: boolean }) {
  // Con el menú contraído solo hay 36px de ancho: va la inicial, no el nombre cortado.
  if (contraida) {
    return (
      <div className="flex w-9 flex-col items-center gap-2.5">
        <span
          role="img"
          aria-label="NUTEC · Dashboard SEO"
          title="NUTEC · Dashboard SEO"
          className="flex size-9 items-center justify-center rounded-xl bg-background-tertiary-default text-headline-medium text-text-primary"
        >
          N
        </span>
        {/* El botón de la persona sigue a la mano con el menú contraído, para poder cerrar sesión. */}
        {ACCESO_ACTIVO && <UserButton />}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 flex-col">
        <span className="text-headline-medium whitespace-nowrap text-text-primary">NUTEC</span>
        <span className="text-caption-1-medium whitespace-nowrap text-text-tertiary">Dashboard SEO</span>
      </div>
      {/* Con el acceso configurado: el botón de la persona que entró, con "Cerrar sesión". */}
      {ACCESO_ACTIVO && <UserButton />}
    </div>
  );
}

export function Navegacion() {
  const ruta = usePathname();
  const seleccionada = ruta.startsWith("/guia") ? "guia" : ruta.startsWith("/clusters") ? "clusters" : "resumen";
  return <DashboardSidebar items={VISTAS} selected={seleccionada} brand={(contraida) => <Marca contraida={contraida} />} minimal />;
}

/**
 * Navegación en pantallas chicas: una barra superior con las mismas vistas.
 * La barra lateral solo se muestra desde el tamaño `lg`; sin esta barra, en el
 * celular no habría forma de pasar de una vista a otra.
 */
export function NavegacionMovil() {
  const ruta = usePathname();
  const seleccionada = ruta.startsWith("/guia") ? "guia" : ruta.startsWith("/clusters") ? "clusters" : "resumen";
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-2 border-b border-separator-border bg-background-full px-4 pt-3 pb-2 lg:hidden">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-baseline gap-2">
          <span className="text-headline-medium text-text-primary">NUTEC</span>
          <span className="text-caption-1-medium text-text-tertiary">Dashboard SEO</span>
        </span>
        {ACCESO_ACTIVO && <UserButton />}
      </div>
      <nav aria-label="Vistas" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {VISTAS.filter((v) => v.href).map((v) => (
          <Link
            key={v.key}
            href={v.href!}
            aria-current={seleccionada === v.key ? "page" : undefined}
            className={cx(
              "shrink-0 rounded-full px-3 py-1.5 text-body-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-border-focus-ring",
              seleccionada === v.key ? "bg-text-primary text-background-primary-default" : "text-text-secondary hover:bg-background-secondary-hover",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
