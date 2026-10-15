import { contextBridge, ipcRenderer } from 'electron';
import type { IPCResponse, Deployment, CloudflareAccount, EmailConfig, AppSettings, WorkflowState } from '../shared/types';

// Type-safe IPC API for renderer
const ipc = {
  invoke: <T>(channel: string, ...args: unknown[]): Promise<IPCResponse<T>> => {
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, listener: (...args: unknown[]) => void): void => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },
  off: (channel: string, listener: (...args: unknown[]) => void): void => {
    ipcRenderer.removeListener(channel, listener);
  },
};

// Database API
const db = {
  deployments: {
    list: () => ipc.invoke<Deployment[]>('db:deployments:list'),
    get: (id: string) => ipc.invoke<Deployment | null>('db:deployments:get', id),
    create: (deployment: Deployment) => ipc.invoke<Deployment>('db:deployments:create', deployment),
    update: (deployment: Deployment) => ipc.invoke<Deployment>('db:deployments:update', deployment),
    delete: (id: string) => ipc.invoke<void>('db:deployments:delete', id),
  },
  accounts: {
    list: () => ipc.invoke<CloudflareAccount[]>('db:accounts:list'),
    get: (id: string) => ipc.invoke<CloudflareAccount | null>('db:accounts:get', id),
    create: (account: CloudflareAccount) => ipc.invoke<CloudflareAccount>('db:accounts:create', account),
    update: (account: CloudflareAccount) => ipc.invoke<CloudflareAccount>('db:accounts:update', account),
    delete: (id: string) => ipc.invoke<void>('db:accounts:delete', id),
  },
  emails: {
    list: () => ipc.invoke<EmailConfig[]>('db:emails:list'),
    get: (id: string) => ipc.invoke<EmailConfig | null>('db:emails:get', id),
    create: (email: EmailConfig) => ipc.invoke<EmailConfig>('db:emails:create', email),
    update: (email: EmailConfig) => ipc.invoke<EmailConfig>('db:emails:update', email),
    delete: (id: string) => ipc.invoke<void>('db:emails:delete', id),
  },
  settings: {
    get: (key: string) => ipc.invoke<string | null>('db:settings:get', key),
    set: (key: string, value: string) => ipc.invoke<void>('db:settings:set', key, value),
  },
  workflow: {
    save: (state: WorkflowState) => ipc.invoke<void>('workflow:save', state),
    load: (id: string) => ipc.invoke<WorkflowState | null>('workflow:load', id),
    clear: (id: string) => ipc.invoke<void>('workflow:clear', id),
  },
};

// Credentials API
const credentials = {
  set: (account: string, password: string) => ipc.invoke<void>('credentials:set', account, password),
  get: (account: string) => ipc.invoke<string | null>('credentials:get', account),
  delete: (account: string) => ipc.invoke<boolean>('credentials:delete', account),
  generateKey: (prefix: string, identifier: string) => ipc.invoke<string>('credentials:generate-key', prefix, identifier),
};

// Email API
const email = {
  providers: () => ipc.invoke('email:providers'),
  generate: (prefix?: string) => ipc.invoke<{ localPart: string; password: string }>('email:generate', prefix),
  provision: (providerId: string, email: string, password: string, domain?: string) =>
    ipc.invoke('email:provision', providerId, email, password, domain),
  verify: (email: string) => ipc.invoke<{ verified: boolean }>('email:verify', email),
  providerUrl: (providerId: string) => ipc.invoke<string>('email:provider-url', providerId),
};

// Cloudflare API
const cloudflare = {
  validateToken: (token: string) => ipc.invoke('cloudflare:validate-token', token),
  listAccounts: (token: string) => ipc.invoke('cloudflare:list-accounts', token),
  createAccount: (token: string, name: string) => ipc.invoke('cloudflare:create-account', token, name),
  createTokenUrl: (accountId?: string) => ipc.invoke<string>('cloudflare:create-token-url', accountId),
  startSignup: (email: string) => ipc.invoke('cloudflare:start-signup', email),
};

// Deployment API
const deployment = {
  start: (params: {
    token: string;
    accountId: string;
    accountEmail: string;
    workerName: string;
    deployType: 'workers' | 'pages';
    preRelease?: boolean;
  }) => ipc.invoke('deployment:start', params),
  version: () => ipc.invoke<string>('deployment:version'),
};

// Panel API
const panel = {
  healthCheck: (panelUrl: string, managementKey: string) => ipc.invoke('panel:health-check', panelUrl, managementKey),
  getConfig: (panelUrl: string, managementKey: string) => ipc.invoke('panel:get-config', panelUrl, managementKey),
  updateConfig: (panelUrl: string, managementKey: string, config: any) => ipc.invoke('panel:update-config', panelUrl, managementKey, config),
  delete: (panelUrl: string, managementKey: string) => ipc.invoke('panel:delete', panelUrl, managementKey),
  getSubscriptions: (panelUrl: string, managementKey: string) => ipc.invoke('panel:get-subscriptions', panelUrl, managementKey),
  generateSubscription: (panelUrl: string, managementKey: string, type: string) => ipc.invoke('panel:generate-subscription', panelUrl, managementKey, type),
  exportConfig: (panelUrl: string, managementKey: string) => ipc.invoke<string>('panel:export-config', panelUrl, managementKey),
  importConfig: (panelUrl: string, managementKey: string, configJson: string) => ipc.invoke('panel:import-config', panelUrl, managementKey, configJson),
  managementUrl: (panelUrl: string, managementKey: string) => ipc.invoke<string>('panel:management-url', panelUrl, managementKey),
};

// Browser API
const browser = {
  open: (headless?: boolean, slowMo?: number) => ipc.invoke('browser:open', headless, slowMo),
  close: () => ipc.invoke('browser:close'),
  navigate: (url: string) => ipc.invoke('browser:navigate', url),
  waitForElement: (selector: string, timeout?: number) => ipc.invoke('browser:wait-for-element', selector, timeout),
  cloudflare: {
    gotoSignup: (email: string) => ipc.invoke('browser:cloudflare:goto-signup', email),
    gotoLogin: () => ipc.invoke('browser:cloudflare:goto-login'),
    gotoToken: () => ipc.invoke('browser:cloudflare:goto-token'),
    fillSignup: (email: string, password: string) => ipc.invoke('browser:cloudflare:fill-signup', email, password),
    submitSignup: () => ipc.invoke('browser:cloudflare:submit-signup'),
    waitVerification: () => ipc.invoke<boolean>('browser:cloudflare:wait-verification'),
    waitDashboard: () => ipc.invoke<boolean>('browser:cloudflare:wait-dashboard'),
    detectCaptcha: () => ipc.invoke<boolean>('browser:cloudflare:detect-captcha'),
  },
  email: {
    gotoSignup: (url: string) => ipc.invoke('browser:email:goto-signup', url),
    detectCaptcha: () => ipc.invoke<boolean>('browser:email:detect-captcha'),
  },
  screenshot: (path: string) => ipc.invoke('browser:screenshot', path),
  isRunning: () => ipc.invoke<boolean>('browser:is-running'),
};

// Expose to renderer
contextBridge.exposeInMainWorld('api', {
  db,
  credentials,
  email,
  cloudflare,
  deployment,
  panel,
  browser,
});

declare global {
  interface Window {
    api: typeof ipc;
  }
}