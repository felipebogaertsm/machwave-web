# machwave-web

Static Next.js 15 frontend for the machwave simulation platform.

## Architecture

```
Browser (static site on GCS)
  └─ Firebase Auth  (client-side)
       └─ machwave-api  (Cloud Run)  ← NEXT_PUBLIC_API_URL
```

The app is a fully static export (`output: "export"`) served from GCS. Authentication is handled entirely client-side by the Firebase SDK. Every API call attaches a Firebase ID token as a Bearer header via an Axios interceptor.

## Main components

| Path | Purpose |
|---|---|
| `src/lib/firebase.ts` | Firebase app init |
| `src/lib/auth.ts` | AuthContext + `useAuth` hook |
| `src/lib/api.ts` | Axios client with token interceptor + typed API calls |
| `src/components/motor-wizard/` | Multi-step motor configuration form |
| `src/components/simulation/` | Status poller + results chart |
| `src/app/dashboard/` | Motor and simulation list |
| `src/app/motors/[id]/` | Motor detail + trigger simulation |
| `src/app/simulations/[id]/` | Live status + results view |

## Local development

```bash
cp .env.example .env.local
# fill in Firebase values; NEXT_PUBLIC_API_URL defaults to http://localhost:8000
make up
```

Web is available at `http://localhost:3000`. Requires machwave-api running locally (see [machwave-api](../machwave-api)).

For a combined local environment, run both services:

```bash
# terminal 1 — API
cd ../machwave-api && make up

# terminal 2 — web
make up
```

## Deployment

Deploy is triggered by creating a GitHub release. The workflow:

1. Runs lint + type-check + build
2. Authenticates to GCP
3. Syncs `out/` to GCS with `gsutil -m rsync`
4. Sets cache headers (no-cache for HTML, 1 year immutable for `_next/static/`)

Required GitHub secrets: `GCP_SA_KEY`, `GCS_WEB_BUCKET_NAME`, all `NEXT_PUBLIC_FIREBASE_*` vars, `NEXT_PUBLIC_API_URL`.

GCS bucket setup: enable static website hosting, set `index.html` as main page and `404.html` as error page, grant `allUsers:objectViewer`.

## Commands

```bash
make install     # npm ci
make dev         # next dev
make build       # next build (outputs to out/)
make lint        # eslint
make type-check  # tsc --noEmit
make up          # docker compose up --build
make down        # docker compose down
make clean       # rm -rf out/ .next/
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_API_URL` | machwave-api base URL |
