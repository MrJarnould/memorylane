# Agent Guidelines

## Git Operations

- **Do Not Commit on Your Own**: Never create git commits unless explicitly requested by the user. If you have completed a task, stop and ask the user if they want you to commit the changes.

## Code Comments & Edits

- **Avoid Conversational Comments**: When writing real code (not just in chat suggestions), do not include comments that explain the *edit* or provide conversational context (e.g., `// Proposed update`, `// Now explicit`, `// Changed to X`).
  - Only include comments that explain the *code logic* and are intended to persist in the codebase if relevant.

## TypeScript Best Practices

- **No `any`**: Never use `any` as a type. Use `unknown` when the type is truly not known and narrow it with type guards, or define a proper type/interface.
- **No Type Assertions Unless Necessary**: Avoid `as` casts when the type can be inferred or narrowed safely. Never use `as any`.
- **No `@ts-ignore` / `@ts-expect-error`**: Do not suppress TypeScript errors. Fix the underlying type issue instead.
- **Explicit Return Types on Exported Functions**: All exported functions and methods should have explicit return type annotations.
- **Use `readonly` Where Appropriate**: Prefer `readonly` for properties and parameters that should not be mutated.
- **Prefer `interface` Over `type` for Object Shapes**: Use `interface` for object types (they produce better error messages and are extendable). Use `type` for unions, intersections, and mapped types.
- **Use Strict Null Checks**: Handle `null` and `undefined` explicitly rather than relying on loose truthiness checks (e.g., prefer `=== null` over `!value` when checking for null specifically).
- **No Non-Null Assertions (`!`)**: Avoid the `!` postfix operator. Use proper null checks or optional chaining instead.
