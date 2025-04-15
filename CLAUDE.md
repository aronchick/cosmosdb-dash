# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands
- `npm run dev` - Start local development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code linting
- `npm install:clean` - Clean install dependencies

## Code Style Guidelines
- **Imports**: Group related imports; React imports first, then external libraries, followed by project imports with @/ aliases
- **Types**: Use TypeScript interfaces for object shapes (see lib/config.ts for examples)
- **Error Handling**: Use try/catch with specific error types, log errors, and propagate with context
- **Naming**: Use camelCase for variables/functions, PascalCase for components/interfaces, ALL_CAPS for constants
- **Component Structure**: React components export default, client components start with "use client" directive
- **File Structure**: Keep related functionality together, UI in components/, API routes in app/api/
- **Formatting**: Use 2-space indentation, semicolons, single quotes where possible

## Cosmos DB Interaction
Access Cosmos DB via the data-service.ts abstraction layer. Handle connections carefully and always include error handling.