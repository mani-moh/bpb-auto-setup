// IPC channel definitions and type-safe wrappers

import type {
  IPCChannel,
  IPCResponse,
  Deployment,
  CloudflareAccount,
  EmailConfig,
  AppSettings,
  WorkflowState,
  DeploymentResult,
  HealthCheckResult,
  BPBPanelSettings,
} from './types';

export const IPC_CHANNELS = {
  // Database
  DB_DEPLOYMENTS_LIST: 'db:deployments:list' as const,
  DB_DEPLOYMENTS_GET: 'db:deployments:get' as const,
  DB_DEPLOYMENTS_CREATE: 'db:deployments:create' as const,
  DB_DEPLOYMENTS_UPDATE: 'db:deployments:update' as const,
  DB_DEPLOYMENTS_DELETE: 'db:deployments:delete' as const,
  DB_ACCOUNTS_LIST: 'db:accounts:list' as const,
  DB_ACCOUNTS_GET: 'db:accounts:get' as const,
  DB_ACCOUNTS_CREATE: 'db:accounts:create' as const,
  DB_ACCOUNTS_UPDATE: 'db:accounts:update' as const,
  DB_ACCOUNTS_DELETE: 'db:accounts:delete' as const,
  DB_EMAILS_LIST: 'db:emails:list' as const,
  DB_EMAILS_GET: 'db:emails:get' as const,
  DB_EMAILS_CREATE: 'db:emails:create' as const,
  DB_EMAILS_UPDATE: 'db:emails:update' as const,
  DB_EMAILS_DELETE: 'db:emails:delete' as const,
  DB_SETTINGS_GET: 'db:settings:get' as const,
  DB_SETTINGS_SET: 'db:settings:set' as const,

  // Credentials
  CREDENTIALS_GET: 'credentials:get' as const,
  CREDENTIALS_SET: 'credentials:set' as const,
  CREDENTIALS_DELETE: 'credentials:delete' as const,

  // Email
  EMAIL_GENERATE: 'email:generate' as const,
  EMAIL_PROVISION: 'email:provision' as const,
  EMAIL_VERIFY: 'email:verify' as const,

  // Cloudflare
  CF_VALIDATE_TOKEN: 'cloudflare:validate-token' as const,
  CF_LIST_ACCOUNTS: 'cloudflare:list-accounts' as const,
  CF_CREATE_ACCOUNT: 'cloudflare:create-account' as const,
  CF_START_SIGNUP: 'cloudflare:start-signup' as const,
  CF_CREATE_TOKEN_URL: 'cloudflare:create-token-url' as const,

  // Deployment
  DEPLOYMENT_START: 'deployment:start' as const,
  DEPLOYMENT_CANCEL: 'deployment:cancel' as const,
  DEPLOYMENT_STATUS: 'deployment:status' as const,

  // Panel
  PANEL_HEALTH_CHECK: 'panel:health-check' as const,
  PANEL_GET_CONFIG: 'panel:get-config' as const,
  PANEL_UPDATE_CONFIG: 'panel:update-config' as const,
  PANEL_DELETE: 'panel:delete' as const,

  // Browser
  BROWSER_OPEN: 'browser:open' as const,
  BROWSER_CLOSE: 'browser:close' as const,
  BROWSER_NAVIGATE: 'browser:navigate' as const,
  BROWSER_WAIT_FOR_ELEMENT: 'browser:wait-for-element' as const,

  // Workflow
  WORKFLOW_SAVE: 'workflow:save' as const,
  WORKFLOW_LOAD: 'workflow:load' as const,
  WORKFLOW_CLEAR: 'workflow:clear' as const,
} as const;

// Type-safe IPC response creators
export function createSuccessResponse<T>(data: T): IPCResponse<T> {
  return { success: true, data };
}

export function createErrorResponse(error: string): IPCResponse<never> {
  return { success: false, error };
}

// Renderer-side IPC invocation helpers
declare global {
  interface Window {
    ipc: {
      invoke: <T>(channel: IPCChannel, ...args: unknown[]) => Promise<IPCResponse<T>>;
      on: (channel: string, listener: (...args: unknown[]) => void) => void;
      off: (channel: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}