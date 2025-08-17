import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Performance rules
      "react/no-array-index-key": "warn",
      "react/jsx-no-bind": "warn",
      "react/jsx-no-constructed-context-values": "warn",
      "react/jsx-no-useless-fragment": "warn",
      "react/no-unstable-nested-components": "warn",
      
      // TypeScript performance rules
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "@typescript-eslint/prefer-const": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      
      // General performance rules
      "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
];

export default eslintConfig;
