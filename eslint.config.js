export default [
  {
    files: ["functions/**/*.js", "store.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        fetch: "readonly",
        crypto: "readonly",
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        TextEncoder: "readonly",
        Uint8Array: "readonly",
        setTimeout: "readonly",
        btoa: "readonly",
        atob: "readonly",
        console: "readonly",
        document: "readonly",
        window: "readonly",
        localStorage: "readonly",
        XMLSerializer: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-undef": "error",
      "no-console": "off",
      "semi": ["warn", "always"],
    },
  },
];
