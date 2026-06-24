> **Meta**: If adding or editing rulesets for AI assistants, reference this file (`AI_INSTRUCTIONS.md`) via symlink rather than adding new instructions.

`c4dslbuilder` is a TypeScript ESM CLI app that builds markdown, PDFs, and static sites from C4 DSL and markdown input files.

## Project Architecture

- **Processor Pattern**: All output generators extend `ProcessorBase` — use this for new output formats
- **SafeFiles**: Always use `SafeFiles` class for filesystem operations, not raw `fs` — it includes error handling and safety guards
- **CliLogger**: Inject via constructor with `new CliLogger(ClassName.name)` — validates all stdout output
- **CacheManager**: Processors should check `cache.hasChanged()` before processing files to avoid redundant work

## Code Conventions

- **ESM Imports**: Use `.js` extensions on all local imports (e.g., `from './cli/cli.js'`) — required for NodeNext resolution
- **Test Files**: Name as `*.spec.ts`, colocated with source
- **Private Members**: Prefix with underscore only if truly private; prefer `private readonly` for DI dependencies
- **Error Handling**: Never throw unhandled exceptions in CLI paths — always log via `CliLogger` and exit gracefully

## Guidelines

- all code MUST be 100% typescript ESM compliant
- never use `any` as a type - this applies to implicit types too, so make sure everything is properly typed
- use vitest for all tests
- All tests must be written to exercise the public API surface using vitest
- Favour integration-style tests over unit tests, but aim for full coverage at all times.
- DO NOT write tests that rely on direct access to private class methods. Instead, target code paths indirectly via usage
- Always use async/await - do not use `.then()` or other promise chaining methods in any code
- Assume any local imports import classes rather than functions unless I tell you otherwise
- I already have `"type": "module"` in my `package.json`
- As this is a CLI it is extremely important to validate all output to the logger as that handles all feedback to the user via stdout.