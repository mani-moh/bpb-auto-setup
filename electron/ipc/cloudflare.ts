import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { CloudflareAPI, buildTokenUrl, generateIdempotencyKey } from '../services/cloudflare';
import { getCredential } from '../utils/credentials';
import { IPC_CHANNELS } from '../../shared/ipc';
import { createSuccessResponse, createErrorResponse } from '../../shared/ipc';

export function setupCloudflareIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.CF_VALIDATE_TOKEN,
    async (_: IpcMainInvokeEvent, token: string): Promise<IPCResponse<{ valid: boolean; email?: string; accountId?: string }>> => {
      try {
        const api = new CloudflareAPI(token);
        const result = await api.verifyToken();
        const user = await api.getUser();
        const accounts = await api.listAccounts();
        return createSuccessResponse({
          valid: result.status === 'active',
          email: user.email,
          accountId: accounts[0]?.id,
        });
      } catch (error) {
        return createSuccessResponse({ valid: false });
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CF_LIST_ACCOUNTS,
    async (_: IpcMainInvokeEvent, token: string): Promise<IPCResponse<Array<{ id: string; name: string; type: string }>>> => {
      try {
        const api = new CloudflareAPI(token);
        const accounts = await api.listAccounts();
        return createSuccessResponse(accounts.map(a => ({ id: a.id, name: a.name, type: a.type })));
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to list accounts');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CF_CREATE_ACCOUNT,
    async (_: IpcMainInvokeEvent, token: string, name: string): Promise<IPCResponse<{ id: string; name: string }>> => {
      try {
        const api = new CloudflareAPI(token);
        const idempotencyKey = generateIdempotencyKey();
        const account = await api.createAccount(name, idempotencyKey);
        return createSuccessResponse({ id: account.id, name: account.name });
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to create account');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CF_CREATE_TOKEN_URL,
    async (_: IpcMainInvokeEvent, accountId?: string): Promise<IPCResponse<string>> => {
      try {
        const url = buildTokenUrl(accountId);
        return createSuccessResponse(url);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to generate token URL');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CF_START_SIGNUP,
    async (_: IpcMainInvokeEvent, email: string): Promise<IPCResponse<{ url: string }>> => {
      try {
        const url = `https://dash.cloudflare.com/sign-up?email=${encodeURIComponent(email)}`;
        return createSuccessResponse({ url });
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to generate signup URL');
      }
    }
  );
}