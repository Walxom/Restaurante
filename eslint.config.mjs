import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Archivos que nunca deben lintarse
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Seeds tienen any intencional para scripts de datos de ejemplo
      "prisma/seed*.ts",
    ],
  },
  {
    rules: {
      // Señalar any explícito — aviso, no error, porque hay pre-existentes
      "@typescript-eslint/no-explicit-any": "warn",
      // Variables sin usar excepto las prefijadas con _
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Forzar import type para importaciones de solo tipo
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
];

export default eslintConfig;
