# AGENTS.md

This file is located at the root of the repository.

Before making any changes, read and follow the instructions in this file:
`./AGENTS.md`

When acting on this repository, apply the core principles:

- Consider whether the change is really necessary.
- Make surgical and focused changes.
- Follow existing coding style and patterns.
- Write tests that exercise the change.

## Coding Style & Naming Conventions

This codebase uses TypeScript, ESM, and React function components. Follow the
existing style: semicolons enabled, single quotes, and compact imports. Use
`PascalCase` for React components, `camelCase` for functions and variables, and
keep tests named `*.test.ts` or `*.test.tsx`.
Only prefer the `@/` alias for imports if a different module is used. Always
use relative imports from inside the same feature or module.

## Tests

Use Yarn with the repo’s configured toolchain.

- `yarn dev`: start the Vite development server.
- `yarn build`: run TypeScript project builds and create a production bundle.
- `yarn build-staging`: build with the staging Vite mode.
- `yarn lint`: run ESLint across the repository.
- `yarn test`: run Jest in watch mode for local development.
- `yarn cov`: generate coverage for `src/**/*.{js,jsx,ts,tsx}`.
