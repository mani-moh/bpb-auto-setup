# BPB Auto-Setup

A local-first desktop application that guides you through setting up a BPB Worker Panel (Cloudflare Workers proxy) with human-in-the-loop browser automation.

## Overview

This application automates the deployment of the [BPB Worker Panel](https://github.com/bia-pain-bache/BPB-Worker-Panel) to Cloudflare Workers/Pages. It handles email setup, Cloudflare authentication, and deployment — pausing correctly when CAPTCHA, OTP, or human verification is required.

## Key Features

- **Human-in-the-loop browser automation**: Visible Playwright browser for signup and verification
- **Local-first**: All data stored locally with better-sqlite3; credentials via OS keychain (keytar)
- **Modular providers**: Email manual, custom-domain, or API providers
- **Deployment tracking**: Save, update, and manage deployments from the dashboard
- **No bulk automation**: Designed for one user, one deployment at a time

## Installation

### Prerequisites

- Node.js 20+
- npm or pnpm
- Electron-build dependencies (Windows: Visual Studio Build Tools; macOS: Xcode CLI)

### Setup

```bash
# Clone
https://github.com/mani-moh/bpb-auto-setup.git
cd bpb-auto-setup

# Install dependencies
npm install

# Build Electron main
npm run build

# Start in development
npm run dev
```

In development, the app loads the Vite dev server (`http://localhost:5173`) inside Electron.

For production:

```bash
npm run build:vite
npm run build:electron
# Output in dist/
```

### First Run

1. Launch the app and open the dashboard.
2. Click **New Deployment** to start the setup wizard.
3. Generate or configure an email address.
4. Open the provider signup page in the visible browser and complete verification.
5. Confirm email access and proceed to Cloudflare auth.
6. Choose existing account (paste API token) or first-time registration (open signup page).
7. Configure deployment name and type.
8. Confirm deployment — the app creates KV namespace and deploys the worker.

## Architecture

- `electron/main.ts` — Electron entry, window creation, IPC setup
- `electron/ipc/` — Type-safe IPC for database, credentials, email, cloudflare, browser, deployment, panel
- `electron/services/` — Browser manager (Playwright), Cloudflare API, deployment engine, panel adapter, email provider
- `src/pages/` — React pages: Dashboard, SetupWizard, DeploymentDetail, Settings
- `shared/types.ts` — Shared TypeScript interfaces
- `database/schema.sql` — SQLite schema

## Security

- Credentials stored via OS-native `keytar` (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Database stored in user data directory; no secrets in source code or logs
- API tokens validated before use; least-privilege scoped tokens recommended
- Redacted logs; no telemetry unless explicitly enabled

## Manual Steps (Intentionally Not Automated)

Because of provider policies:

- **Email verification**: Complete in the visible browser; app detects user confirmation
- **CAPTCHA / OTP**: Must be solved by the user directly
- **Cloudflare account creation**: Signup form is pre-filled but consent and email verification must be completed manually
- **API token creation**: After logging in, the user creates the token with required permissions; the app opens the token page to guide
- **Cloudflare region restrictions**: If signup is unavailable in your region, the workflow stops with an explanation

## Testing

```bash
npm test
```

Tests cover database operations, credential utilities, and deployment logic. Browser automation and full E2E flows require manual verification due to CAPTCHA/OTP.

## Troubleshooting

| Issue | Resolution |
|---|---|
| Browser not launching | Ensure Playwright browsers installed (`npx playwright install chromium`) |
| Token validation fails | Verify token has Workers Scripts Edit, KV Storage Edit, Pages Edit, DNS Edit, User Details Read |
| Deployment fails (name taken) | Choose a different worker/project name |
| Email provider page not loading | Check network and that the visible browser is not blocked by pop-up settings |
| Health check shows unhealthy | Wait 30–60 seconds after deployment; verify panel URL opens in browser |

## Unimplemented / Known Limitations

- Full IMAP-based email verification polling (manual confirmation used)
- Bulk deployment or account creation (explicitly out of scope)
- Automatic Cloudflare token creation with all permissions (user must create token)
- Pre-release BPB version selection in UI (supported via checkbox)
- Subdomain creation for Pages (uses default subdomain from project creation)

## License

MIT — see upstream BPB Worker Panel license for panel code reuse terms.
