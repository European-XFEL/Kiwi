# AGENTS.md

Guidance for anyone working in this repo, human or agent. The goal is code a
human reads first and a machine runs second, with the least boilerplate that
still does the job. Read this before you start.

## How to work here

Think before you code.

- State your assumptions. If you are not sure, ask.
- If the task can be read more than one way, say so. Do not pick silently.
- If a simpler approach exists, say so. Push back when it helps.

Keep it simple.

- Write the least code that solves the task. Nothing speculative.
- No features that were not asked for. No "just in case" flexibility.
- No error handling for cases that cannot happen.
- If you wrote 200 lines and 50 would do, write the 50.

Make surgical changes.

- Change what the task needs, and not more.
- Do not reformat or refactor code you were not asked to touch.
- Match the style around you, even if you would do it differently.
- If you spot unrelated dead code, mention it. Do not delete it.
- Clean up only the imports and names your own change left unused.
- Surgical means no gratuitous changes. It does not mean copy code to avoid
  touching a shared function. Reuse beats duplication (see Code we want).

Work towards a clear goal.

- Turn the task into something you can check. "Add validation" becomes "write a
  test for the invalid input, then make it pass."
- For multi-step work, state a short plan first.

## Code we want

- Readable first. Short, single-purpose functions. Clear names. If a function
  does not fit on a screen, split it.
- Reuse before you write new. Look for an existing function before you add one.
  Reusing it, or making a small change so it fits, beats copy-pasting it.
  Copying logic so your diff looks smaller is the wrong kind of minimal. If
  reuse needs a change to a function shared across domains, coordinate first
  (see Collaboration).
- Minimal means fewest new ideas, not fewest lines touched. One small shared
  helper beats the same logic in two places.
- Comments explain why, not what. Skip comments that restate the code. No
  decorative banners.
- Type the signatures and the non-obvious types. Do not annotate every local.

## Coding Style & Naming Conventions

This codebase uses TypeScript, ESM, and React function components. Follow the existing style: semicolons enabled, single quotes, and compact imports. Use `PascalCase` for React components, `camelCase` for functions and variables, and keep tests named `*.test.ts` or `*.test.tsx`.
Only prefer the `@/` alias for imports if a different module is used. Always use relative imports from inside the same feature or module.

## Tests

- Tests are worked examples. A test shows the next person how something behaves.
- A test should carry enough context to be understood on its own. From its name
  and body a reader should see what behavior it checks and why it passes,
  without hunting through helpers or fixtures to follow along.
- Reach for a parametrized table when cases vary only in simple inputs and
  expected results and the table still reads as a worked example. When each case
  carries rich or irregular data (nested structures, optional fields, multi-file
  setups), write one named function per case with a shared assert helper.
  Readability wins; never parametrize just to avoid repeating yourself.
- Do not test trivial getters, plain dataclasses, or framework wiring.
- Add a test when it earns its place: a real behavior, a contract, or a bug you
  are fixing. Not for a coverage number.

Use Yarn with the repo’s configured toolchain.

- `yarn dev`: start the Vite development server.
- `yarn build`: run TypeScript project builds and create a production bundle.
- `yarn build-staging`: build with the staging Vite mode.
- `yarn lint`: run ESLint across the repository.
- `yarn test`: run Jest in watch mode for local development.
- `yarn cov`: generate coverage for `src/**/*.{js,jsx,ts,tsx}`.

## Docs and decisions

- Write docs and comments in plain, direct English. Short sentences. Assume a
  tired reader. The exception is machine-facing files like schemas.
- A durable design decision goes in `docs/decisions/` as a short record. See
  the records already there for the shape. Always respect decisions already
  present there. If the current request is in conflict with a previously
  taken decision, ask how to proceed. DO NOT simply revise decisions on your
  own!
- Day-to-day reasoning goes in the merge request description, not a file in the
  repo. We do not keep a running log.
- Hit something undecided, a gap, or a "how do we proceed" question? Add a line
  to `docs/open-questions.md` under the right domain.
