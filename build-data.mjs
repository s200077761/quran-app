// سكربت بناء بيانات القرآن الكاملة (يعمل من الصفر):
// النص العثماني (مصحف مجمع الملك فهد) + الترجمة الإنجليزية + التجويد + التفسير الميسر
// + الكلمات كلمة كلمة + أرقام الأجزاء/الصفحات/السجدات
// الاستخدام:  node build-data.mjs   →  يُنتج quran-data.js
import { writeFileSync } from 'node:fs';

const AQ = 'https://api.alquran.cloud/v1';
async function getJson(path) {
  const r = await fetch(AQ + path);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + path);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
  return r.text();
}

console.log('جلب السور…');
const surahList = (await getJson('/surah')).data;
console.log('جلب النص العثماني…');
const uthmani = await getJson('/quran/quran-uthmani');
console.log('جلب الترجمة الإنجليزية…');
const en = await getJson('/quran/en.sahih');
console.log('جلب التجويد…');
const tajweed = (await getJson('/quran/quran-tajweed')).data.surahs;
console.log('جلب التفسير الميسر (مجمع الملك فهد)…');
const muyassar = (await getJson('/quran/ar.muyassar')).data.surahs;
console.log('جلب الكلمات كلمة كلمة…');
const wordbyword = (await getJson('/quran/quran-wordbyword-2')).data.surahs;
console.log('جلب بيانات الأجزاء والصفحات (Tanzil)…');
const xml = await getText('https://tanzil.net/res/text/metadata/quran-data.xml');

// البسملة الحرفية من أول آية في الفاتحة (تُحذف من مطلع السور)
const BISMILLAH = uthmani.data.surahs[0].ayahs[0].text.trim();

// بيانات Tanzil
const suraStarts = {};
for (const m of xml.matchAll(/<sura index="(\d+)" ayas="(\d+)" start="(\d+)"[^>]*\/>/g)) suraStarts[+m[1]] = +m[3];
const juzStarts = [];
for (const m of xml.matchAll(/<juz index="(\d+)" sura="(\d+)" aya="(\d+)" \/>/g)) juzStarts.push([suraStarts[+m[2]] + +m[3], +m[1]]);
const pageStarts = [];
for (const m of xml.matchAll(/<page index="(\d+)" sura="(\d+)" aya="(\d+)" \/>/g)) pageStarts.push([suraStarts[+m[2]] + +m[3], +m[1]]);
const sajdahs = new Set();
for (const m of xml.matchAll(/<sajda sura="(\d+)" aya="(\d+)"[^>]*\/>/g)) sajdahs.add(suraStarts[+m[1]] + +m[2]);
juzStarts.sort((a, b) => a[0] - b[0]);
pageStarts.sort((a, b) => a[0] - b[0]);
function boundary(arr, g) { let r = arr[0][1]; for (const [p, v] of arr) { if (p <= g) r = v; else break; } return r; }

const enSurahs = en.data.surahs;
const surahs = uthmani.data.surahs.map((s, si) => {
  const meta = surahList.find((x) => x.number === s.number) || {};
  const ayahs = s.ayahs.map((a, ai) => {
    let text = a.text.trim();
    if (a.numberInSurah === 1 && s.number !== 1 && s.number !== 9 && text.startsWith(BISMILLAH)) {
      text = text.slice(BISMILLAH.length).trim();
    }
    const g = suraStarts[s.number] + a.numberInSurah;
    let words = [];
    try { words = JSON.parse(wordbyword[si].ayahs[ai].text); } catch {}
    return {
      n: a.numberInSurah,
      g, juz: boundary(juzStarts, g), page: boundary(pageStarts, g), sajda: sajdahs.has(g),
      t: text,
      en: (enSurahs[si]?.ayahs[ai]?.text || '').trim(),
      tj: tajweed[si].ayahs[ai].text,
      tf: muyassar[si].ayahs[ai].text,
      w: words.map((w) => [w.word_arabic, w.word_translation]),
    };
  });
  return { num: s.number, name: meta.name || '', englishName: meta.englishName || '', revelationType: meta.revelationType || '', ayahs };
});

const out = {
  source: 'النص العثماني (رواية حفص عن عاصم) مطابق لمصحف مجمع الملك فهد لطباعة المصحف الشريف · التفسير الميسر (مجمع الملك فهد) · بيانات Tanzil/AlQuran.cloud',
  generatedAt: new Date().toISOString(),
  surahs,
};

writeFileSync('www/quran-data.js', 'window.QURAN_DATA = ' + JSON.stringify(out) + ';');
console.log('اكتمل: ' + surahs.length + ' سورة، ' + surahs.reduce((x, s) => x + s.ayahs.length, 0) + ' آية.');
console.log('حجم quran-data.js: ' + (new TextEncoder().encode('window.QURAN_DATA = ').length + JSON.stringify(out).length) / 1048576 | 0 + ' م.ب تقريباً');
