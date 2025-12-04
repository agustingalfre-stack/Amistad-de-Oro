const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess;

function startServer() {
  let serverPath;

  if (app.isPackaged) {
    // Cuando está empaquetado
    serverPath = path.join(process.resourcesPath, 'server.js');
  } else {
    // Modo desarrollo
    serverPath = path.join(__dirname, '..', 'server.js');
  }

  serverProcess = spawn(process.execPath, [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, PORT: "3000" }
  });

  serverProcess.on('error', err => {
    console.error('Error iniciando server:', err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'public', 'index.html')
    : path.join(__dirname, '..', 'public', 'index.html');

  win.loadFile(indexPath);
}

app.whenReady().then(() => {
  startServer();
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});
