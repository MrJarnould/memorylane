# Agent Guidelines

## Git Operations

- **Do Not Commit on Your Own**: Never create git commits unless explicitly requested by the user. If you have completed a task, stop and ask the user if they want you to commit the changes.

## Code Comments & Edits

- **Avoid Conversational Comments**: When writing real code (not just in chat suggestions), do not include comments that explain the _edit_ or provide conversational context (e.g., `// Proposed update`, `// Now explicit`, `// Changed to X`).
  - Only include comments that explain the _code logic_ and are intended to persist in the codebase if relevant.

## Code Quality

### Formatting (Prettier)

All code is formatted with Prettier. Configuration lives in `.prettierrc.json`.

- **Run `npm run format`** to format the entire codebase.
- **Run `npm run format:check`** to verify formatting without writing changes (useful for CI).
- A pre-commit hook (husky + lint-staged) automatically formats staged files on every commit, so formatting is enforced automatically.
- When writing or editing code, follow the existing style: no semicolons, single quotes, trailing commas, 100 character line width.
- Do not disable or skip the pre-commit hook (`--no-verify`).

### Linting (ESLint)

ESLint is configured in `.eslintrc.json` with TypeScript and import plugins. `eslint-config-prettier` is included to prevent conflicts between ESLint and Prettier.

- **Run `npm run lint`** to check for lint errors.
- The pre-commit hook also runs `eslint --fix` on staged `.ts`/`.tsx` files.

### Adding New Dependencies

When adding new npm packages, always use `npm install` (with `--save-dev` for dev-only packages). After installing, the `postinstall` script automatically rebuilds native modules for Electron. Run `npm run format` if the install modified `package.json` formatting.

## TypeScript Best Practices

- **No `any`**: Never use `any` as a type. Use `unknown` when the type is truly not known and narrow it with type guards, or define a proper type/interface.
- **No Type Assertions Unless Necessary**: Avoid `as` casts when the type can be inferred or narrowed safely. Never use `as any`.
- **No `@ts-ignore` / `@ts-expect-error`**: Do not suppress TypeScript errors. Fix the underlying type issue instead.
- **Explicit Return Types on Exported Functions**: All exported functions and methods should have explicit return type annotations.
- **Use `readonly` Where Appropriate**: Prefer `readonly` for properties and parameters that should not be mutated.
- **Prefer `interface` Over `type` for Object Shapes**: Use `interface` for object types (they produce better error messages and are extendable). Use `type` for unions, intersections, and mapped types.
- **Use Strict Null Checks**: Handle `null` and `undefined` explicitly rather than relying on loose truthiness checks (e.g., prefer `=== null` over `!value` when checking for null specifically).
- **No Non-Null Assertions (`!`)**: Avoid the `!` postfix operator. Use proper null checks or optional chaining instead.
