# Configuration Reference

This document provides detailed information on the configuration files and settings for the SCRUM Planning Poker application.

## ESLint
- Uses `typescript-eslint` for TypeScript linting.
- Enforces React, React Hooks, and accessibility (`jsx-a11y`) best practices.
- Custom rules for React Refresh and code quality.
- See `eslint.config.js` for details.

## TailwindCSS
- Custom color palette and animations defined in `tailwind.config.js`.
- Scans all relevant files for purging unused styles.

## TypeScript
- Strict mode enabled for both frontend and backend (`tsconfig.app.json`, `tsconfig.node.json`).
- Enforces consistent file name casing for cross-platform safety.

## Vite
- Minimal config with React plugin.
- Supports fast local development and production builds.
- See `vite.config.ts` for details.

## Environment Variables
- `.env` file in the root directory for shared settings.
- Backend/server-specific environment variables documented in `server/.env.example` (if available).
- Common variables:
  - `PORT`: Port for backend server (default: 8080)
  - `VITE_API_URL`: API endpoint for frontend

> **Note:** Update this document as new configuration options are added.
