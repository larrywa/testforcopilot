# Copilot Instructions

## Language & Style
- Use TypeScript strict mode for all code
- Prefer `const` over `let`; never use `var`
- Use async/await, never raw Promises or callbacks

## Documentation
- All exported functions must have JSDoc with @param and @returns
- Include @example for public API functions

## Error Handling
- Use custom error classes extending Error
- Never catch and silently ignore errors