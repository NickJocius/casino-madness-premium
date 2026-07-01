import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Turn off ESLint formatting rules that conflict with Prettier (must come after the configs above).
  eslintConfigPrettier,
  // Override default ignores of eslint-config-next; add generated Prisma client.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "generated/**"]),
]);

export default eslintConfig;
