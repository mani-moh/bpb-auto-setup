import { createHash } from 'crypto';

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

export class PanelAdapter {
  private panelUrl: string;
  private managementKey: string;

  constructor(panelUrl: string, managementKey: string) {
    this.panelUrl = panelUrl.replace(/\/$/, '');
    this.managementKey = managementKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.panelUrl}${endpoint}`;
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    
    // Add management key as header
    headers.set('X-Panel-Key', this.managementKey);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Panel API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getStatus(): Promise<{ version: string; uptime: number; connections: number }> {
    return this.request('/api/status');
  }

  async getConfig(): Promise<PanelConfig> {
    return this.request('/api/config');
  }

  async updateConfig(config: Partial<PanelConfig>): Promise<PanelConfig> {
    return this.request('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async getSubscriptions(): Promise<SubscriptionLink[]> {
    return this.request('/api/subscriptions');
  }

  async generateSubscription(type: 'xray' | 'sing-box' | 'clash' | 'amnezia' | 'wireguard'): Promise<SubscriptionLink> {
    return this.request('/api/subscriptions/generate', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async deletePanel(): Promise<void> {
    await this.request('/api/delete', { method: 'POST' });
  }

  async exportConfig(): Promise<string> {
    const config = await this.getConfig();
    return JSON.stringify(config, null, 2);
  }

  async importConfig(configJson: string): Promise<PanelConfig> {
    const config = JSON.parse(configJson);
    return this.updateConfig(config);
  }

  // Generate management URL for sharing
  getManagementUrl(): string {
    return `${this.panelUrl}/${this.managementKey}/panel`;
  }

  // Verify management key
  async verifyKey(): Promise<boolean> {
    try {
      await this.getStatus();
      return true;
    } catch {
      return false;
    }
  }
}

export function createPanelAdapter(panelUrl: string, managementKey: string): PanelAdapter {
  return new PanelAdapter(panelUrl, managementKey);
}