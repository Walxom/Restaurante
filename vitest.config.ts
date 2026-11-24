import { defineConfig, configDefaults } from "vitest/config"

export default defineConfig({
  // Resolución nativa de los paths de tsconfig (@/* → src/*) en Vite 8;
  // reemplaza al plugin vite-tsconfig-paths y elimina su warning.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: true,
    // Las pruebas E2E de Playwright viven en e2e/ y usan su propio runner (pnpm test:e2e).
    // Se excluyen de Vitest para que no intente ejecutarlas como tests unitarios.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      // Umbral mínimo exigido por la Definition of Done y el Plan de Calidad (≥ 80 %).
      // `pnpm test:coverage` (y el job de CI) falla si la cobertura cae por debajo.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
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
