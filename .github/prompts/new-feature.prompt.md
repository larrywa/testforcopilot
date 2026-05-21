---
description: "Scaffold a new feature with route, repository, types, and tests"
---

# New Feature Scaffolding

Create a complete feature implementation for: {{ feature_description }}

## Files to Create

1. **Types** (`api/src/types/{{ feature_name }}.ts`):
   - Define the main entity interface
   - Define Create and Update input interfaces
   - Define the repository interface

2. **Repository** (`api/src/repositories/{{ feature_name }}-repository.ts`):
   - Implement the repository interface
   - Use parameterized SQL queries
   - Include all CRUD operations

3. **Routes** (`api/src/routes/{{ feature_name }}-routes.ts`):
   - RESTful CRUD endpoints
   - Input validation with express-validator
   - Consistent error responses
   - JSDoc on every endpoint

4. **Tests** (`api/src/tests/{{ feature_name }}.test.ts`):
   - Happy path tests for all endpoints
   - Validation error tests
   - Not-found tests
   - Use supertest for HTTP testing

## Requirements
- Follow the project's coding standards in .github/copilot-instructions.md
- Use TypeScript strict mode
- Parameterized queries only
- 80%+ test coverage