# APS Demos

A demo application built on [Autodesk Platform Services (APS)](https://aps.autodesk.com/) that lets you upload, translate, and preview 3D designs and 2D drawings, based on the [Simple Viewer tutorial](https://get-started.aps.autodesk.com/tutorials/simple-viewer/).

It goes beyond the stock tutorial with:

- A passphrase-gated login screen (session-based) in front of the whole app
- A **Manage** page for listing, uploading, and deleting drawings, separate from the viewer itself
- Custom viewer extensions ([`LoggerExtension`](client/src/extensions/LoggerExtension.ts), [`SummaryExtension`](client/src/extensions/SummaryExtension.ts)) built on top of the tutorial's `BaseExtension` pattern
- A React + Vite + Tailwind (shadcn/ui) client instead of static HTML/CSS/JS
- Retry/caching logic around the APS SDK calls, built with [Effect](https://effect.website)

## Prerequisites

- [Node.js](https://nodejs.org/) 22.x (matches CI; see `.github/workflows/main_apsdemos.yml`)
- An APS application with a Client ID and Client Secret — see [Getting Started](https://get-started.aps.autodesk.com/) if you don't have one yet

## Environment variables

Copy `.env.example` to `.env` in the project root and fill in the required values:

| Variable | Required | Description |
| --- | --- | --- |
| `APS_CLIENT_ID` | Yes | Your APS app's Client ID |
| `APS_CLIENT_SECRET` | Yes | Your APS app's Client Secret |
| `LOGIN_PASSPHRASE` | Yes | Shared passphrase used to gate access to the app (see `src/routes/session.js`) |
| `APS_BUCKET` | No | OSS bucket used to store drawings. Defaults to `${APS_CLIENT_ID}-basic-app` |
| `PORT` | No | Port the server listens on. Defaults to `8080` |
| `SESSION_SECRET` | No | Secret used to sign session cookies. A random one is generated per process start if unset (sessions won't survive a restart) |
| `APS_WEBHOOK_CALLBACK_BASE_URL` | No | This app's own public HTTPS base URL. If set together with `APS_WEBHOOK_SECRET`, the server registers a Model Derivative webhook on startup so translation completion is detected immediately instead of relying purely on polling |
| `APS_WEBHOOK_SECRET` | No | Secret used to sign/verify webhook callbacks. Required if `APS_WEBHOOK_CALLBACK_BASE_URL` is set |

See `src/config.ts` for how these are read and validated.

## Getting started

Install dependencies for both the server and the client:

```sh
npm install
npm run build:client
```

### Development

Run the server and the Vite dev server (with hot reload) in two terminals:

```sh
npm run dev         # backend on http://localhost:8080
npm run dev:client  # Vite dev server, proxies /api to the backend
```

Open the URL printed by `dev:client` in your browser.

### Production build & run

```sh
npm run build
npm start
```

This builds the client into `src/wwwroot`, compiles the server to `dist/`, and serves everything from a single process on `PORT` (default `8080`).

## Testing

```sh
npm test        # run once
npm run test:watch
```

## Other scripts

- `npm run typecheck` — type-check the server without emitting output
- `npm run build:server` — compile the server only
