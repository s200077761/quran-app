# القرآن الكريم — تطبيق مفتوح المصدر

تطبيق ويب + سطح مكتب + جوال للقرآن الكريم، مبني على **نص المصحف العثماني (رواية حفص عن عاصم) المطابق لمصحف مجمع الملك فهد لطباعة المصحف الشريف**، مع ترقيم الأجزاء والصفحات المطابق للمصحف (604 صفحات).

**الترخيص:** رخصة مزدوجة — [Apache License 2.0](LICENSE-APACHE) **أو** [MIT](LICENSE-MIT) (اختر ما يناسبك).

**المؤلف:** تمت البرمجة والتصميم بواسطة **الدكتور محمد بن سعد الأحيدب البدراني الدوسري** — msmbm2003@gmail.com — واتساب 00966558822528. (مرجع التصميم: [DESIGN.md](DESIGN.md))

## المزايا

- **نص المصحف المعتمد**: رسم عثماني مطابق لمصحف المدينة، مع رقم الجزء والصفحة وعلامة السجدة ۩.
- **بحث نصي فوري** (يتجاهل التشكيل ويبرز التطابق) و**بحث ذكي بالذكاء الاصطناعي** (OpenRouter / DeepSeek / Gemini / OpenAI / FreeLLMAPI…).
- **ترجمة بـ 15 لغة** تُحمَّل وتُحفَظ حسب الطلب.
- **قراءة صوتية** (ترتيل وتجويد) بستة قرّاء، لكل آية أو للسورة كاملة، مع تشغيل متتابع.
- **وضع التجويد الملوّن** بألوان الأحكام المعتمدة.
- **شرح المعاني**: التفسير الميسر (مجمع الملك فهد) + معاني الكلمات كلمةً كلمة.

## المنصّات

| المنصة | التقنية | طريقة البناء |
| --- | --- | --- |
| الويب | HTML/JS خالص | `node serve.mjs` |
| سطح المكتب (Linux/macOS/Windows) | Electron | `npm run desktop:dist` |
| Android (APK) | Capacitor | `npm run cap:add:android` ثم البناء بـ Gradle أو GitHub Actions |
| iPhone/iPad (iOS) | Capacitor | `npm run cap:add:ios` ثم البناء بـ Xcode (على macOS) |

## التشغيل (الويب)

```bash
npm install
node serve.mjs        # ثم افتح http://localhost:8080
```

> الخادم المحلي ضروري فقط للبحث الذكي على الويب (يُلغى قيد CORS). الصوت والترجمة يعملان مباشرة من الإنترنت.

## سطح المكتب (Electron)

```bash
npm install
npm run desktop                      # تشغيل مباشر
npm run desktop:dist                 # حزم AppImage / DMG / NSIS في مجلد release/
```

## الجوال (Android / iOS)

```bash
npm install
npm run cap:add:android              # توليد مشروع Android (android/)
npm run cap:add:ios                  # توليد مشروع iOS (ios/)

# Android APK (يتطلب Android SDK أو GitHub Actions):
cd android && ./gradlew assembleDebug   # → android/app/build/outputs/apk/debug/app-debug.apk

# iOS (يتطلب macOS + Xcode):
open ios/App/App.xcworkspace
```

> في التطبيقات الأصلية لا يوجد خادم محلي، لذا يتصل البحث الذكي بالمزوّد مباشرة (يدعمه OpenRouter وGemini لسماحهما بطلبات المتصفح).

## البناء الآلي (GitHub Actions)

سيرا العمل في `.github/workflows/`:
- **`build-android.yml`** — يبني APK (يعمل يدوياً أو عند وسم `v*`).
- **`build-desktop.yml`** — يبني AppImage (Linux) وDMG (macOS) وNSIS (Windows).

## بنية المشروع

| المسار | الوصف |
| --- | --- |
| `www/` | الواجهة (HTML/CSS/JS + بيانات القرآن) |
| `serve.mjs` | الخادم المحلي + وكيل الذكاء الاصطناعي |
| `build-data.mjs` | إعادة توليد بيانات القرآن من المصادر |
| `electron-main.js` | غلاف سطح المكتب (Electron) |
| `android/` · `ios/` | مشاريع Capacitor الأصلية |
| `.github/workflows/` | سير عمل البناء |

## المصادر والترخيص

الكود مرخّص برخصة مزدوجة (Apache-2.0 OR MIT). **بيانات القرآن** لها ترخيص منفصل (انظر [NOTICE](NOTICE)):
- النص العثماني وبيانات الأجزاء/الصفحات: [Tanzil](https://tanzil.net) (CC BY).
- الترجمات والتفسير الميسر (مجمع الملك فهد) والتجويد والكلمات: [AlQuran.cloud](https://alquran.cloud).
- الصوت: Islamic Network CDN.
