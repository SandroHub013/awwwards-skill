import js from "@eslint/js";
import globals from "globals";

/* The repo holds three kinds of JavaScript:
   - browser modules under docs/ and assets/templates/ (three.js arrives as a
     global from a CDN import map, so THREE is declared rather than imported),
   - Node harness scripts (*.mjs) under docs/demos/(soglia|stacco)/render/,
   - the test suite.
   Each gets its own globals; the rules are the same everywhere. */
export default [
  {
    ignores: [
      "**/node_modules/**",
      "docs/demos/*/render/frames/**",
      "docs/demos/*/render/frames-m/**",
      "coverage/**",
    ],
  },

  js.configs.recommended,

  {
    // shared rules
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      /* TEMPORARY: warn, not error.
         There are 16 empty catch blocks left, 8 in docs/demos/soglia/app.js and
         8 in docs/demos/stacco/app.js, and how each should behave is still being
         decided. no-empty ignores a block once it holds a comment, so every one
         of them clears this rule as it is resolved. Put this back to "error" —
         and delete this note — when the last one is done. */
      "no-empty": "warn",
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": ["error", { destructuring: "all" }],
    },
  },

  {
    files: ["docs/**/*.js", "assets/templates/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, THREE: "readonly" },
    },
  },

  {
    files: ["**/*.mjs", "*.js"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    // puppeteer harnesses: the file runs in Node, but the page.evaluate
    // callbacks inside it are serialised and run in the browser, so both
    // sets of globals are legitimately in scope in the same file
    files: ["docs/demos/*/render/*.mjs"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  {
    files: ["tests/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
