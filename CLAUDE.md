# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeCross-WebApp is a Vue 2 cross-chain management platform for [WeCross](https://github.com/WeBankBlockchain/WeCross). It provides a visual dashboard for managing cross-chain routers, accounts, resources, transactions, and XA (distributed) transactions across heterogeneous blockchains (FISCO BCOS, Fabric, etc.).

The UI is in Chinese (中文). All user-facing text, error messages, and intro.js guides are in Chinese.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server on port 9528 (proxies API to http://175.178.222.73:8250/)
npm run build:prod   # Production build → dist/
npm run lint         # ESLint for src/ (*.js, *.vue)
npm run test:unit    # Run Jest unit tests (clears cache first)
npm run test:ci      # Lint + unit tests (CI gate)
npm run new          # Plop scaffolding: generate view/component/store
```

## Architecture

**Stack:** Vue 2.6 + Vuex 3 + Vue Router 3 + Element UI 2.13 + Axios + ECharts 4 + Sass

**Path alias:** `@` → `src/` (configured in vue.config.js)

### Routing & Permission

Two-tier route system (`src/router/index.js`):
- **constantRoutes** — always available (login, register, 404, homepage)
- **asyncRoutes** — filtered by role (`admin`/`user`) via `src/store/modules/permission.js` using `meta.roles`

`src/permission.js` implements the navigation guard: token check → role fetch → dynamic route injection via `router.addRoutes()`. Unauthenticated users are redirected to `/login`.

### Vuex Store (`src/store/`)

Four namespaced modules:
- **app** — sidebar state, device type
- **user** — token, username, roles, login/logout actions (RSA-encrypts credentials before sending)
- **permission** — dynamic route generation based on user roles
- **transaction** — XA transaction lifecycle (start/commit/rollback), persisted to localStorage

### API Layer (`src/api/`)

All API calls go through `src/utils/request.js` (Axios instance with interceptors):
- Request interceptor: injects `Authorization` header from cookie token
- Response interceptor: handles 401 (re-login prompt), error codes (10502/50012/50014 = session invalid), timeouts
- Base URL: `VUE_APP_BASE_API` (empty in dev, `/` in prod); dev server proxies to backend at `175.178.222.73:8250`

API modules mirror backend REST endpoints:
- `user.js` → `/auth/*` (login, logout, register, changePassword, authCode, pub)
- `ua.js` → `/auth/*` (listAccount, addChainAccount, removeChainAccount, accessControlList)
- `conn.js` → `/conn/*` (listPeers, addPeer, removePeer, listChains, listZones)
- `resource.js` → `/sys/listResources`, `resource/<path>/detail`, `resource/<path>/customCommand`
- `transaction.js` → `/xa/*`, `/trans/*`, `resource/<path>/call`, `resource/<path>/sendTransaction`
- `status.js` → `/sys/*` (systemStatus, supportedStubs, routerStatus)

Resource paths use dotted notation (e.g., `zone.chain.resource`) converted to URL segments via `path2Url()` in `src/utils/index.js`.

### Auth & Crypto

- Login credentials are RSA-encrypted client-side (`src/utils/rsa.js` using jsencrypt) before POSTing
- Token stored in localStorage (`wecross-token`) and set as `Authorization` header
- Public key fetched from `/auth/pub` and cached in localStorage (`wecross-pub`)
- SM3 hash support via `src/utils/sm3.js` (sm-crypto lib) for national crypto chains

### Layout

`src/layout/` — Sidebar + Navbar + AppMain shell, with intro.js guided tours per page. Sidebar menu items are auto-generated from asyncRoutes with `meta.title`/`meta.icon`.

### Key View Pages

| Route | View | Function |
|-------|------|----------|
| `/home` | `homepage/index` | Dashboard with network stats |
| `/account/index` | `account/index` | Chain account management |
| `/router/routerManager` | `router/routerManager` | Cross-chain router management |
| `/resource/resourceList` | `resource/resourceManager` | Data asset registry |
| `/resource/resourceDeployment` | `resource/resourceDeployment` | Asset deployment (BCOS deploy/register, Fabric install/instantiate/upgrade) |
| `/transaction/transactionList` | `transaction/transactionManager` | Shared audit log |
| `/transaction/rawTransaction` | `transaction/rawTransaction` | Initiate sharing |
| `/xaTransaction/xaTransactionList` | `transaction/xaTransactionList` | Cross-domain coordination list |
| `/xaTransaction/xaTransaction` | `transaction/xaTransaction` | Initiate coordination |
| `/admin/index` | `access/index` | Access control (admin only) |

### Reusable Components (`src/components/`)

- **ChainExplorer** — blockchain data visualization (vue-vis-network)
- **ResourceShower** — resource detail display
- **ResourceExplorer** / **ResourceTransfer** — resource browsing and transfer
- **TransactionListExplorer** — transaction list with pagination
- **SvgIcon** — SVG sprite icon system (`src/icons/svg/`)

### Scaffolding

`npm run new` uses Plop with templates in `plop-templates/` to generate:
- **view** — page component + route entry
- **component** — reusable component
- **store** — Vuex module

### Mock Server

`mock/` contains MockJS-based mock data and server (currently disabled in vue.config.js — `before: require('./mock/mock-server.js')` is commented out).

## Code Style

ESLint config (`.eslintrc.js`): `plugin:vue/recommended` + `eslint:recommended`
- 2-space indent, single quotes, no semicolons
- `prefer-const`, `eqeqeq` (strict equality), `no-console: off`
- Vue component names: PascalCase
- No space before function parens, always space before blocks

Pre-commit hook: lint-staged runs `eslint --fix` on `src/**/*.{js,vue}`

## Testing

Jest + Vue Test Utils. Test files in `tests/unit/` matching `*.spec.js`. Path alias `@` mapped to `src/`. Coverage collected from `src/components/` and `src/unit/`.
