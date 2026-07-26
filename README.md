# Khalily - منظومة توصيل ذكية

منظومة متكاملة للتوصيل تتكون من تطبيق سائق أندرويد ولوحة تحكم إدارية على الويب.

## المكونات

| المكون | التقنية | الوصف |
|:---|:---|:---|
| `khalily_driver_app` | Kotlin + Jetpack Compose | تطبيق السائق مع تتبع الموقع والتنبيهات |
| `khalily_admin_dashboard` | Node.js + Express + Leaflet | لوحة تحكم مع خريطة مباشرة |
| `docs_and_configs` | Firebase Rules + Schema | قواعد الأمان ومخططات البيانات |

---

## التشغيل السريع

### 1. لوحة تحكم الإدارة

```bash
cd khalily_admin_dashboard
npm install
npm start
```

افتح المتصفح على: `http://localhost:3000`

**المتطلبات:**
- Node.js 18+ مثبت
- ملف `serviceAccountKey.json` من Firebase في `docs_and_configs/firebase/`

### 2. تطبيق السائق

**التثبيت عبر Android Studio:**
1. افتح Android Studio
2. `File > Open` واختر مجلد `khalily_driver_app`
3. انتظر اكتمال Gradle Sync
4. `Build > Build Bundle(s) / APK(s) > Build APK(s)`
5. سيتوفر APK في: `khalily_driver_app/app/build/outputs/apk/debug/app-debug.apk`

**التثبيت عبر السطر:**
```bash
cd khalily_driver_app
./gradlew assembleDebug
```

**المتطلبات:**
- ملف `google-services.json` من Firebase في `khalily_driver_app/app/`
- Android SDK 35+

### 3. تنظيف البيانات التلقائي

```bash
cd khalily_admin_dashboard
node scripts/data-cleanup.js
```

لتشغيل تلقائي كل 24 ساعة via cron:
```bash
0 3 * * * cd /path/to/khalily_admin_dashboard && node scripts/data-cleanup.js
```

---

## إعداد Firebase

1. أنشئ مشروع Firebase جديد على [console.firebase.google.com](https://console.firebase.google.com)
2. فعّل **Firestore Database**
3. فعّل **Cloud Messaging (FCM)**
4. حمّل `google-services.json` وضعه في `khalily_driver_app/app/`
5. حمّل `serviceAccountKey.json` وضعه في `docs_and_configs/firebase/`
6. انشر قواعد الأمان:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## هيكل المشروع

```
KHALILY_APP/
├── khalily_driver_app/          # تطبيق السائق (Android)
│   ├── app/src/main/
│   │   ├── AndroidManifest.xml
│   │   └── java/com/khalily/driver/
│   │       ├── KhalilyApp.kt
│   │       ├── MainActivity.kt
│   │       ├── data/model/       # نماذج البيانات
│   │       ├── service/          # خدمات الخلفية والـ FCM
│   │       ├── ui/screens/       # واجهات Jetpack Compose
│   │       ├── ui/theme/         # الألوان والتصميم
│   │       └── util/             # أدوات مساعدة
│   └── build.gradle.kts
│
├── khalily_admin_dashboard/     # لوحة التحكم (Web)
│   ├── public/                  # الواجهة الأمامية
│   │   ├── index.html
│   │   ├── css/style.css
│   │   └── js/app.js
│   ├── scripts/data-cleanup.js  # سكريبت التنظيف
│   └── server.js                # خادم Express
│
└── docs_and_configs/
    ├── firebase/
    │   ├── firestore.rules      # قواعد الأمان
    │   └── firestore.indexes.json
    └── database_schemas/
        └── firestore_schema.md
```

---

## ملاحظات تقنية

- **الخريطة في تطبيق السائق**: استخدام OSMDroid (مجاناً، لا يحتاج API key)
- **الخريطة في لوحة التحكم**: استخدام Leaflet.js + OpenStreetMap
- **التخزين المجاني**: Firestore free tier يكفي لـ 15-20 سائق بشكل متزامن
- **حماية البطارية**: تحديث الموقع كل 30 ثانية أو عند التحرك 50 متر
- **تنافس السائقين**: Firestore Transaction يضمن سائق واحد فقط لكل طلب

---

## الترخيص

مشروع خاص - غير مفتوح المصدر
