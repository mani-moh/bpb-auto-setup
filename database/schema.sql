-- Database schema for BPB Auto-Setup
-- Version: 1

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('workers', 'pages')),
  worker_name TEXT NOT NULL,
  worker_url TEXT NOT NULL,
  panel_url TEXT NOT NULL,
  secure_path TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'error', 'deploying')) DEFAULT 'deploying',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  health_checked_at INTEGER,
  health_status TEXT CHECK (health_status IN ('healthy', 'unhealthy', 'unknown')),
  kv_namespace_id TEXT NOT NULL,
  management_key TEXT NOT NULL -- encrypted
);

-- Cloudflare accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  token_ref TEXT NOT NULL, -- reference to keytar
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);

-- Email configurations table
CREATE TABLE IF NOT EXISTS email_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('manual', 'custom-domain', 'api')),
  email TEXT NOT NULL UNIQUE,
  password_ref TEXT, -- reference to keytar
  domain TEXT,
  api_config TEXT, -- JSON string, encrypted
  created_at INTEGER NOT NULL,
  verified_at INTEGER
);

-- Application settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Workflow state table (for resume capability)
CREATE TABLE IF NOT EXISTS workflow_state (
  id TEXT PRIMARY KEY,
  step TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON string
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deployments_account ON deployments(account_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_email_configs_email ON email_configs(email);