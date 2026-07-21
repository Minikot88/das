# Folder Structure

```text
src/
├── app/
│   ├── components/command-palette/
│   ├── error-boundaries/
│   ├── layouts/
│   ├── router/
│   ├── store/
│   └── App.jsx
├── domain/
│   ├── charts/
│   ├── dashboard/
│   ├── shares/
│   └── workspace/
├── infrastructure/
│   ├── deployment/tests/
│   ├── http/
│   ├── mock/
│   └── persistence/
├── modules/
│   ├── auth/
│   ├── charts/
│   ├── connections/
│   ├── dashboards/
│   ├── datasets/
│   ├── projects/
│   ├── settings/
│   └── sharing/
├── shared/
│   ├── components/ui/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   └── test/
└── main.jsx
```

## Ownership

- Put application composition and global wiring in `app`.
- Put feature pages, feature-specific UI, adapters, hooks, persistence, and tests in the owning `modules/<name>` directory.
- Put pure rules and transformations in `domain`; production domain files must not import React, browser storage, or HTTP clients.
- Put integrations with the browser or network in `infrastructure`.
- Put code in `shared` only when at least two modules use it.

Dashboard implementations remain deliberately separate under `modules/dashboards/current`, `designer-v2`, and `legacy`. They preserve the existing `/dashboard`, `/dashboard-v2`, and `/dashboard-legacy` behavior.

Root `Dockerfile`, `docker-compose.yml`, and `nginx.conf` remain in their original locations to preserve established commands and deployment references.
