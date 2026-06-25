# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the application code. Use `src/app/` for app bootstrap and layout, `src/features/` for feature-oriented UI and hooks, `src/components/` for shared UI primitives, `src/lib/` for infrastructure and utilities, `src/store/` for Zustand state, and `src/karabo/` for Karabo-specific data and scene models. Static assets live under `public/` and `src/assets/`. Tests sit next to the code in `__tests__/` folders or in domain-specific `__test__/` directories. Deployment files are in `deploy/`, and sample scene inputs are in `scene_samples/`.

## Build, Test, and Development Commands

Use Yarn with the repo’s configured toolchain.

- `yarn dev`: start the Vite development server.
- `yarn build`: run TypeScript project builds and create a production bundle.
- `yarn build-staging`: build with the staging Vite mode.
- `yarn lint`: run ESLint across the repository.
- `yarn test`: run Jest in watch mode for local development.
- `yarn cov`: generate coverage for `src/**/*.{js,jsx,ts,tsx}`.

## Coding Style & Naming Conventions

This codebase uses TypeScript, ESM, and React function components. Follow the existing style: semicolons enabled, single quotes, and compact imports. Use `PascalCase` for React components, `camelCase` for functions and variables, and keep tests named `*.test.ts` or `*.test.tsx`. Prefer the `@/` alias for imports from `src/`. Respect the ESLint restriction that store modules must be imported through `@/store/api`, not deep paths.

## Testing Guidelines

Jest with `ts-jest` and React Testing Library is the default stack. Keep unit tests close to the code they cover and use the existing mocks in `test/__mocks__/` when a browser API, worker, Plotly, or Karabo dependency needs isolation. Run `yarn cov` before opening substantial changes and extend coverage when touching scene rendering, bindings, or workspace state flows.

## Commit & Pull Request Guidelines

Recent history follows short, imperative commit subjects, often using Conventional Commit prefixes such as `feat:` and `fix:`. Keep subjects focused on one change. Pull requests should explain user-visible impact, note any risky areas, link related issues, and include screenshots for UI changes. Call out test coverage and any follow-up work explicitly.

## Security & Configuration Tips

Do not commit secrets or machine-specific endpoints. Review `deploy/` changes carefully, and keep sample data or scene files sanitized before adding them to `scene_samples/`.
