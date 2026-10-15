import { CloudflareAPI, buildTokenUrl, generateIdempotencyKey } from './cloudflare';
import { randomUUID } from 'crypto';
import { generateSecurePassword } from '../utils/credentials';

export interface BPBWorkerSettings {
  vlUUID: string;
  trPass: string;
  securePath: string;
  proxyIpMode: string;
  proxyIPs: string[];
  prefixes: string[];
  fallback: string;
  dohUrl: string;
  mainDomain: string;
  accID: string;
  accEmail: string;
  apiToken: string;
}

export function generateBPBSettings(
  accountId: string,
  accountEmail: string,
  apiToken: string,
  workerName: string,
  subdomain: string
): BPBWorkerSettings {
  const pathCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const passCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@$&*_-+;:,.';

  const randomCode = generateSecurePassword(16);
  const securePath = generateRandomString(pathCharset, 12, 16);
  const vlUUID = randomUUID();
  const trPass = generateRandomString(passCharset, 16, 20);

  return {
    accID: accountId,
    accEmail: accountEmail,
    apiToken: apiToken,
    vlUUID,
    trPass,
    securePath,
    proxyIpMode: 'proxyip',
    proxyIPs: [],
    prefixes: [],
    fallback: '',
    dohUrl: '',
    mainDomain: `${workerName}.${subdomain}`,
  };
}

function generateRandomString(charset: string, minLen: number, maxLen: number): string {
  const length = Math.floor(Math.random() * (maxLen - minLen + 1)) + minLen;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => charset[byte % charset.length]).join('');
}

export async function fetchLatestBPBWorkerScript(preRelease: boolean = false): Promise<string> {
  let url: string;
  if (preRelease) {
    const res = await fetch('https://raw.githubusercontent.com/bia-pain-bache/BPB-Worker-Panel/refs/heads/dev/package.json');
    if (!res.ok) {
      throw new Error(`Failed to get pre-release version: ${res.status}`);
    }
    const { version } = await res.json() as { version: string };
    url = `https://github.com/bia-pain-bache/BPB-Worker-Panel/releases/download/v${version}/worker.js`;
  } else {
    url = 'https://github.com/bia-pain-bache/BPB-Worker-Panel/releases/latest/download/worker.js';
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download worker script: ${res.status} at ${res.url}`);
  }

  return res.text();
}

export function buildWorkerScript(settings: BPBWorkerSettings, script: string): string {
  const buildTimestamp = new Date().toISOString();
  const randomCode = generateSecurePassword(16);

  const embeddedSettings = {
    accID: settings.accID,
    accEmail: settings.accEmail,
    apiToken: settings.apiToken,
    vlUUID: settings.vlUUID,
    trPass: settings.trPass,
    securePath: settings.securePath,
    proxyIpMode: settings.proxyIpMode,
    proxyIPs: settings.proxyIPs,
    prefixes: settings.prefixes,
    fallback: settings.fallback,
    dohUrl: settings.dohUrl,
    mainDomain: settings.mainDomain,
  };

  return [
    `// ${settings.accEmail}`,
    `// Build: ${buildTimestamp}`,
    '// @ts-nocheck',
    `${randomCode}const EMBEDED_SETTINGS = ${JSON.stringify(embeddedSettings)};${script}`
  ].join('\n');
}

export interface DeploymentProgress {
  step: string;
  message: string;
  progress: number; // 0-100
}

export type DeploymentProgressCallback = (progress: DeploymentProgress) => void;

