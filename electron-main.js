// Electron main process — يفتح تطبيق القرآن كتطبيق سطح مكتب (Windows/macOS/Linux)
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 380,
    title: 'القرآن الكريم',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // يسمح للتطبيق المحلي باستدعاء مزوّدي الذكاء الاصطناعي والترجمة مباشرة
      webSecurity: false,
    },
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
