# BPB Auto-Setup — Architecture Specification

## Overview

A local-first desktop application that automates the deployment of BPB Worker Panel to Cloudflare Workers/Pages with human-in-the-loop browser automation for account creation and verification steps.

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Desktop Shell**: Electron 28+
- **Browser Automation**: Playwright (visible, non-headless)
- **Local Database**: better-sqlite3
- **Credential Storage**: keytar (OS keychain/credential manager)
- **Cloudflare API**: Direct REST calls (no Go dependency)
- **IPC**: Electron contextBridge + ipcRenderer/ipcMain
- **Styling**: Tailwind CSS
- **State Management**: React Context + useReducer

## Project Structure

```
panel/
├── electron/                 # Electron main process
│   ├── main.ts              # Entry point
│   ├── ipc/                 # IPC handlers
│   │   ├── database.ts
│   │   ├── credentials.ts
│   │   ├── email.ts
│   │   ├── cloudflare.ts
│   │   ├── deployment.ts
│   │   └── panel.ts
│   ├── services/            # Background services
│   │   ├── browser.ts       # Playwright manager
│   │   └── deployment.ts    # Deployment orchestrator
│   └── utils/
│       ├── crypto.ts        # Encryption utilities
│       └── logger.ts        # Structured logging
├── src/                      # React renderer process
│   ├── components/          # UI components
│   │   ├── setup/           # Setup wizard steps
│   │   ├── dashboard/       # Deployment dashboard
│   │   ├── settings/        # Settings panels
│   │   └── common/          # Shared components
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React contexts
│   ├── pages/               # Page components
│   ├── services/            # Renderer-side services
│   ├── types/               # TypeScript types
│   ├── utils/               # Utilities
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── shared/                   # Shared types between main/renderer
│   ├── types.ts
│   └── ipc.ts
├── database/                 # Database schema and migrations
│   ├── schema.sql
│   └── migrations/
├── tests/                    # Test files
├── package.json
├── tsconfig.json
├── vite.config.ts
├── electron-builder.json
└── README.md
```

## Core Modules

### 1. Database Layer (`electron/services/database.ts`)

**Schema:**
- `deployments` - Worker/Pages deployments metadata
- `accounts` - Cloudflare account info (encrypted tokens)
- `email_configs` - Email provider configurations
- `settings` - Application settings
- `workflow_state` - In-progress workflow state for resume

### 2. Credential Store (`electron/services/credentials.ts`)

- Uses `keytar` for OS-native credential storage
- Stores: Cloudflare API tokens, email passwords, panel passwords
- Encryption at rest for database-stored secrets

### 3. Email Provider Module (`electron/services/email/`)

**Providers:**
- `ManualProvider` - Opens browser for manual signup (fallback)
- `CustomDomainProvider` - Catch-all/alias for user-owned domains
- `APIProvider` - Generic interface for providers with APIs (Mailgun, Hostinger, etc.)

**Workflow:**
1. Generate email local-part + strong password
2. User selects provider or manual
3. For API providers: create mailbox via API
4. For manual: open signup page, prefill forms, pause for CAPTCHA/OTP
5. User completes verification in browser
6. App detects verification completion (polling IMAP or user confirmation)
7. Store email credentials securely

### 4. Cloudflare Auth Module (`electron/services/cloudflare/`)

**Mode A: Existing Account**
- User provides API token (scoped permissions)
- Validate token via `/user/tokens/verify`
- List accounts via `/accounts`
- User selects account

**Mode B: First-Time Registration**
- Open Cloudflare signup page in visible browser
- Prefill email from email module
- Pause for CAPTCHA, email verification, consent
- User completes manually
- Detect successful login via session/cookies
- Guide user to create API token with required permissions
- Store token securely

**Required Token Permissions:**
- Workers Scripts: Edit
- Workers KV Storage: Edit
- Pages: Edit
- DNS: Edit (for custom domains)
- User Details: Read

### 5. Deployment Engine (`electron/services/deployment/`)

**Steps:**
1. Validate Cloudflare account and permissions
2. Fetch latest BPB Worker Panel release (worker.js)
3. Generate secure settings (UUID, passwords, secure path)
4. Create KV namespace
5. Deploy to Workers or Pages
6. Enable subdomain
7. Return panel URL + management credentials
8. Save deployment record locally

**Deployment Types:**
- Workers: `https://{name}.{subdomain}.workers.dev/{securePath}/panel`
- Pages: `https://{name}.pages.dev/{securePath}/panel`

### 6. Panel Adapter (`electron/services/panel/`)

- Interfaces with deployed panel via its API
- Actions: get status, update config, export subscription, delete panel
- Uses encrypted management key from deployment

### 7. Browser Automation (`electron/services/browser.ts`)

- Playwright persistent context (preserves cookies/session)
- Visible browser window
- Page object models for:
  - Cloudflare signup/login
  - Email provider signup
  - API token creation
- Event-driven pause/resume for human steps
- Screenshot capture for debugging

### 8. React UI (`src/`)

**Pages:**
- `SetupWizard` - Multi-step setup flow
- `Dashboard` - Deployment list with actions
- `Settings` - Email, browser, storage, logs
- `DeploymentDetail` - Panel management

**Components:**
- `WorkflowStep` - Current step with progress
- `BrowserAction` - "Action required in browser" banner
- `DeploymentCard` - Deployment summary + actions
- `CredentialInput` - Secure input with reveal toggle

## Security Model

1. **No secrets in code/logs** - All secrets via keytar or encrypted DB
2. **Least privilege tokens** - Scoped API tokens only
3. **Encrypted database** - SQLCipher or application-level encryption for sensitive fields
4. **Local-only** - No telemetry, no external connections except Cloudflare/email providers
5. **Secure deletion** - Wipe credentials on deployment removal

## Workflow State Machine

```
IDLE
  └─> EMAIL_SETUP (generate/choose email)
       ├─> EMAIL_PROVISIONING (API or browser)
       │    └─> EMAIL_VERIFICATION (pause for human)
       └─> CLOUDFLARE_AUTH
            ├─> EXISTING_ACCOUNT (token input + validation)
            └─> NEW_REGISTRATION (browser signup + token creation)
                 └─> DEPLOYMENT_CONFIG (name, type, version)
                      └─> DEPLOYING (KV, Worker/Pages, subdomain)
                           └─> COMPLETE (save record, show URL)
```

## Error Handling

- Structured error codes for each module
- User-facing messages with recovery suggestions
- Automatic retry for transient failures (network, rate limits)
- Manual retry for human-required steps
- Rollback on deployment failure (delete partial resources)

## Testing Strategy

- Unit tests for pure functions (crypto, validation, parsing)
- Integration tests for database operations
- Mock Cloudflare API for deployment tests
- Playwright tests for browser automation flows
- E2E test for complete workflow (manual verification steps skipped)

## Known Limitations

1. **Cloudflare account creation via API** requires existing account (7+ days, Super Admin)
2. **Email providers with APIs** typically require paid plans or domain ownership
3. **CAPTCHA/OTP** must be completed manually - no automation
4. **BPB Wizard** requires `LAUNCHED_BY_SCRIPT=1` env - we replicate its logic directly
5. **Workers.dev subdomain** creation may fail if account already has one