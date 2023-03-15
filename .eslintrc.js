module.exports = {
  root: true,
  env: {
    es2021: true
  },
  "extends": [
    "plugin:vue/essential",
    "eslint:recommended"
  ],
  parserOptions: {
    // parser: "@babel/eslint-parser"
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-case-declarations": "off",
    "no-console": "off",
    "no-irregular-whitespace": "off",
    "vue/multi-word-component-names": "off",
    "no-async-promise-executor": "off",
  },
  overrides: [
    {
      files: [
        "**/__tests__/*.{j,t}s?(x)",
        "**/tests/unit/**/*.spec.{j,t}s?(x)"
      ],
      env: {
        jest: true
      }
    }
  ]
}
