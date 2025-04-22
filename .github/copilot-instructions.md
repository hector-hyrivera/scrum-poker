# Copilot Instructions

## Project Stack and Focus

- You are an expert in TypeScript, React, AstroJS 5.x, AstroDB, Shadcn UI, and Tailwind CSS.
- Prioritize clear, readable, and maintainable code.
- Follow the latest project requirements and conventions.

## Code Style and Structure

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.

## Naming Conventions

- Components: PascalCase (UserProfile.tsx)
- Regular files: kebab-case (api-utils.ts)
- Tests: _.test.ts or _.spec.ts
- Functions/Vars: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Classes: PascalCase

## TypeScript Usage

- Use TypeScript for all code.
- Prefer types over interfaces.
- Use explicit return types for all functions.
- Use generics for reusable code and type guards for safety.
- Use unknown over any.
- Avoid enums; use objects or maps instead.

## Syntax and Formatting

- 2 space indent, 80 char limit, template literals.
- Trailing commas, same-line braces, arrow functions.
- Prop destructuring, TS path aliases, env vars.
- Use declarative JSX.

## UI and Styling

- Use Shadcn UI and Tailwind for components and styling.
- Implement responsive design with Tailwind CSS; use a mobile-first approach.
- Follow a consistent color palette and CSS variables.
- Ensure accessibility (WCAG 2.1 AA), semantic HTML, ARIA labels, and keyboard navigation.

## Error Handling & Logging

- Use custom error classes with clear messages and stack traces in dev.
- Provide user-friendly messages and fallback UI.
- Standardize error format and include retry logic for network errors.
- Use structured logging with request IDs and severity levels.

## State Management

- Use memoization and selective re-renders for performance.
- Avoid prop drilling and batch state updates.

## API & Data

- REST: Use HTTP conventions, status codes, JSON:API spec, input validation, and versioning.
- GraphQL: Use schemas, fragments, caching, and prevent N+1 queries.
- SQL: Use prepared statements, indexing, access control, and prevent injection.

## Testing

- Group tests by feature, use descriptive names, and mock externals.
- Follow naming conventions: _.test.ts or _.spec.ts

## Documentation

- Use JSDoc for interfaces, types, and usage examples.
- Document component props/types, state, and accessibility.
- Maintain a project README and update the decisions_and_changes_log.md.

## Build, Deployment, and Repo

- Run linting, tests, and optimize bundles before deploy.
- Use semantic versioning and blue-green deployment.
- Follow branch naming: feature/_, bugfix/_, hotfix/_, release/_, chore/_
- Use commit messages: <type>[scope]: desc (feat, fix, docs, style, refactor, test, chore)
- Ensure CI passes, docs are updated, and tests pass before merging.

## Browser Compatibility & Responsiveness

- Support latest 2 browser versions; use feature detection and polyfills.
- Mobile-first development with Tailwind breakpoints.
- Use responsive images and proper CSS units.

## Security

- Sanitize and validate all input, escape output, and secure file uploads.
- Use JWT for auth, secure sessions, token refresh, and RBAC.
- Set CSP headers, prevent XSS/CSRF, and follow OWASP best practices.

## Components Organization

Within the /src/components folder, organize components by type or feature:

- By Type: Group components like forms, buttons, layout elements, etc.
- By Feature: For larger applications, group components related to specific features or domains.

Example:

  /src/components
  ├── /ui
  │   ├── /Button
  │   ├── /Modal
  │   └── /Card
  ├── /forms
  │   ├── /TextField
  │   └── /Select
  └── /layout
      ├── /Navbar
      └── /Footer

- Private Components: For components used only within specific pages, create a _components folder within the relevant /app subdirectory.
- Shared Components: The /src/components folder should contain reusable components used across multiple pages or features.
- Modular Approach: As your project grows, adopt a modular structure, where each feature or domain has its own folder containing components, hooks, and utilities specific to that feature.
