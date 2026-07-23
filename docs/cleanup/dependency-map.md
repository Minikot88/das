# Cleanup dependency map

Frontend direction remains `app → modules → domain/shared`, with infrastructure adapters used at the browser boundary. Backend direction remains `presentation → application → domain`, with Prisma and secret implementations under infrastructure.

Root production packages are React/MUI, Zustand, routing, drag/grid layout, and chart renderers. Root build/test packages are Vite, TypeScript, ESLint, Vitest, jsdom and Testing Library.

API production packages are Nest/Fastify plugins, Prisma/MariaDB, validation/transform, dotenv, RxJS and reflection metadata. API build/test packages are TypeScript, tsx, Prisma CLI, Vitest and Node types.

Knip's nested-package “unlisted” output is a workspace-configuration false positive. Dependency deletion requires direct import/config/script searches plus a clean install, tests and build.
