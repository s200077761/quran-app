// Electron main process — يفتح تطبيق القرآن كتطبيق سطح مكتب (Windows/macOS/Linux)
// الأمان: webSecurity مفعّلة (الافتراضي)، ولا يوجد nodeIntegration في الواجهة؛
// طلبات الذكاء الاصطناعي تمرّ عبر IPC إلى هذه العملية مع قائمة بيضاء للمضيفين.
const { app, BrowserWindow, Menu, ipcMain, net } = require('electron');
const path = require('path');

// قائمة بيضاء لمضيفي مزوّدي الذكاء الاصطناعي (تمنع SSRF عبر عناوين داخلية/خبيثة)
const ALLOWED_LLM_HOSTS = new Set([
  'localhost', '127.0.0.1',
  'openrouter.ai',
  'api.deepseek.com',
  'api.moonshot.ai',
  'api.moonshot.cn',
  'api.mistral.ai',
  'generativelanguage.googleapis.com',
  'api.openai.com',
  'api.z.ai',
]);

ipcMain.handle('llm-fetch', async (_event, { url, method, headers, body }) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, status: 400, body: '{"error":{"message":"Blocked protocol"}}' };
    }
    if (!ALLOWED_LLM_HOSTS.has(u.hostname)) {
      return { ok: false, status: 403, body: '{"error":{"message":"Blocked host: ' + u.hostname + '"}}' };
    }
    const res = await net.fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body || undefined,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return { ok: false, status: 0, body: JSON.stringify({ error: { message: e.message } }) };
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 380,
    title: 'القرآن الكريم',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // webSecurity تبقى مفعّلة (لا نعطّلها) — الاتصال يتم عبر جسر IPC أعلاه
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
