import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDb, closeDatabase } from '../database';
import type {
  Deployment,
  CloudflareAccount,
  EmailConfig,
  AppSettings,
  WorkflowState,
  IPCResponse,
} from '../../shared/types';
import { createSuccessResponse, createErrorResponse } from '../../shared/ipc';
import { IPC_CHANNELS } from '../../shared/ipc';

export function setupDatabaseIpc(): void {
  // Deployments
  ipcMain.handle(IPC_CHANNELS.DB_DEPLOYMENTS_LIST, async (): Promise<IPCResponse<Deployment[]>> => {
    try {
      const stmt = getDb().prepare('SELECT * FROM deployments ORDER BY created_at DESC');
      const rows = stmt.all() as Deployment[];
      return createSuccessResponse(rows);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Failed to list deployments');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.DB_DEPLOYMENTS_GET,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<Deployment | null>> => {
      try {
        const stmt = getDb().prepare('SELECT * FROM deployments WHERE id = ?');
        const row = stmt.get(id) as Deployment | undefined;
        return createSuccessResponse(row || null);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to get deployment');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_DEPLOYMENTS_CREATE,
    async (_: IpcMainInvokeEvent, deployment: Deployment): Promise<IPCResponse<Deployment>> => {
      try {
        const stmt = getDb().prepare(`
          INSERT INTO deployments (
            id, name, account_id, account_email, type, worker_name, worker_url,
            panel_url, secure_path, version, status, created_at, updated_at,
            kv_namespace_id, management_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          deployment.id,
          deployment.name,
          deployment.accountId,
          deployment.accountEmail,
          deployment.type,
          deployment.workerName,
          deployment.workerUrl,
          deployment.panelUrl,
          deployment.securePath,
          deployment.version,
          deployment.status,
          deployment.createdAt,
          deployment.updatedAt,
          deployment.kvNamespaceId,
          deployment.managementKey
        );
        return createSuccessResponse(deployment);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to create deployment');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_DEPLOYMENTS_UPDATE,
    async (_: IpcMainInvokeEvent, deployment: Deployment): Promise<IPCResponse<Deployment>> => {
      try {
        const stmt = getDb().prepare(`
          UPDATE deployments SET
            name = ?, account_id = ?, account_email = ?, type = ?, worker_name = ?,
            worker_url = ?, panel_url = ?, secure_path = ?, version = ?, status = ?,
            updated_at = ?, health_checked_at = ?, health_status = ?,
            kv_namespace_id = ?, management_key = ?
          WHERE id = ?
        `);
        stmt.run(
          deployment.name,
          deployment.accountId,
          deployment.accountEmail,
          deployment.type,
          deployment.workerName,
          deployment.workerUrl,
          deployment.panelUrl,
          deployment.securePath,
          deployment.version,
          deployment.status,
          deployment.updatedAt,
          deployment.healthCheckedAt ?? null,
          deployment.healthStatus ?? null,
          deployment.kvNamespaceId,
          deployment.managementKey,
          deployment.id
        );
        return createSuccessResponse(deployment);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to update deployment');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_DEPLOYMENTS_DELETE,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<void>> => {
      try {
        const stmt = getDb().prepare('DELETE FROM deployments WHERE id = ?');
        stmt.run(id);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to delete deployment');
      }
    }
  );

  // Accounts
  ipcMain.handle(IPC_CHANNELS.DB_ACCOUNTS_LIST, async (): Promise<IPCResponse<CloudflareAccount[]>> => {
    try {
      const stmt = getDb().prepare('SELECT * FROM accounts ORDER BY last_used_at DESC');
      const rows = stmt.all() as CloudflareAccount[];
      return createSuccessResponse(rows);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Failed to list accounts');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.DB_ACCOUNTS_GET,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<CloudflareAccount | null>> => {
      try {
        const stmt = getDb().prepare('SELECT * FROM accounts WHERE id = ?');
        const row = stmt.get(id) as CloudflareAccount | undefined;
        return createSuccessResponse(row || null);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to get account');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_ACCOUNTS_CREATE,
    async (_: IpcMainInvokeEvent, account: CloudflareAccount): Promise<IPCResponse<CloudflareAccount>> => {
      try {
        const stmt = getDb().prepare(`
          INSERT INTO accounts (id, email, name, token_ref, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(account.id, account.email, account.name ?? null, account.tokenId, account.createdAt, account.lastUsedAt);
        return createSuccessResponse(account);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to create account');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_ACCOUNTS_UPDATE,
    async (_: IpcMainInvokeEvent, account: CloudflareAccount): Promise<IPCResponse<CloudflareAccount>> => {
      try {
        const stmt = getDb().prepare(`
          UPDATE accounts SET email = ?, name = ?, token_ref = ?, last_used_at = ? WHERE id = ?
        `);
        stmt.run(account.email, account.name ?? null, account.tokenId, account.lastUsedAt, account.id);
        return createSuccessResponse(account);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to update account');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_ACCOUNTS_DELETE,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<void>> => {
      try {
        const stmt = getDb().prepare('DELETE FROM accounts WHERE id = ?');
        stmt.run(id);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to delete account');
      }
    }
  );

  // Email configs
  ipcMain.handle(IPC_CHANNELS.DB_EMAILS_LIST, async (): Promise<IPCResponse<EmailConfig[]>> => {
    try {
      const stmt = getDb().prepare('SELECT * FROM email_configs ORDER BY created_at DESC');
      const rows = stmt.all() as EmailConfig[];
      return createSuccessResponse(rows);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Failed to list email configs');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.DB_EMAILS_GET,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<EmailConfig | null>> => {
      try {
        const stmt = getDb().prepare('SELECT * FROM email_configs WHERE id = ?');
        const row = stmt.get(id) as EmailConfig | undefined;
        return createSuccessResponse(row || null);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to get email config');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_EMAILS_CREATE,
    async (_: IpcMainInvokeEvent, email: EmailConfig): Promise<IPCResponse<EmailConfig>> => {
      try {
        const stmt = getDb().prepare(`
          INSERT INTO email_configs (id, provider, email, password_ref, domain, api_config, created_at, verified_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          email.id,
          email.provider,
          email.email,
          email.passwordRef ?? null,
          email.domain ?? null,
          email.apiConfig ? JSON.stringify(email.apiConfig) : null,
          email.createdAt,
          email.verifiedAt ?? null
        );
        return createSuccessResponse(email);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to create email config');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_EMAILS_UPDATE,
    async (_: IpcMainInvokeEvent, email: EmailConfig): Promise<IPCResponse<EmailConfig>> => {
      try {
        const stmt = getDb().prepare(`
          UPDATE email_configs SET
            provider = ?, email = ?, password_ref = ?, domain = ?, api_config = ?, verified_at = ?
          WHERE id = ?
        `);
        stmt.run(
          email.provider,
          email.email,
          email.passwordRef ?? null,
          email.domain ?? null,
          email.apiConfig ? JSON.stringify(email.apiConfig) : null,
          email.verifiedAt ?? null,
          email.id
        );
        return createSuccessResponse(email);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to update email config');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_EMAILS_DELETE,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<void>> => {
      try {
        const stmt = getDb().prepare('DELETE FROM email_configs WHERE id = ?');
        stmt.run(id);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to delete email config');
      }
    }
  );

  // Settings
  ipcMain.handle(IPC_CHANNELS.DB_SETTINGS_GET, async (_: IpcMainInvokeEvent, key: string): Promise<IPCResponse<string | null>> => {
    try {
      const stmt = getDb().prepare('SELECT value FROM settings WHERE key = ?');
      const row = stmt.get(key) as { value: string } | undefined;
      return createSuccessResponse(row?.value ?? null);
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Failed to get setting');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.DB_SETTINGS_SET,
    async (_: IpcMainInvokeEvent, key: string, value: string): Promise<IPCResponse<void>> => {
      try {
        const stmt = getDb().prepare(`
          INSERT INTO settings (key, value) VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);
        stmt.run(key, value);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to set setting');
      }
    }
  );

  // Workflow state
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_SAVE,
    async (_: IpcMainInvokeEvent, state: WorkflowState): Promise<IPCResponse<void>> => {
      try {
        const stmt = getDb().prepare(`
          INSERT INTO workflow_state (id, step, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET step = excluded.step, data = excluded.data, updated_at = excluded.updated_at
        `);
        stmt.run(state.id, state.step, JSON.stringify(state.data), state.createdAt, state.updatedAt);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to save workflow state');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_LOAD,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<WorkflowState | null>> => {
      try {
        const stmt = getDb().prepare('SELECT * FROM workflow_state WHERE id = ?');
        const row = stmt.get(id) as { id: string; step: string; data: string; created_at: number; updated_at: number } | undefined;
        if (!row) return createSuccessResponse(null);
        return createSuccessResponse({
          id: row.id,
          step: row.step as WorkflowState['step'],
          data: JSON.parse(row.data),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to load workflow state');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_CLEAR,
    async (_: IpcMainInvokeEvent, id: string): Promise<IPCResponse<void>> => {
      try {
        const stmt = getDb().prepare('DELETE FROM workflow_state WHERE id = ?');
        stmt.run(id);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to clear workflow state');
      }
    }
  );
}