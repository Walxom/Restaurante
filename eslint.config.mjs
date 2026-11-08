import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next v15 expone configs en formato eslintrc (legacy).
// FlatCompat los traduce al flat config de ESLint 9.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Rutas que nunca deben lintarse (antes en el .eslintignore deprecado)
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "public/sw.js",
      "public/workbox-*.js",
      "next-env.d.ts",
      "src/lib/thermal-print/examples/**",
      // Seeds usan any intencional para scripts de datos de ejemplo
      "prisma/seed*.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // Regla estilística (comillas/apóstrofes en texto JSX en español):
      // genera ruido sin valor real, se desactiva.
      "react/no-unescaped-entities": "off",
    },
  },
  {
    // Entrypoints y scripts de Node son CommonJS por diseño: require() es correcto.
    files: ["server.js", "*.config.{js,cjs,mjs}", "ai_engine/**/*.js", "scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
