/* ============================================================
   تطبيق القرآن الكريم — مصحف المدينة + بحث + ترجمة + ترتيل وتجويد + كلمات
   ============================================================ */
(function () {
  'use strict';

  const DATA = window.QURAN_DATA;
  if (!DATA || !DATA.surahs) {
    document.body.innerHTML = '<p style="padding:40px;text-align:center">تعذر تحميل بيانات القرآن (quran-data.js).</p>';
    return;
  }
  const SURAHS = DATA.surahs;

  const $ = (id) => document.getElementById(id);
  const el = {
    surahList: $('surahList'), surahCount: $('surahCount'),
    searchInput: $('searchInput'), btnClear: $('btnClear'), searchHint: $('searchHint'),
    results: $('results'), surahView: $('surahView'), welcome: $('welcome'), viewer: $('viewer'),
    langSelect: $('langSelect'), reciterSelect: $('reciterSelect'), tajweedToggle: $('tajweedToggle'),
    player: $('player'),
    settingsModal: $('settingsModal'), btnSettings: $('btnSettings'),
    btnCloseSettings: $('btnCloseSettings'), btnSave: $('btnSave'), btnTest: $('btnTest'),
    cfgProvider: $('cfgProvider'), cfgBaseUrl: $('cfgBaseUrl'), cfgApiKey: $('cfgApiKey'), cfgModel: $('cfgModel'),
    keyHint: $('keyHint'), baseUrlHint: $('baseUrlHint'), testResult: $('testResult'), toast: $('toast'),
  };

  /* ---------- فهارس سريعة ---------- */
  const ayahIndex = {};   // global -> {s, a, ayah}
  const surahStartGlobal = {};
  for (const s of SURAHS) {
    surahStartGlobal[s.num] = s.ayahs[0].g;
    for (const a of s.ayahs) ayahIndex[a.g] = { s: s.num, a: a.n, ayah: a };
  }

  /* ---------- تفضيلات القراءة ---------- */
  const TRANSLATIONS = [
    { id: 'en.sahih', label: 'English — Saheeh International', native: 'English' },
    { id: 'fr.hamidullah', label: 'Français', native: 'Français' },
    { id: 'es.cortes', label: 'Español', native: 'Español' },
    { id: 'de.bubenheim', label: 'Deutsch', native: 'Deutsch' },
    { id: 'tr.diyanet', label: 'Türkçe', native: 'Türkçe' },
    { id: 'ur.jalandhry', label: 'اردو — Urdu', native: 'اردو' },
    { id: 'id.indonesian', label: 'Bahasa Indonesia', native: 'Bahasa Indonesia' },
    { id: 'ru.kuliev', label: 'Русский', native: 'Русский' },
    { id: 'bn.bengali', label: 'বাংলা — Bengali', native: 'বাংলা' },
    { id: 'fa.fooladvand', label: 'فارسی', native: 'فارسی' },
    { id: 'zh.jian', label: '中文 — Chinese', native: '中文' },
    { id: 'it.piccardo', label: 'Italiano', native: 'Italiano' },
    { id: 'pt.elhayek', label: 'Português', native: 'Português' },
    { id: 'nl.keyzer', label: 'Nederlands', native: 'Nederlands' },
    { id: 'hi.hindi', label: 'हिन्दी — Hindi', native: 'हिन्दी' },
  ];

  const RECITERS = [
    { id: 'ar.alafasy', label: 'مشاري راشد العفاسي' },
    { id: 'ar.husary', label: 'محمود خليل الحصري' },
    { id: 'ar.abdulbasitmurattal', label: 'عبد الباسط عبد الصمد' },
    { id: 'ar.minshawi', label: 'محمد صديق المنشاوي' },
    { id: 'ar.abdurrahmaansudais', label: 'عبد الرحمن السديس' },
    { id: 'ar.mahermuaiqly', label: 'ماهر المعيقلي' },
  ];

  const DEFAULT_READING = { lang: 'en.sahih', reciter: 'ar.alafasy', tajweed: false };
  function loadReading() {
    try { return { ...DEFAULT_READING, ...JSON.parse(localStorage.getItem('quran_reading') || '{}') }; }
    catch { return { ...DEFAULT_READING }; }
  }
  function saveReading() { localStorage.setItem('quran_reading', JSON.stringify(readingPrefs)); }
  let readingPrefs = loadReading();

  /* ---------- الترجمة ---------- */
  const translationCache = { 'en.sahih': true }; // الإنجليزية مضمّنة
  function translationText(g) {
    const lang = readingPrefs.lang;
    if (lang === 'en.sahih') { const e = ayahIndex[g]; return e ? e.ayah.en : ''; }
    const map = translationCache[lang];
    return (map && typeof map === 'object') ? (map[g] || '') : '';
  }
  async function ensureTranslation(lang) {
    if (lang === 'en.sahih' || (translationCache[lang] && typeof translationCache[lang] === 'object')) {
      applyTranslations();
      return;
    }
    applyTranslations();
    showToast('جارٍ تحميل الترجمة…');
    try {
      const res = await fetch('https://api.alquran.cloud/v1/quran/' + lang);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const map = {};
      for (const s of data.data.surahs) {
        const start = surahStartGlobal[s.number] || 0;
        s.ayahs.forEach((a, i) => { map[start + i] = a.text; });
      }
      translationCache[lang] = map;
      applyTranslations();
    } catch (e) {
      showToast('تعذر تحميل الترجمة: ' + e.message);
    }
  }
  function applyTranslations() {
    document.querySelectorAll('.ayah-trans').forEach((n) => {
      const t = translationText(+n.dataset.g);
      n.textContent = t || '…';
      if (!t) n.classList.add('loading'); else n.classList.remove('loading');
    });
  }

  /* ---------- التجويد ---------- */
  const TAJWEED = {
    h: ['همزة الوصل', '#9aa0a6'], s: ['حرف ساكن', '#9aa0a6'], l: ['لام شمسية', '#9aa0a6'],
    p: ['مد طبيعي', '#537FFF'], n: ['مد طبيعي', '#4050FF'], o: ['مد واجب', '#2144C1'], m: ['مد لازم', '#000EBC'],
    q: ['قلقلة', '#DD0008'], g: ['غنة', '#FF7E1E'],
    f: ['إخفاء', '#9400A8'], c: ['إخفاء شفوي', '#D500B7'],
    w: ['إدغام شفوي', '#58B800'], i: ['إقلاب', '#26BFFD'],
    a: ['إدغام بغنة', '#169777'], u: ['إدغام بلا غنة', '#169200'],
    b: ['إدغام متقاربين', '#A1A1A1'], d: ['إدغام متجانسين', '#A1A1A1'],
  };
  function tajweedToHtml(text) {
    if (!text) return '';
    return text.replace(/\[([a-z])(?::\d+)?\[([^\]]*)\]/g, (m, code, content) => {
      const rule = TAJWEED[code];
      if (!rule) return esc(content);
      return '<span class="tj" style="color:' + rule[1] + '" data-tj="' + rule[0] + '">' + esc(content) + '</span>';
    });
  }

  /* ---------- أدوات نصية ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
  function normalize(t) {
    return (t || '').replace(TASHKEEL, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '')
      .replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
  }
  function highlight(ayahText, query) {
    const qNorm = normalize(query);
    if (!qNorm) return esc(ayahText);
    return ayahText.split(/(\s+)/).map((tok) => {
      if (/\s/.test(tok) || !tok) return tok;
      const n = normalize(tok);
      const bare = n.replace(/^[وفبكلس]/g, '');
      if (n.includes(qNorm) || bare.includes(qNorm)) return '<mark>' + esc(tok) + '</mark>';
      return esc(tok);
    }).join('');
  }

  /* ---------- الصوت ---------- */
  let playQueue = []; let playPos = -1;
  function audioUrl(g) {
    return 'https://cdn.islamic.network/quran/audio/128/' + readingPrefs.reciter + '/' + g + '.mp3';
  }
  function surahAudioUrl(num) {
    return 'https://cdn.islamic.network/quran/audio-surah/128/' + readingPrefs.reciter + '/' + num + '.mp3';
  }
  function playAyahAt(pos) {
    if (pos < 0 || pos >= playQueue.length) { clearPlaying(); return; }
    playPos = pos;
    const g = playQueue[pos];
    el.player.src = audioUrl(g);
    el.player.play().catch(() => {});
    markPlaying(g);
  }
  function startQueue(queue, pos) {
    playQueue = queue.slice();
    playAyahAt(pos);
  }
  function clearPlaying() {
    document.querySelectorAll('.play-ayah.playing').forEach((b) => b.classList.remove('playing'));
    document.querySelectorAll('.ayah-card.playing').forEach((b) => b.classList.remove('playing'));
  }
  function markPlaying(g) {
    clearPlaying();
    const btn = document.querySelector('.play-ayah[data-g="' + g + '"]');
    if (btn) { btn.classList.add('playing'); btn.closest('.ayah-card')?.classList.add('playing'); }
  }
  el.player.addEventListener('ended', () => { if (playPos < playQueue.length - 1) playAyahAt(playPos + 1); else clearPlaying(); });
  el.player.addEventListener('error', () => { showToast('تعذر تشغيل الصوت.'); clearPlaying(); });

  /* ---------- بطاقة الآية ---------- */
  let currentQueue = [];

  function ayahCard(surah, ayah, highlightQ) {
    const isTj = readingPrefs.tajweed && ayah.tj;
    const arabic = isTj ? tajweedToHtml(ayah.tj) : (highlightQ ? highlight(ayah.t, highlightQ) : esc(ayah.t));
    const trans = translationText(ayah.g);
    const hasWords = ayah.w && ayah.w.length;
    const hasTafsir = !!ayah.tf;
    return `
    <div class="ayah-card" data-g="${ayah.g}" data-s="${surah.num}" data-a="${ayah.n}">
      <div class="ayah-ref">
        <span class="ayah-num">${ayah.n}</span>
        <span>${esc(surah.name)}</span>
        <span class="sep">·</span>
        <span class="ref-num" dir="ltr">${surah.num}:${ayah.n}</span>
        ${ayah.sajda ? '<span class="sajda-badge" title="سجدة تلاوة">۩</span>' : ''}
        <span class="meta-mini">الجزء ${ayah.juz} · الصفحة ${ayah.page}</span>
      </div>
      <div class="ayah-body">
        <button class="play-ayah" data-g="${ayah.g}" title="استماع">▶</button>
        <div class="ayah-ar ${isTj ? 'tajweed' : ''}">${arabic}</div>
      </div>
      <div class="ayah-trans" data-g="${ayah.g}" dir="auto">${trans ? esc(trans) : ''}</div>
      <div class="ayah-tools">
        ${hasWords ? '<button class="tool" data-action="words" data-g="' + ayah.g + '">🔤 معاني الكلمات</button>' : ''}
        ${hasTafsir ? '<button class="tool" data-action="tafsir" data-g="' + ayah.g + '">📖 التفسير الميسر</button>' : ''}
      </div>
      <div class="ayah-extra"></div>
    </div>`;
  }

  function toggleExtra(g, kind) {
    const card = document.querySelector('.ayah-card[data-g="' + g + '"]');
    if (!card) return;
    const box = card.querySelector('.ayah-extra');
    const info = ayahIndex[g];
    if (!info) return;
    if (box.dataset.kind === kind && box.innerHTML) { box.innerHTML = ''; box.dataset.kind = ''; return; }
    box.dataset.kind = kind;
    if (kind === 'words') {
      const words = info.ayah.w || [];
      box.innerHTML = '<div class="words-grid">' + words.map(([ar, tr]) =>
        '<div class="word-chip"><span class="wc-ar">' + esc(ar) + '</span>' + (tr ? '<span class="wc-tr" dir="ltr">' + esc(tr) + '</span>' : '') + '</div>'
      ).join('') + '</div>';
    } else if (kind === 'tafsir') {
      box.innerHTML = info.ayah.tf
        ? '<div class="tafsir-box"><h4>التفسير الميسر — مجمع الملك فهد</h4><p>' + esc(info.ayah.tf) + '</p></div>'
        : '<p class="muted">لا يتوفر تفسير.</p>';
    }
  }

  /* ---------- فهرس السور ---------- */
  function renderIndex() {
    el.surahCount.textContent = SURAHS.length + ' سورة';
    el.surahList.innerHTML = SURAHS.map((s) => {
      const info = (s.revelationType === 'Meccan' ? 'مكية' : 'مدنية') + ' · ' + s.ayahs.length + ' آية';
      return '<button class="surah-item" data-num="' + s.num + '"><span class="surah-num">' + s.num +
        '</span><span class="surah-meta"><span class="surah-name">' + esc(s.name) +
        '</span><span class="surah-info">' + info + '</span></span></button>';
    }).join('');
  }

  /* ---------- عرض سورة ---------- */
  function openSurah(num) {
    const s = SURAHS.find((x) => x.num === num);
    if (!s) return;
    activeSurah = num;
    mode = 'text';
    setModeUI('text');
    el.searchInput.value = '';
    el.btnClear.classList.remove('show');
    el.welcome.style.display = 'none';
    el.results.classList.remove('show');
    el.surahView.classList.add('show');

    const isMeccan = s.revelationType === 'Meccan' ? 'مكية' : 'مدنية';
    const showBismillah = s.num !== 1 && s.num !== 9;
    currentQueue = s.ayahs.map((a) => a.g);

    el.surahView.innerHTML = `
      <div class="surah-head">
        <div class="h-top">
          <div>
            <div class="h-name">${esc(s.name)}</div>
            <div class="h-sub">
              <span>سورة ${s.num}</span><span>·</span><span>${isMeccan}</span><span>·</span><span>${s.ayahs.length} آية</span>
            </div>
          </div>
          <button class="play-surah" data-num="${s.num}">▶ استمع للسورة كاملة</button>
        </div>
        ${showBismillah ? '<div class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>' : ''}
      </div>
      <div class="ayahs">${s.ayahs.map((a) => ayahCard(s, a, '')).join('')}</div>
    `;
    updateActiveIndex(num);
    applyTranslations();
    ensureTranslation(readingPrefs.lang);
    el.viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function updateActiveIndex(num) {
    el.surahList.querySelectorAll('.surah-item').forEach((b) => b.classList.toggle('active', num != null && +b.dataset.num === num));
  }

  /* ---------- البحث النصي ---------- */
  let lastTextQuery = '', lastTextResults = [];
  function textSearch(query) {
    const q = normalize(query);
    if (!q) { el.searchHint.textContent = 'اكتب كلمة أو جملة للبحث الفوري في 6236 آية.'; return; }
    lastTextQuery = query;
    const results = [];
    for (const s of SURAHS) for (const a of s.ayahs) if (normalize(a.t).includes(q)) results.push({ surah: s, ayah: a });
    lastTextResults = results;
    renderTextResults(query, results);
  }
  function renderTextResults(query, results) {
    el.welcome.style.display = 'none';
    el.surahView.classList.remove('show');
    el.results.classList.add('show');
    el.searchHint.textContent = '';
    currentQueue = results.map((r) => r.ayah.g);
    if (!results.length) {
      el.results.innerHTML = '<div class="empty"><div class="big">🔍</div><p>لا توجد نتائج لـ «' + esc(query) + '».<br>جرّب كلمة أخرى، أو استخدم البحث الذكي للمعنى.</p></div>';
      return;
    }
    el.results.innerHTML =
      '<div class="results-head">نتائج البحث عن <strong>«' + esc(query) + '»</strong> — ' + results.length + ' نتيجة</div>' +
      results.map((r) => ayahCard(r.surah, r.ayah, query)).join('');
    applyTranslations();
    ensureTranslation(readingPrefs.lang);
  }

  /* ---------- البحث الذكي ---------- */
  const PROVIDERS = [
    { id: 'freellmapi', label: 'FreeLLMAPI (محلي)', baseUrl: '/api', upstream: 'http://localhost:3001/v1', model: 'auto', keyPh: 'freellmapi-…', keyHint: 'المفتاح الموحّد من صفحة Keys في FreeLLMAPI.' },
    { id: 'openrouter', label: 'OpenRouter', baseUrl: '/api', upstream: 'https://openrouter.ai/api/v1', model: 'deepseek/deepseek-chat', keyPh: 'sk-or-v1-…', keyHint: 'مفتاح من openrouter.ai (يبدأ بـ sk-or-v1-).' },
    { id: 'deepseek', label: 'DeepSeek', baseUrl: '/api', upstream: 'https://api.deepseek.com/v1', model: 'deepseek-chat', keyPh: 'sk-…', keyHint: 'مفتاح من platform.deepseek.com.' },
    { id: 'kimi', label: 'Kimi (Moonshot)', baseUrl: '/api', upstream: 'https://api.moonshot.ai/v1', model: 'kimi-k2-0711-preview', keyPh: 'sk-…', keyHint: 'مفتاح من platform.moonshot.ai.' },
    { id: 'mistral', label: 'Mistral', baseUrl: '/api', upstream: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', keyPh: 'مفتاح Mistral', keyHint: 'مفتاح من console.mistral.ai.' },
    { id: 'gemini', label: 'Google Gemini', baseUrl: '/api', upstream: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash', keyPh: 'AIza…', keyHint: 'مفتاح من aistudio.google.com (يبدأ بـ AIza).' },
    { id: 'openai', label: 'OpenAI (ChatGPT)', baseUrl: '/api', upstream: 'https://api.openai.com/v1', model: 'gpt-4o-mini', keyPh: 'sk-proj-…', keyHint: 'مفتاح من platform.openai.com.' },
    { id: 'zai', label: 'Z.ai (GLM)', baseUrl: '/api', upstream: 'https://api.z.ai/api/paas/v4', model: 'glm-4-flash', keyPh: 'id.secret', keyHint: 'مفتاح من z.ai/manage-apikey.' },
    { id: 'custom', label: 'مخصص (رابط مباشر)', baseUrl: 'https://', upstream: '', model: '', keyPh: '', keyHint: 'ضع رابط الـ API كاملاً في حقل الرابط.' },
  ];
  function providerById(id) { return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0]; }
  const DEFAULT_AI = { provider: 'freellmapi', apiKey: '', model: 'auto', baseUrl: '/api' };
  // تخفيف بسيط للمفتاح عند التخزين (base64) — ليس تشفيراً حقيقياً، لكنه يمنع القراءة العارضة.
  // الحماية الحقيقية من XSS تأتي من سياسة CSP في index.html.
  function encodeConfig(cfg) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(cfg)))); } catch { return JSON.stringify(cfg); }
  }
  function decodeConfig(s) {
    try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { try { return JSON.parse(s); } catch { return null; } }
  }
  function loadAI() {
    try {
      const raw = localStorage.getItem('quran_ai_config');
      if (!raw) return { ...DEFAULT_AI };
      return { ...DEFAULT_AI, ...(decodeConfig(raw) || {}) };
    } catch { return { ...DEFAULT_AI }; }
  }
  function saveAI(cfg) { localStorage.setItem('quran_ai_config', encodeConfig(cfg)); }
  function renderProviderOptions() { el.cfgProvider.innerHTML = PROVIDERS.map((p) => '<option value="' + p.id + '">' + p.label + '</option>').join(''); }
  function applyAIToForm() {
    const c = loadAI(); const p = providerById(c.provider);
    el.cfgProvider.value = c.provider; el.cfgApiKey.value = c.apiKey;
    el.cfgModel.value = c.model || p.model; el.cfgBaseUrl.value = c.baseUrl;
    syncProviderHints(c.provider);
  }
  function syncProviderHints(pid) {
    const p = providerById(pid);
    el.keyHint.textContent = p.keyHint; el.cfgApiKey.placeholder = p.keyPh || 'مفتاح الـ API';
    el.baseUrlHint.innerHTML = p.id === 'custom' ? 'ضع رابط الـ API كاملاً، مثال: <code>https://api.example.com/v1</code>.' : 'الافتراضي <code>/api</code> عبر الخادم المحلي — اتركه كما هو.';
  }
  function isRelativeUrl(u) { return !/^https?:\/\//i.test((u || '').trim()); }
  // في التطبيقات الأصلية (file:// / Capacitor / Electron) لا يوجد خادم محلي، فنستخدم رابط المزوّد مباشرة
  const IS_NATIVE = location.protocol === 'file:' || !!(window.Capacitor) || !!window.NATIVE;
  function llmRequestOptions(cfg, path) {
    let base = (cfg.baseUrl || '/api').replace(/\/+$/, '');
    const headers = {};
    if (path.endsWith('/chat/completions')) headers['Content-Type'] = 'application/json';
    if (cfg.apiKey) headers['Authorization'] = 'Bearer ' + cfg.apiKey;
    const p = providerById(cfg.provider);
    if (isRelativeUrl(base) && p && p.upstream) {
      if (IS_NATIVE) base = p.upstream;
      else headers['x-llm-base-url'] = p.upstream;
    }
    return { url: base + path, headers };
  }

  // تنفيذ طلب LLM: عبر جسر IPC آمن في سطح المكتب (Electron)، وإلا عبر fetch العادي
  async function aiFetch(req, body) {
    if (window.NATIVE && window.NATIVE.llmFetch) {
      const r = await window.NATIVE.llmFetch({
        url: req.url, method: body ? 'POST' : 'GET', headers: req.headers, body: body ? JSON.stringify(body) : undefined,
      });
      return {
        ok: r.ok, status: r.status,
        json: async () => { try { return JSON.parse(r.body || '{}'); } catch { return {}; } },
        text: async () => r.body || '',
      };
    }
    return fetch(req.url, { method: body ? 'POST' : 'GET', headers: req.headers, body: body ? JSON.stringify(body) : undefined });
  }

  let lastAiQuery = '', lastAiResolved = [];
  async function aiSearch(query) {
    const q = query.trim();
    if (!q) return;
    el.welcome.style.display = 'none';
    el.surahView.classList.remove('show');
    el.results.classList.add('show');
    el.searchHint.textContent = '';
    el.results.innerHTML = '<div class="ai-loading"><div class="spinner"></div><p style="margin-top:14px">جارٍ البحث الذكي… يرجى الانتظار</p></div>';
    const cfg = loadAI();
    if (!cfg.apiKey) {
      el.results.innerHTML = aiError('لم يتم ضبط مفتاح الـ API بعد.', 'افتح الإعدادات (⚙)، اختر المزوّد وأدخل مفتاحه.');
      openSettings();
      return;
    }
    const systemPrompt =
      'أنت مساعد بحث في القرآن الكريم. سيعطيك المستخدم سؤالاً أو وصفاً بالعربية أو الإنجليزية عن موضوع أو معنى. ' +
      'أجب فقط بصيغة JSON صالحة بدون أي نص إضافي، بالشكل التالي بالضبط:\n' +
      '{"results":[{"surah":2,"ayah":255,"note":"شرح مختصر لماذا تصلح الآية"}]}\n' +
      'surah رقم السورة (1-114)، ayah رقم الآية داخل السورة (يبدأ من 1). أعِد من 1 إلى 5 آيات مرتبة حسب الصلة. ' +
      'إذا لم تجد أرجع {"results":[]}. لا تخترع آيات غير موجودة.';
    const body = {
      model: cfg.model || 'auto',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: q }],
      response_format: { type: 'json_object' }, temperature: 0.2, max_tokens: 1000,
    };
    try {
      const req = llmRequestOptions(cfg, '/chat/completions');
      const res = await aiFetch(req, body);
      if (!res.ok) throw new Error('HTTP ' + res.status + ' — ' + (await res.text().catch(() => '')).slice(0, 200));
      const data = await res.json();
      const content = (data.choices && data.choices[0] && data.choices[0].message) ? (data.choices[0].message.content || '') : '';
      renderAiResults(q, parseAiJson(content), data.model || data.served_model);
    } catch (err) {
      const p = providerById(cfg.provider);
      el.results.innerHTML = aiError('تعذر الاتصال بمزوّد الذكاء الاصطناعي.', 'تحقق من تشغيل <code>node serve.mjs</code> وفتح <code>http://localhost:8080</code>، وصحة مفتاح ' + esc(p.label) + '. التفاصيل: ' + esc(err.message));
    }
  }
  function parseAiJson(content) {
    let obj = null;
    const m = content.match(/\{[\s\S]*\}/);
    if (m) { try { obj = JSON.parse(m[0]); } catch { obj = null; } }
    if (!obj) {
      const refs = []; const re = /(\d{1,3})\s*[:：]\s*(\d{1,3})/g; let mm;
      while ((mm = re.exec(content)) !== null) {
        const s = +mm[1], a = +mm[2];
        if (s >= 1 && s <= 114 && a >= 1) refs.push({ surah: s, ayah: a, note: '' });
        if (refs.length >= 5) break;
      }
      obj = { results: refs };
    }
    return obj;
  }
  function renderAiResults(query, parsed, servedModel) {
    lastAiQuery = query;
    const results = (parsed && Array.isArray(parsed.results)) ? parsed.results : [];
    const resolved = [];
    for (const r of results) {
      const surah = SURAHS.find((s) => s.num === +r.surah);
      if (!surah) continue;
      const ayah = surah.ayahs.find((a) => a.n === +r.ayah);
      if (!ayah) continue;
      resolved.push({ surah, ayah, note: r.note || '' });
    }
    lastAiResolved = resolved;
    currentQueue = resolved.map((r) => r.ayah.g);
    if (!resolved.length) {
      el.results.innerHTML = '<div class="empty"><div class="big">🤖</div><p>لم يتمكن النموذج من تحديد آيات مطابقة لـ «' + esc(query) + '».</p></div>';
      return;
    }
    const modelNote = servedModel ? ' — ' + servedModel : '';
    el.results.innerHTML =
      '<div class="results-head">نتائج البحث الذكي عن <strong>«' + esc(query) + '»</strong> — ' + resolved.length + ' آية' + modelNote + '</div>' +
      resolved.map((r) => {
        const card = ayahCard(r.surah, r.ayah, '');
        if (r.note) {
          return card.replace('<div class="ayah-tools">', '<div class="ai-note">💡 ' + esc(r.note) + '</div><div class="ayah-tools">');
        }
        return card;
      }).join('');
    applyTranslations();
    ensureTranslation(readingPrefs.lang);
  }
  function aiError(title, detail) {
    return '<div class="empty"><div class="big">⚠️</div><p><strong>' + esc(title) + '</strong></p><p style="margin-top:6px;font-size:13px">' + detail + '</p></div>';
  }

  /* ---------- وضعية البحث ---------- */
  let mode = 'text', activeSurah = null;
  function setModeUI(m) {
    mode = m;
    document.querySelectorAll('.mode-tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    el.searchHint.textContent = m === 'ai'
      ? 'اسأل بلغتك الطبيعية عن أي موضوع أو معنى، وسيبحث الذكاء الاصطناعي في الآيات.'
      : 'اكتب كلمة أو جملة للبحث الفوري في 6236 آية.';
    el.searchInput.placeholder = m === 'ai' ? 'مثال: آيات عن الصبر عند الشدائد…' : 'ابحث في الآيات…';
  }

  /* ---------- أشرطة القراءة ---------- */
  function renderReadingBar() {
    el.langSelect.innerHTML = TRANSLATIONS.map((t) => '<option value="' + t.id + '">' + t.label + '</option>').join('');
    el.reciterSelect.innerHTML = RECITERS.map((r) => '<option value="' + r.id + '">' + r.label + '</option>').join('');
    el.langSelect.value = readingPrefs.lang;
    el.reciterSelect.value = readingPrefs.reciter;
    el.tajweedToggle.checked = !!readingPrefs.tajweed;
  }
  function rerenderCurrent() {
    if (activeSurah != null) openSurah(activeSurah);
    else if (lastTextResults.length) renderTextResults(lastTextQuery, lastTextResults);
    else if (lastAiResolved.length) renderAiResults(lastAiQuery, { results: lastAiResolved.map((r) => ({ surah: r.surah.num, ayah: r.ayah.n, note: r.note })) });
  }

  /* ---------- نافذة الإعدادات ---------- */
  function openSettings() { applyAIToForm(); el.settingsModal.classList.add('show'); }
  function closeSettings() { el.settingsModal.classList.remove('show'); el.testResult.textContent = ''; el.testResult.className = 'test-result'; }
  function readFormConfig() {
    const p = providerById(el.cfgProvider.value || 'freellmapi');
    return {
      provider: el.cfgProvider.value || 'freellmapi',
      apiKey: el.cfgApiKey.value.trim(),
      model: el.cfgModel.value.trim() || p.model,
      baseUrl: el.cfgBaseUrl.value.trim() || p.baseUrl,
    };
  }
  async function testConnection() {
    const cfg = readFormConfig();
    el.testResult.className = 'test-result'; el.testResult.textContent = 'جارٍ الاختبار…';
    if (!cfg.apiKey) { setTestResult('أدخل مفتاح الـ API أولاً.', 'err'); return; }
    try {
      const req = llmRequestOptions(cfg, '/models');
      const res = await aiFetch(req, null);
      if (res.ok) {
        let count = 0; try { const d = await res.json(); count = (d.data && d.data.length) || 0; } catch {}
        setTestResult('✓ تم الاتصال بنجاح' + (count ? ' — ' + count + ' نموذج متاح' : '') + '.', 'ok');
      } else if (res.status === 401 || res.status === 403) {
        setTestResult('تم الوصول للمزوّد لكن رُفض المفتاح (HTTP ' + res.status + ').', 'err');
      } else {
        setTestResult('تعذر الاتصال (HTTP ' + res.status + '). تحقق من الرابط والمفتاح.', 'err');
      }
    } catch (e) {
      setTestResult('تعذر الوصول للمزوّد. تأكد من تشغيل `node serve.mjs`. التفاصيل: ' + e.message, 'err');
    }
  }
  function setTestResult(msg, cls) { el.testResult.textContent = msg; el.testResult.className = 'test-result ' + cls; }
  function showToast(msg) {
    el.toast.textContent = msg; el.toast.classList.add('show');
    clearTimeout(showToast._t); showToast._t = setTimeout(() => el.toast.classList.remove('show'), 2600);
  }

  /* ---------- الأحداث ---------- */
  function bindEvents() {
    el.surahList.addEventListener('click', (e) => {
      const btn = e.target.closest('.surah-item');
      if (btn) openSurah(+btn.dataset.num);
    });

    document.querySelectorAll('.mode-tab').forEach((b) => b.addEventListener('click', () => setModeUI(b.dataset.mode)));

    let debounceT;
    el.searchInput.addEventListener('input', () => {
      const v = el.searchInput.value;
      el.btnClear.classList.toggle('show', v.length > 0);
      clearTimeout(debounceT);
      if (mode === 'text') debounceT = setTimeout(() => { if (!v.trim()) { resetToBrowse(); return; } textSearch(v); }, 180);
    });
    el.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && mode === 'ai') { const v = el.searchInput.value.trim(); if (v) aiSearch(v); }
    });
    el.btnClear.addEventListener('click', () => { el.searchInput.value = ''; el.btnClear.classList.remove('show'); resetToBrowse(); });

    document.querySelectorAll('.tip').forEach((t) => t.addEventListener('click', () => {
      setModeUI('ai'); el.searchInput.value = t.dataset.q; el.btnClear.classList.add('show'); aiSearch(t.dataset.q);
    }));

    // أشرطة القراءة
    el.langSelect.addEventListener('change', () => { readingPrefs.lang = el.langSelect.value; saveReading(); ensureTranslation(readingPrefs.lang); });
    el.reciterSelect.addEventListener('change', () => { readingPrefs.reciter = el.reciterSelect.value; saveReading(); });
    el.tajweedToggle.addEventListener('change', () => { readingPrefs.tajweed = el.tajweedToggle.checked; saveReading(); rerenderCurrent(); });

    // تفويض النقر في العارض (تشغيل الصوت + الكلمات + التفسير)
    el.viewer.addEventListener('click', (e) => {
      const playBtn = e.target.closest('.play-ayah');
      if (playBtn) {
        const g = +playBtn.dataset.g;
        const idx = currentQueue.indexOf(g);
        startQueue(currentQueue, idx < 0 ? 0 : idx);
        return;
      }
      const tool = e.target.closest('.tool');
      if (tool) { toggleExtra(+tool.dataset.g, tool.dataset.action); return; }
      const playSurah = e.target.closest('.play-surah');
      if (playSurah) {
        clearPlaying(); playQueue = [];
        el.player.src = surahAudioUrl(+playSurah.dataset.num);
        el.player.play().catch(() => {});
      }
    });

    // الإعدادات
    el.btnSettings.addEventListener('click', openSettings);
    el.btnCloseSettings.addEventListener('click', closeSettings);
    el.settingsModal.addEventListener('click', (e) => { if (e.target === el.settingsModal) closeSettings(); });
    el.btnTest.addEventListener('click', testConnection);
    el.cfgProvider.addEventListener('change', () => {
      const p = providerById(el.cfgProvider.value);
      el.cfgModel.value = p.model;
      if (el.cfgBaseUrl.value === '/api' || el.cfgBaseUrl.value === '' || /^https?:\/\/$/.test(el.cfgBaseUrl.value)) el.cfgBaseUrl.value = p.baseUrl;
      syncProviderHints(p.id);
    });
    el.btnSave.addEventListener('click', () => { saveAI(readFormConfig()); closeSettings(); showToast('تم حفظ الإعدادات ✓'); });
  }

  function resetToBrowse() {
    el.welcome.style.display = '';
    el.results.classList.remove('show');
    el.surahView.classList.remove('show');
    el.results.innerHTML = ''; el.surahView.innerHTML = '';
    activeSurah = null; lastTextResults = []; lastAiResolved = []; currentQueue = [];
    updateActiveIndex(null);
  }

  /* ---------- التشغيل ---------- */
  renderIndex();
  renderReadingBar();
  renderProviderOptions();
  setModeUI('text');
  bindEvents();

  const hash = decodeURIComponent(location.hash || '').replace('#', '');
  if (/^\d{1,3}$/.test(hash) && +hash >= 1 && +hash <= 114) openSurah(+hash);
})();
