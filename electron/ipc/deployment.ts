import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { deployBPBPanel, healthCheckPanel, getBPBPanelVersion } from '../services/deployment';
import { IPC_CHANNELS } from '../../shared/ipc';
import { createSuccessResponse, createErrorResponse } from '../../shared/ipc';

export function setupDeploymentIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.DEPLOYMENT_START,
    async (
      _: IpcMainInvokeEvent,
      params: {
        token: string;
        accountId: string;
        accountEmail: string;
        workerName: string;
        deployType: 'workers' | 'pages';
        preRelease?: boolean;
      }
    ): Promise<IPCResponse<{ panelUrl: string; managementKey: string; kvNamespaceId: string; securePath: string }>> => {
      try {
        const result = await deployBPBPanel(
          params.token,
          params.accountId,
          params.accountEmail,
          params.workerName,
          params.deployType,
          params.preRelease ?? false,
          (progress) => {
            // Could emit progress events here via webContents.send
            console.log(`[Deployment] ${progress.step}: ${progress.message} (${progress.progress}%)`);
          }
        );
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Deployment failed');
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PANEL_HEALTH_CHECK,
    async (_: IpcMainInvokeEvent, panelUrl: string): Promise<IPCResponse<{ healthy: boolean; latency?: number; error?: string }>> => {
      try {
        const result = await healthCheckPanel(panelUrl);
        return createSuccessResponse(result);
      } catch (error) {
        return createErrorResponse(error instanceof Error ? error.message : 'Health check failed');
      }
    }
  );

  ipcMain.handle(
    'deployment:version',
    async (): Promise<IPCResponse<string>> => {
      return createSuccessResponse(getBPBPanelVersion());
    }
  );
}