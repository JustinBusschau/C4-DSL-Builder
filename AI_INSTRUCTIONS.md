`c4dslbuilder` is a TypeScript ESM CLI app that builds markdown, PDFs, and static sites from C4 DSL and markdown input files.

Guidelines:

- all code MUST be 100% typescript ESM compliant
- never use `any` as a type - this applies to implicit types too, so make sure everything is properly typed
- use vitest for all tests
- All tests must be written to exercise real usage paths using vitest
- Favour integration-style tests over unit tests, but aim for full coverage at all times.
- DO NOT write tests that rely on direct access to private class methods. Instead, target code paths indirectly via usage
- Always use async/await - do not use `.then()` or other promise chaining methods in any code
- Assume any local imports import classes rather than functions unless I tell you otherwise
- I already have `"type": "model"` in my `package.json`
- As this is a CLI it is extremely important to validate all output to the logger as that handles all feedback to the user via stdout.
- If adding or editing rulesets for AI assistants, reference this file (`AI_INSTRUCTIONS.md`) via symlink rather than adding new instructions