import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Express handlers routinely take an unused `_req` (asyncHandler
      // wrappers, error middleware); catch blocks sometimes ignore the
      // error. Underscore-prefixed names opt out rather than banning the
      // pattern outright.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // req.user! after requireAuth, Prisma relation includes, etc. — this
      // codebase relies on non-null assertions where a middleware or query
      // shape already guarantees the value; that's a judgment call per use,
      // not something a blanket lint rule should flag on every occurrence.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
