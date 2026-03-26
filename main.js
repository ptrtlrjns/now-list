const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { listFiles, readTodoFile, updateItemStatus } = require('./file-ops.js');

const TODO_DIR = path.join(require('os').homedir(), '.now-list');

let mainWindow;

function ensureTodoDir() {
  if (!fs.existsSync(TODO_DIR)) {
    fs.mkdirSync(TODO_DIR, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function watchTodoDir() {
  fs.watch(TODO_DIR, { persistent: false }, () => {
    const files = listFiles(TODO_DIR);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('files-changed', files);
    }
  });
}

// IPC Handlers
ipcMain.handle('list-files', () => {
  return listFiles(TODO_DIR);
});

ipcMain.handle('read-file', (_event, filename) => {
  const filePath = path.join(TODO_DIR, filename);
  return readTodoFile(filePath);
});

ipcMain.handle('update-item', (_event, { filename, itemId, status }) => {
  const filePath = path.join(TODO_DIR, filename);
  updateItemStatus(filePath, itemId, status);
  return readTodoFile(filePath);
});

// App lifecycle
app.whenReady().then(() => {
  ensureTodoDir();
  createWindow();
  watchTodoDir();
});

app.on('window-all-closed', () => {
  app.quit();
});
