import { NOMBRE_ROL } from "@/components/nutec/posiciones/paleta";
import type { Rol } from "@/lib/posiciones";
import { cx } from "@/utils/cx";

/** Rol de la búsqueda. Jerarquía visual: la primaria destacada, la variante discreta. */
export function ChipRol({ rol }: { rol: Rol }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded-md px-1.5 py-0.5 text-caption-1-medium whitespace-nowrap",
        rol === "primaria" && "bg-text-primary text-background-primary-default",
        rol === "secundaria" && "border border-border-button-default text-text-secondary",
        rol === "variante" && "text-text-tertiary",
      )}
    >
      {NOMBRE_ROL[rol]}
    </span>
  );
}
