import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { EMAIL_PROVIDERS, generateEmailAddress, provisionEmailManual, provisionEmailCustomDomain, getProviderSignupUrl, validateEmail } from '../services/email';
import { IPC_CHANNELS } from '../../shared/ipc';
import { createSuccessResponse, createErrorResponse } from '../../shared/ipc';

export function setupEmailIpc(): void {
  ipcMain.handle(
    'email:providers',
    async (): Promise<IPCResponse<typeof EMAIL_PROVIDERS>> => {
      return createSuccessResponse(EMAIL_PROVIDERS);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EMAIL_GENERATE,
    async (_: IpcMainInvokeEvent, prefix?: string): Promise<IPCResponse<{ localPart: string; password: string }>> => {
      try {
        const result = generateEmailAddress(prefix);
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to generate email');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EMAIL_PROVISION,
    async (
      _: IpcMainInvokeEvent,
      providerId: string,
      email: string,
      password: string,
      domain?: string
    ): Promise<IPCResponse<{ email: string; password: string; provider: string; requiresVerification: boolean; verificationUrl?: string }>> => {
      try {
        if (!validateEmail(email)) {
          return createErrorResponse('Invalid email format');
        }

        let result;
        switch (providerId) {
          case 'manual': {
            const url = getProviderSignupUrl('manual');
            result = await provisionEmailManual(email, password, url);
            break;
          }
          case 'custom-domain': {
            if (!domain) {
              return createErrorResponse('Domain required for custom-domain provider');
            }
            const parsed = email.split('@')[0];
            result = await provisionEmailCustomDomain(domain, parsed, password);
            break;
          }
          default:
            return createErrorResponse(`Provider ${providerId} not implemented`);
        }

        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to provision email');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.EMAIL_VERIFY,
    async (_: IpcMainInvokeEvent, email: string): Promise<IPCResponse<{ verified: boolean }>> => {
      // This would typically check IMAP or ask user to confirm
      // For now, we just return a placeholder
      return createSuccessResponse({ verified: false });
    }
  );

  ipcMain.handle(
    'email:provider-url',
    async (_: IpcMainInvokeEvent, providerId: string): Promise<IPCResponse<string>> => {
      return createSuccessResponse(getProviderSignupUrl(providerId));
    }
  );
}