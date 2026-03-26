const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listFiles: () => ipcRenderer.invoke('list-files'),
  readFile: (filename) => ipcRenderer.invoke('read-file', filename),
  updateItem: (filename, itemId, status) =>
    ipcRenderer.invoke('update-item', { filename, itemId, status }),
  onFilesChanged: (callback) => {
    ipcRenderer.on('files-changed', (_event, files) => callback(files));
  },
});
