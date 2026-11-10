// خادم محلي يقدّم تطبيق القرآن ويوصل طلبات الذكاء الاصطناعي إلى المزوّد المختار
// الاستخدام:  node serve.mjs
// ثم افتح  http://localhost:8080
//
// الافتراضي يوجّه الطلبات إلى FreeLLMAPI المحلي. يمكن تغيير العنوان الافتراضي عبر:
//   FRELLMAPI_URL=http://localhost:3001/v1  (الافتراضي)

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const WWW = join(__dirname, 'www');
const PORT = process.env.PORT || 8080;
const LLM_BASE = (process.env.FRELLMAPI_URL || 'http://localhost:3001/v1').replace(/\/+$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  // وكيل طلبات الذكاء الاصطناعي: يوجّهها إلى المزوّد المحدد في الترويسة x-llm-base-url، أو إلى FreeLLMAPI المحلي افتراضياً
  if (pathname.startsWith('/api/')) {
    const upstreamRaw = req.headers['x-llm-base-url'] || LLM_BASE;
    const upstream = String(upstreamRaw).replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(upstream)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: { message: 'عنوان المزوّد غير صالح' } }));
      return;
    }
    const target = upstream + pathname.slice('/api'.length) + url.search;
    return proxy(target, req, res);
  }

  // الملفات الثابتة (من مجلد www)
  let filePath = normalize(join(WWW, pathname));
  if (pathname === '/' || !existsSync(filePath)) filePath = join(WWW, 'index.html');
  // منع الخروج من مجلد www
  if (!filePath.startsWith(WWW)) { res.writeHead(403); res.end('Forbidden'); return; }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404); res.end('Not found');
  }
});

// إعادة توجيه الطلب إلى FreeLLMAPI مع تمرير الرأس والمفتاح
function proxy(target, req, res) {
  const { request } = http;
  const upstream = request(target, {
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      ...(req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] } : {}),
    },
  }, (up) => {
    res.writeHead(up.statusCode || 502, { 'Content-Type': up.headers['content-type'] || 'application/json' });
    up.pipe(res);
  });

  upstream.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: { message: 'تعذر الوصول إلى FreeLLMAPI: ' + e.message } }));
  });

  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    req.pipe(upstream);
  } else {
    upstream.end();
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log('تطبيق القرآن يعمل على:  http://localhost:' + PORT);
  console.log('الطلبات الذكية تُوجَّه إلى المزوّد المختار في التطبيق (أو ' + LLM_BASE + ' افتراضياً)');
});
