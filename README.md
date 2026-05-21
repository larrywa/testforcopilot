# WeatherAPI Workspace

This repository contains two API projects and a few supporting files used for experimentation and coursework.

## Projects

### `lab3-api-2`

TypeScript task management API built with Express.

- Runtime: Node.js 18+
- Language: TypeScript (strict mode)
- API features: task CRUD endpoints, validation middleware, request logging, and Jest + supertest integration tests

Common commands:

```bash
cd lab3-api
npm install
npm run dev
npm run build
npm test
```

### `WeatherApp`

ASP.NET Core Web API targeting .NET 9.

- Framework: ASP.NET Core Web API
- Language: C#
- Tooling: Swagger / OpenAPI via Swashbuckle
- Includes weather endpoints and a credit card validation controller

Common commands:

```bash
cd WeatherApp
dotnet restore
dotnet build
dotnet run
```

## Repository Layout

```text
.
|-- lab3-api/        # Express + TypeScript task API
|-- WeatherApp/      # ASP.NET Core Web API
|-- creditCardValidator.ts
|-- Dockerfile
|-- .github/
`-- .api-center-rules/
```

## Notes

- The root `.gitignore` excludes generated output, dependency folders, IDE metadata, coverage output, and user-specific files.
- `lab3-api` also has its own local `.gitignore` for Node-specific build artifacts.
- `WeatherApp` contains generated OpenAPI assets and publish profile files that are currently kept in source control where they are part of the project setup.
