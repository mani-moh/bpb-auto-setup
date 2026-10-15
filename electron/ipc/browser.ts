import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { BrowserManager, CloudflarePages, EmailProviderPages } from '../services/browser';
import { IPC_CHANNELS } from '../../shared/ipc';
import { createSuccessResponse, createErrorResponse } from '../../shared/ipc';

let browserManager: BrowserManager | null = null;

function getBrowserManager(): BrowserManager {
  if (!browserManager) {
    browserManager = new BrowserManager();
  }
  return browserManager;
}

export function setupBrowserIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.BROWSER_OPEN,
    async (_: IpcMainInvokeEvent, headless: boolean = false, slowMo: number = 0): Promise<IPCResponse<void>> => {
      try {
        await getBrowserManager().launch(headless, slowMo);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to launch browser');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.BROWSER_CLOSE,
    async (): Promise<IPCResponse<void>> => {
      try {
        await getBrowserManager().close();
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to close browser');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.BROWSER_NAVIGATE,
    async (_: IpcMainInvokeEvent, url: string): Promise<IPCResponse<void>> => {
      try {
        await getBrowserManager().navigate(url);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to navigate');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.BROWSER_WAIT_FOR_ELEMENT,
    async (_: IpcMainInvokeEvent, selector: string, timeout: number = 30000): Promise<IPCResponse<void>> => {
      try {
        await getBrowserManager().waitForSelector(selector, timeout);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Element not found');
      }
    }
  );

  // Cloudflare-specific actions
  ipcMain.handle(
    'browser:cloudflare:goto-signup',
    async (_: IpcMainInvokeEvent, email: string): Promise<IPCResponse<void>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        await cf.gotoSignup(email);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to navigate to Cloudflare signup');
      }
    }
  );

  ipcMain.handle(
    'browser:cloudflare:goto-login',
    async (): Promise<IPCResponse<void>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        await cf.gotoLogin();
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to navigate to Cloudflare login');
      }
    }
  );

  ipcMain.handle(
    'browser:cloudflare:goto-token',
    async (): Promise<IPCResponse<void>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        await cf.gotoTokenCreation();
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to navigate to token creation');
      }
    }
  );

  ipcMain.handle(
    'browser:cloudflare:fill-signup',
    async (_: IpcMainInvokeEvent, email: string, password: string): Promise<IPCResponse<void>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        await cf.fillSignupForm(email, password);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to fill signup form');
      }
    }
  );

  ipcMain.handle(
    'browser:cloudflare:submit-signup',
    async (): Promise<IPCResponse<void>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        await cf.submitSignup();
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to submit signup');
      }
    }
  );

  ipcMain.handle(
    'browser:cloudflare:wait-verification',
    async (): Promise<IPCResponse<boolean>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        const result = await cf.waitForVerification();
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to wait for verification');
      }
    }
  );

  ipcMain.handle(
    'browser:cloudflare:wait-dashboard',
    async (): Promise<IPCResponse<boolean>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        const result = await cf.waitForDashboard();
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to wait for dashboard');
      }
    }
  );

  ipcMain.handle(
    'browser:cloudflare:detect-captcha',
    async (): Promise<IPCResponse<boolean>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const cf = new CloudflarePages(session.page);
        const result = await cf.detectCaptcha();
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to detect captcha');
      }
    }
  );

  // Email provider actions
  ipcMain.handle(
    'browser:email:goto-signup',
    async (_: IpcMainInvokeEvent, url: string): Promise<IPCResponse<void>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const emailPages = new EmailProviderPages(session.page);
        await emailPages.gotoProviderSignup(url);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to navigate to email provider');
      }
    }
  );

  ipcMain.handle(
    'browser:email:detect-captcha',
    async (): Promise<IPCResponse<boolean>> => {
      try {
        const session = await getBrowserManager().getSession();
        if (!session) return createErrorResponse('Browser not launched');
        const emailPages = new EmailProviderPages(session.page);
        const result = await emailPages.detectCaptcha();
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to detect captcha');
      }
    }
  );

  ipcMain.handle(
    'browser:screenshot',
    async (_: IpcMainInvokeEvent, path: string): Promise<IPCResponse<void>> => {
      try {
        await getBrowserManager().screenshot(path);
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to take screenshot');
      }
    }
  );

  ipcMain.handle(
    'browser:is-running',
    async (): Promise<IPCResponse<boolean>> => {
      return createSuccessResponse(getBrowserManager().isRunning());
    }
  );
}