import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { isDev } from './utils/env';
import { setupDatabaseIpc } from './ipc/database';
import { setupCredentialsIpc } from './ipc/credentials';
import { setupEmailIpc } from './ipc/email';
import { setupCloudflareIpc } from './ipc/cloudflare';
import { setupBrowserIpc } from './ipc/browser';
import { setupDeploymentIpc } from './ipc/deployment';
import { setupPanelIpc } from './ipc/panel';
import { initializeDatabase } from './database';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: 'BPB Auto-Setup',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: join(__dirname, '..', 'assets', 'icon.png'),
    show: false,
  });

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  // Initialize database (async for sql.js)
  await initializeDatabase();

  // Setup IPC handlers
  setupDatabaseIpc();
  setupCredentialsIpc();
  setupEmailIpc();
  setupCloudflareIpc();
  setupBrowserIpc();
  setupDeploymentIpc();
  setupPanelIpc();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Cleanup
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}