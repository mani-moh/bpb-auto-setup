// Renderer-side types matching shared types

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
  managementKey: string;
}

export interface CloudflareAccount {
  id: string;
  email: string;
  name?: string;
  tokenId?: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface EmailConfig {
  id: string;
  provider: 'manual' | 'custom-domain' | 'api';
  email: string;
  passwordRef?: string;
  domain?: string;
  apiConfig?: Record<string, string>;
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

export interface EmailProvider {
  id: string;
  name: string;
  description: string;
  supportsApi: boolean;
  requiresDomain: boolean;
}

export interface DeploymentProgress {
  step: string;
  message: string;
  progress: number;
}

export interface PanelConfig {
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

export interface SubscriptionLink {
  type: 'xray' | 'sing-box' | 'clash' | 'amnezia' | 'wireguard';
  url: string;
  qrCode?: string;
}