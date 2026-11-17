import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const ruta = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "server-only": ruta("./tests/stubs/server-only.ts"),
      "@": ruta("./"),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
