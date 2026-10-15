// Shared types between main and renderer processes

export interface Deployment {
  id: string;
  name: string;
  accountId: string;
  accountEmail: string;
  type: 'workers' | 'pages';
  workerName: string;
  workerUrl: string;
  panelUrl: string;
  securePath: string;
  version: string;
  status: 'active' | 'inactive' | 'error' | 'deploying';
  createdAt: number;
  updatedAt: number;
  healthCheckedAt?: number;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  kvNamespaceId: string;
  managementKey: string; // encrypted
}

export interface CloudflareAccount {
  id: string;
  email: string;
  name?: string;
  tokenId?: string; // reference to keytar
  createdAt: number;
  lastUsedAt: number;
}

export interface EmailConfig {
  id: string;
  provider: 'manual' | 'custom-domain' | 'api';
  email: string;
  passwordRef?: string; // reference to keytar
  domain?: string;
  apiConfig?: Record<string, string>; // provider-specific config (encrypted)
  createdAt: number;
  verifiedAt?: number;
}

export interface AppSettings {
  dataDirectory: string;
  browserHeadless: boolean;
  browserSlowMo: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  telemetryEnabled: boolean;
  autoCheckUpdates: boolean;
}

export interface WorkflowState {
  id: string;
  step: WorkflowStep;
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type WorkflowStep =
  | 'idle'
  | 'email_setup'
  | 'email_provisioning'
  | 'email_verification'
  | 'cloudflare_auth_select'
  | 'cloudflare_existing_token'
  | 'cloudflare_new_signup'
  | 'cloudflare_token_creation'
  | 'deployment_config'
  | 'deploying_kv'
  | 'deploying_worker'
  | 'deploying_pages'
  | 'enabling_subdomain'
  | 'complete'
  | 'error';

export interface CloudflareTokenPermissions {
  workers_scripts: 'edit' | 'read';
  workers_kv_storage: 'edit' | 'read';
  page: 'edit' | 'read';
  dns: 'edit' | 'read';
  user_details: 'read';
}

export interface BPBPanelSettings {
  vlUUID: string;
  trPass: string;
  securePath: string;
  proxyIpMode: string;
  proxyIPs: string[];
  prefixes: string[];
  fallback: string;
  dohUrl: string;
  mainDomain: string;
}

export interface DeploymentResult {
  success: boolean;
  panelUrl?: string;
  managementKey?: string;
  error?: string;
  deployment?: Deployment;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  error?: string;
  checkedAt: number;
}

export type IPCChannel =
  | 'db:deployments:list'
  | 'db:deployments:get'
  | 'db:deployments:create'
  | 'db:deployments:update'
  | 'db:deployments:delete'
  | 'db:accounts:list'
  | 'db:accounts:get'
  | 'db:accounts:create'
  | 'db:accounts:update'
  | 'db:accounts:delete'
  | 'db:emails:list'
  | 'db:emails:get'
  | 'db:emails:create'
  | 'db:emails:update'
  | 'db:emails:delete'
  | 'db:settings:get'
  | 'db:settings:set'
  | 'credentials:get'
  | 'credentials:set'
  | 'credentials:delete'
  | 'email:generate'
  | 'email:provision'
  | 'email:verify'
  | 'cloudflare:validate-token'
  | 'cloudflare:list-accounts'
  | 'cloudflare:create-account'
  | 'cloudflare:start-signup'
  | 'cloudflare:create-token-url'
  | 'deployment:start'
  | 'deployment:cancel'
  | 'deployment:status'
  | 'panel:health-check'
  | 'panel:get-config'
  | 'panel:update-config'
  | 'panel:delete'
  | 'browser:open'
  | 'browser:close'
  | 'browser:navigate'
  | 'browser:wait-for-element'
  | 'workflow:save'
  | 'workflow:load'
  | 'workflow:clear';

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'fill' | 'wait' | 'screenshot';
  url?: string;
  selector?: string;
  value?: string;
  timeout?: number;
}