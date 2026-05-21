---
description: "Scaffold the comments feature for task comments"
---

# New Feature Scaffolding

Create a complete feature implementation for: comments on tasks, where users can add comments to existing tasks and manage those comments through a REST API.

## Files to Create

1. **Types** (`api/src/types/comments.ts`):
   - Define the main comment entity interface
   - Define CreateCommentInput and UpdateCommentInput interfaces
   - Define the repository interface for task comments
   - Include task association fields such as `taskId`

2. **Repository** (`api/src/repositories/comments-repository.ts`):
   - Implement the repository interface
   - Use parameterized SQL queries
   - Include CRUD operations for comments
   - Support listing comments for a specific task

3. **Routes** (`api/src/routes/comments-routes.ts`):
   - RESTful CRUD endpoints for comments
   - Support creating comments under tasks
   - Input validation with express-validator
   - Consistent error responses
   - JSDoc on every endpoint

4. **Tests** (`api/src/tests/comments.test.ts`):
   - Happy path tests for all comment endpoints
   - Validation error tests
   - Not-found tests for missing tasks or comments
   - Use supertest for HTTP testing

## Requirements
- Follow the project's coding standards in .github/copilot-instructions.md
- Use TypeScript strict mode
- Parameterized queries only
- 80%+ test coverage