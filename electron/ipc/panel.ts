import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { PanelAdapter } from '../services/panel';
import { IPC_CHANNELS } from '../../shared/ipc';
import { createSuccessResponse, createErrorResponse } from '../../shared/ipc';

export function setupPanelIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.PANEL_HEALTH_CHECK,
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string): Promise<IPCResponse<{ healthy: boolean; error?: string }>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const verified = await adapter.verifyKey();
        return createSuccessResponse({ healthy: verified });
      } catch (error) {
        return createSuccessResponse({ healthy: false, error: error instanceof Error ? error.message : 'Verification failed' });
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PANEL_GET_CONFIG,
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string): Promise<IPCResponse<any>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const config = await adapter.getConfig();
        return createSuccessResponse(config);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to get config');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PANEL_UPDATE_CONFIG,
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string, config: any): Promise<IPCResponse<any>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const updated = await adapter.updateConfig(config);
        return createSuccessResponse(updated);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to update config');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PANEL_DELETE,
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string): Promise<IPCResponse<void>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        await adapter.deletePanel();
        return createSuccessResponse(undefined);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to delete panel');
      }
    }
  );

  ipcMain.handle(
    'panel:get-subscriptions',
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string): Promise<IPCResponse<any>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const subs = await adapter.getSubscriptions();
        return createSuccessResponse(subs);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to get subscriptions');
      }
    }
  );

  ipcMain.handle(
    'panel:generate-subscription',
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string, type: string): Promise<IPCResponse<any>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const sub = await adapter.generateSubscription(type as any);
        return createSuccessResponse(sub);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to generate subscription');
      }
    }
  );

  ipcMain.handle(
    'panel:export-config',
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string): Promise<IPCResponse<string>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const config = await adapter.exportConfig();
        return createSuccessResponse(config);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to export config');
      }
    }
  );

  ipcMain.handle(
    'panel:import-config',
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string, configJson: string): Promise<IPCResponse<any>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const config = await adapter.importConfig(configJson);
        return createSuccessResponse(config);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to import config');
      }
    }
  );

  ipcMain.handle(
    'panel:management-url',
    async (_: IpcMainInvokeEvent, panelUrl: string, managementKey: string): Promise<IPCResponse<string>> => {
      try {
        const adapter = new PanelAdapter(panelUrl, managementKey);
        const url = adapter.getManagementUrl();
        return createSuccessResponse(url);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Failed to get management URL');
      }
    }
  );
}