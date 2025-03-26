const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

async function scanDirectory(directory) {
  try {
    const files = await fs.promises.readdir(directory);
    const mediaFiles = [];
    
    for (const file of files) {
      const fullPath = path.join(directory, file);
      const stat = await fs.promises.stat(fullPath);
      
      if (stat.isDirectory()) {
        const subFiles = await scanDirectory(fullPath);
        mediaFiles.push(...subFiles);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.mov'].includes(ext)) {
          mediaFiles.push({
            path: fullPath,
            name: file,
            type: ext.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image',
            size: stat.size,
            date: stat.mtime
          });
        }
      }
    }
    
    return mediaFiles;
  } catch (error) {
    console.error('Error scanning directory:', error);
    return [];
  }
}

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const directory = result.filePaths[0];
    const mediaFiles = await scanDirectory(directory);
    return {
      directory,
      mediaFiles
    };
  }
  return null;
});

ipcMain.handle('scan-directory', async (event, directory) => {
  const mediaFiles = await scanDirectory(directory);
  return {
    directory,
    mediaFiles
  };
}); 