export async function deployBPBPanel(
  token: string,
  accountId: string,
  accountEmail: string,
  workerName: string,
  deployType: 'workers' | 'pages',
  preRelease: boolean = false,
  onProgress?: DeploymentProgressCallback
): Promise<{ panelUrl: string; managementKey: string; kvNamespaceId: string; securePath: string }> {
  const api = new CloudflareAPI(token);
  api.setAccountId(accountId);

  const reportProgress = (step: string, message: string, progress: number) => {
    onProgress?.({ step, message, progress });
  };

  // Step 1: Fetch worker script
  reportProgress('fetch_script', 'Fetching latest BPB Worker Panel script...', 5);
  const script = await fetchLatestBPBWorkerScript(preRelease);

  // Step 2: Check/create workers.dev subdomain
  let subdomain: string;
  reportProgress('subdomain', 'Checking workers.dev subdomain...', 10);
  try {
    const subdomainResult = await api.getWorkersSubdomain(accountId);
    subdomain = subdomainResult.subdomain;
    reportProgress('subdomain', 'Workers subdomain found', 15);
  } catch {
    // Create new subdomain
    reportProgress('subdomain', 'Creating workers.dev subdomain...', 15);
    const randSub = generateRandomString('abcdefghijklmnopqrstuvwxyz0123456789', 8, 12);
    const subdomainResult = await api.createWorkersSubdomain(accountId, randSub);
    subdomain = subdomainResult.subdomain;
    reportProgress('subdomain', 'Workers subdomain created', 20);
  }

  // Step 3: Check if worker name is taken
  reportProgress('check_name', 'Checking worker name availability...', 20);
  const nameTaken = deployType === 'pages'
    ? await api.checkPagesNameTaken(accountId, workerName)
    : await api.checkWorkerNameTaken(accountId, workerName);
  if (nameTaken) {
    throw new Error(`Worker name "${workerName}" is already taken`);
  }

  // Step 4: Create KV namespace
  reportProgress('kv_namespace', 'Creating KV namespace...', 25);
  const kvTitle = `${workerName}-${deployType}-${new Date().toISOString()}`;
  const kvNamespace = await api.createKVNamespace(accountId, kvTitle);
  const kvNamespaceId = kvNamespace.id;
  reportProgress('kv_namespace', 'KV namespace created', 35);

  // Step 5: Generate settings and build script
  reportProgress('build_script', 'Building worker script with settings...', 40);
  const settings = generateBPBSettings(accountId, accountEmail, token, workerName, subdomain);
  const workerScript = buildWorkerScript(settings, script);
  reportProgress('build_script', 'Worker script built', 50);

  // Step 6: Deploy
  if (deployType === 'pages') {
    reportProgress('deploy_pages', 'Creating Pages project...', 55);
    const pagesProject = await api.createPagesProject(accountId, workerName, kvNamespaceId);
    reportProgress('deploy_pages', 'Pages project created', 65);

    reportProgress('deploy_pages', 'Deploying to Pages...', 70);
    await api.deployPagesScript(accountId, workerName, workerScript);
    reportProgress('deploy_pages', 'Pages deployed', 85);

    const panelUrl = `https://${pagesProject.subdomain}/${settings.securePath}/panel`;
    return {
      panelUrl,
      managementKey: settings.securePath,
      kvNamespaceId,
      securePath: settings.securePath,
    };
  } else {
    reportProgress('deploy_worker', 'Deploying to Workers...', 55);
    await api.deployWorker(accountId, workerName, workerScript, kvNamespaceId);
    reportProgress('deploy_worker', 'Worker deployed', 70);

    reportProgress('enable_subdomain', 'Enabling worker subdomain...', 75);
    await api.enableWorkerSubdomain(accountId, workerName);
    reportProgress('enable_subdomain', 'Subdomain enabled', 85);

    const panelUrl = `https://${workerName}.${subdomain}/${settings.securePath}/panel`;
    return {
      panelUrl,
      managementKey: settings.securePath,
      kvNamespaceId,
      securePath: settings.securePath,
    };
  }
}

export async function healthCheckPanel(panelUrl: string): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    const response = await fetch(panelUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - start;

    if (response.ok || response.status === 401 || response.status === 403) {
      // 401/403 means panel is up but requires auth
      return { healthy: true, latency };
    }
    return { healthy: false, latency, error: `HTTP ${response.status}` };
  } catch (error) {
    return { healthy: false, error: error instanceof Error ? error.message : 'Health check failed' };
  }
}

export function getBPBPanelVersion(): string {
  return '5.1.1'; // Current stable version
}