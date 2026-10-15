import { useState, useEffect, useCallback } from 'react';
import { window } from 'globalThis';

declare global {
  interface Window {
    api: any;
  }
}

export function useApi() {
  return window.api;
}

export function useDeployments() {
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.api.db.deployments.list();
      if (result.success) {
        setDeployments(result.data || []);
      } else {
        setError(result.error || 'Failed to load deployments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (deployment: any) => {
    const result = await window.api.db.deployments.create(deployment);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  const update = useCallback(async (deployment: any) => {
    const result = await window.api.db.deployments.update(deployment);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const result = await window.api.db.deployments.delete(id);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { deployments, loading, error, load, create, update, remove };
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.api.db.accounts.list();
      if (result.success) {
        setAccounts(result.data || []);
      } else {
        setError(result.error || 'Failed to load accounts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (account: any) => {
    const result = await window.api.db.accounts.create(account);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  const update = useCallback(async (account: any) => {
    const result = await window.api.db.accounts.update(account);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const result = await window.api.db.accounts.delete(id);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { accounts, loading, error, load, create, update, remove };
}

export function useEmails() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await window.api.db.emails.list();
      if (result.success) {
        setEmails(result.data || []);
      } else {
        setError(result.error || 'Failed to load emails');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (email: any) => {
    const result = await window.api.db.emails.create(email);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  const update = useCallback(async (email: any) => {
    const result = await window.api.db.emails.update(email);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const result = await window.api.db.emails.delete(id);
    if (result.success) {
      await load();
    }
    return result;
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { emails, loading, error, load, create, update, remove };
}

export function useSettings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const keys = [
        'dataDirectory',
        'browserHeadless',
        'browserSlowMo',
        'logLevel',
        'telemetryEnabled',
        'autoCheckUpdates',
      ];
      const loaded: Record<string, any> = {};
      for (const key of keys) {
        const result = await window.api.db.settings.get(key);
        if (result.success && result.data) {
          loaded[key] = result.data;
        }
      }
      setSettings(loaded);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const set = useCallback(async (key: string, value: any) => {
    const result = await window.api.db.settings.set(key, String(value));
    if (result.success) {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
    return result;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, loading, load, set };
}