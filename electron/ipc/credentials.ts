import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { setCredential, getCredential, deleteCredential, findCredentials, generateCredentialKey } from '../utils/credentials';
import { IPC_CHANNELS } from '../../shared/ipc';
import { createSuccessResponse, createErrorResponse } from '../../shared/ipc';

export function setupCredentialsIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.CREDENTIALS_SET,
    async (_: IpcMainInvokeEvent, account: string, password: string): Promise<IPCResponse<void>> => {
      try {
        await setCredential(account, password);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to store credential');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CREDENTIALS_GET,
    async (_: IpcMainInvokeEvent, account: string): Promise<IPCResponse<string | null>> => {
      try {
        const password = await getCredential(account);
        return createSuccessResponse(password);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to retrieve credential');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.CREDENTIALS_DELETE,
    async (_: IpcMainInvokeEvent, account: string): Promise<IPCResponse<boolean>> => {
      try {
        const result = await deleteCredential(account);
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to delete credential');
      }
    }
  );

  // Helper to generate credential keys
  ipcMain.handle(
    'credentials:generate-key',
    async (_: IpcMainInvokeEvent, prefix: string, identifier: string): Promise<IPCResponse<string>> => {
      try {
        const key = generateCredentialKey(prefix, identifier);
        return createSuccessResponse(key);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to generate key');
      }
    }
  );
}