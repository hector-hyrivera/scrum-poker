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
- Strict mode enabled for both frontend and workers (`tsconfig.app.json`, `tsconfig.node.json`).
- Enforces consistent file name casing for cross-platform safety.
- Workers have their own TypeScript configuration in `workers/tsconfig.json`.

## Vite
- Minimal config with React plugin.
- Supports fast local development and production builds.
- See `vite.config.ts` for details.

## Cloudflare Workers
- Configuration in `wrangler.toml` for Workers deployment.
- Durable Objects and D1 database bindings.
- Custom domain routing and CORS settings.

## Environment Variables
- `.env` file in the root directory for shared settings.
- Cloudflare Workers environment variables configured in `wrangler.toml`.
- Common variables:
  - `ENVIRONMENT`: "production" or "development"
  - `VITE_SOCKET_URL`: WebSocket URL for the application
  - `NODE_ENV`: Node environment
  - `DEV`: Development flag

> **Note:** Update this document as new configuration options are added.
