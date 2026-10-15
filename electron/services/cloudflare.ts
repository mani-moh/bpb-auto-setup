export interface CloudflareUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  telephone: string;
  country: string;
  zipcode: string;
  created_on: string;
  modified_on: string;
  two_factor_authentication_enabled: boolean;
  suspended_at: string | null;
}

export interface CloudflareAccount {
  id: string;
  name: string;
  type: 'standard' | 'enterprise';
  created_on: string;
  settings: {
    abuse_contact_email: string;
    enforce_twofactor: boolean;
  };
}

export interface CloudflareToken {
  id: string;
  name: string;
  status: 'active' | 'revoked';
  not_before: string;
  expires_on: string | null;
  issued_on: string;
  modified_on: string;
  scope: {
    account: string;
    zone: string;
  };
  permissions: Array<{
    key: string;
    type: 'read' | 'edit';
  }>;
}

export interface CloudflareKVNamespace {
  id: string;
  title: string;
  created_on: string;
  modified_on: string;
}

export interface CloudflareWorkerScript {
  id: string;
  etag: string;
  created_on: string;
  modified_on: string;
  metadata: {
    main_module: string;
    compatibility_date: string;
    compatibility_flags: string[];
    bindings: Array<{
      name: string;
      type: string;
      namespace_id?: string;
    }>;
  };
}

export interface CloudflarePagesProject {
  id: string;
  name: string;
  subdomain: string;
  production_branch: string;
  created_on: string;
  modified_on: string;
}

export interface CloudflareSubdomain {
  subdomain: string;
  created_on: string;
  modified_on: string;
}

export class CloudflareAPI {
  private baseUrl = 'https://api.cloudflare.com/client/v4';
  private token: string;
  private accountId: string | null = null;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.success) {
      const errors = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
      throw new Error(`Cloudflare API error: ${errors}`);
    }

    return data.result;
  }

  async verifyToken(): Promise<{ id: string; status: string; user: { email: string } }> {
    return this.request('/user/tokens/verify');
  }

  async getUser(): Promise<CloudflareUser> {
    return this.request('/user');
  }

  async listAccounts(): Promise<CloudflareAccount[]> {
    return this.request('/accounts');
  }

  async createAccount(name: string, idempotencyKey: string): Promise<CloudflareAccount> {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify({ name, type: 'standard', standalone: true }),
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
  }

  async checkWorkerNameTaken(accountId: string, name: string): Promise<boolean> {
    try {
      await this.request(`/accounts/${accountId}/workers/scripts/${name}`);
      return true;
    } catch {
      return false;
    }
  }

  async checkPagesNameTaken(accountId: string, name: string): Promise<boolean> {
    try {
      await this.request(`/accounts/${accountId}/pages/projects/${name}`);
      return true;
    } catch {
      return false;
    }
  }

  async createKVNamespace(accountId: string, title: string): Promise<CloudflareKVNamespace> {
    return this.request(`/accounts/${accountId}/storage/kv/namespaces`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async getWorkersSubdomain(accountId: string): Promise<CloudflareSubdomain> {
    return this.request(`/accounts/${accountId}/workers/subdomain`);
  }

  async createWorkersSubdomain(accountId: string, subdomain: string): Promise<CloudflareSubdomain> {
    return this.request(`/accounts/${accountId}/workers/subdomain`, {
      method: 'PUT',
      body: JSON.stringify({ subdomain, enabled: true }),
    });
  }

  async deployWorker(
    accountId: string,
    name: string,
    script: string,
    kvNamespaceId: string
  ): Promise<CloudflareWorkerScript> {
    const formData = new FormData();
    formData.append('metadata', JSON.stringify({
      main_module: 'worker.js',
      compatibility_date: new Date().toISOString().split('T')[0],
      compatibility_flags: ['nodejs_compat'],
      bindings: [
        {
          name: 'kv',
          type: 'kv_namespace',
          namespace_id: kvNamespaceId,
        },
      ],
    }));
    formData.append('worker.js', new Blob([script], { type: 'application/javascript+module' }), 'worker.js');

    const response = await fetch(`${this.baseUrl}/accounts/${accountId}/workers/scripts/${name}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      const errors = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
      throw new Error(`Failed to deploy worker: ${errors}`);
    }
    return data.result;
  }

  async enableWorkerSubdomain(accountId: string, scriptName: string): Promise<void> {
    await this.request(`/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`, {
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
    });
  }

  async createPagesProject(
    accountId: string,
    name: string,
    kvNamespaceId: string
  ): Promise<CloudflarePagesProject> {
    return this.request(`/accounts/${accountId}/pages/projects`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        production_branch: 'main',
        deployment_configs: {
          production: {
            compatibility_date: new Date().toISOString().split('T')[0],
            compatibility_flags: ['nodejs_compat'],
            kv_namespaces: {
              kv: { namespace_id: kvNamespaceId },
            },
          },
        },
      }),
    });
  }

  async deployPagesScript(accountId: string, projectName: string, script: string): Promise<void> {
    const formData = new FormData();
    formData.append('branch', 'main');
    formData.append('manifest', '{}');
    formData.append('worker.js', new Blob([script], { type: 'application/javascript+module' }), 'worker.js');

    const response = await fetch(`${this.baseUrl}/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      const errors = data.errors?.map((e: any) => e.message).join(', ') || 'Unknown error';
      throw new Error(`Failed to deploy pages: ${errors}`);
    }
  }

  setAccountId(accountId: string): void {
    this.accountId = accountId;
  }

  getAccountId(): string | null {
    return this.accountId;
  }
}

export function generateIdempotencyKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function buildTokenUrl(accountId: string = '*'): string {
  const permissions = [
    { key: 'workers_scripts', type: 'edit' },
    { key: 'workers_kv_storage', type: 'edit' },
    { key: 'page', type: 'edit' },
    { key: 'dns', type: 'edit' },
    { key: 'user_details', type: 'read' },
  ];

  const params = new URLSearchParams();
  params.set('permissionGroupKeys', JSON.stringify(permissions));
  params.set('accountId', accountId);
  params.set('zoneId', 'all');
  params.set('name', 'BPB Auto-Setup');

  return `https://dash.cloudflare.com/profile/api-tokens?${params.toString()}`;
}