import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.browser,
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // React 17+'s automatic JSX runtime (this app's tsconfig sets
      // jsx: "react-jsx") means components don't need `import React`.
      "react/react-in-jsx-scope": "off",
      // Every prop type here is already checked by TypeScript.
      "react/prop-types": "off",
      // A raw ' or " in JSX text renders fine in React — this rule is about
      // strict HTML-document validity, which doesn't apply here. This app's
      // copy is full of contractions and possessives ("Today's Merit",
      // "don't"); escaping every one to &apos; would only make the source
      // harder to read and edit for no real benefit.
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
