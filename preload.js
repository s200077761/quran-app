// preload.js — جسر آمن بين واجهة التطبيق وعملية Electron الرئيسية
// لا يمنح الواجهة أي صلاحيات Node مباشرة؛ فقط دالة طلب وحيدة.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NATIVE', {
  // يطلب من العملية الرئيسية تنفيذ طلب HTTP مع تحقق من قائمة بيضاء للمضيفين
  llmFetch: (payload) => ipcRenderer.invoke('llm-fetch', payload),
});
