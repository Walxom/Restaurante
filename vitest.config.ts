import { defineConfig, configDefaults } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // Las pruebas E2E de Playwright viven en e2e/ y usan su propio runner (pnpm test:e2e).
    // Se excluyen de Vitest para que no intente ejecutarlas como tests unitarios.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Enfocar la cobertura en la lógica de negocio (servicios y validaciones),
      // que es lo que cubren las pruebas unitarias de camino básico (McCabe).
      include: ["src/services/**/*.ts", "src/features/**/validations/**/*.ts"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.ts",
        "src/services/printer/**", // I/O de hardware (ESC/POS) — fuera de pruebas unitarias
      ],
    },
  },
})
