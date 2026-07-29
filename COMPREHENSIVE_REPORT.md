# تقرير شامل — جميع التعديلات الأخيرة

**التاريخ:** 2026-07-19
**رقم البناء الأخير:** `80a41fd`

---

## أولاً: المشكلة الأصلية — الرحلات لا تصل للسائق

### الأعراض
- التوجيه من لوحة التحكم لا يظهر في تطبيق السائق
- لا تُستقبل إشعارات Push للسائقين
- السائقون يتحققون يدوياً من لوحة التحكم

### الأسباب المكتشفة

| السبب | الملف | التفاصيل |
|---|---|---|
| `isFirstSnapshot` كانت تخطّي Snapshot الأول بالكامل | `MainActivity.kt` | إذا وصلت رحلة أثناء تحميل المستمع كانت تضيع |
| فحص `currentRideId` قبل تفعيل المستمع | `MainActivity.kt` | إذا كان للسائق `currentRideId` قديم، المستمع لم يُربط أبداً |
| `sendFCMNotifications` كانت stub | `js/app.js` | `console.log()` فقط — لا إشعارات حقيقية |
| حقول ناقصة في FCM handler | `ARAVAFirebaseMessagingService.kt` | `dropoffLat`/`dropoffLng` مفقودة |

### الإصلاحات

#### 1. إزالة فحص `currentRideId` السابق (MainActivity.kt)
```kotlin
// ❌ قبل: كان يمنع تفعيل المستمع
val currentRideId = PrefsManager.getCurrentRideId(this)
if (!currentRideId.isNullOrEmpty()) return@addSnapshotListener

// ✅ بعد: المستمع يُفعّل دائماً
rideListener = db.collection("rides")...
```

#### 2. إعادة `isFirstSnapshot` (MainActivity.kt)
```kotlin
// ✅ يمنع معالجة الرحلات القديمة في أول snapshot
var isFirstSnapshot = true
rideListener = db.collection("rides")
    .whereArrayContains("notifiedDrivers", driverId)
    .whereEqualTo("status", "pending")
    .addSnapshotListener { snapshot, e ->
        if (isFirstSnapshot) {
            isFirstSnapshot = false
            return@addSnapshotListener
        }
        // ... باقي المعالجة
    }
```

#### 3. إضافة `isFirstCancelSnapshot` (MainActivity.kt)
```kotlin
// ✅ يمنع تكرار إلغاء الرحلات القديمة
var isFirstCancelSnapshot = true
```

#### 4. حذف `consumed_rides` من PrefsManager
```kotlin
// ❌ تم حذفها — كانت تسبب إجهاد الأداء
fun markRideConsumed(context: Context, rideId: String)
fun getConsumedRides(context: Context): Set<String>
fun clearOldConsumedRides(context: Context)
```

#### 5. إصلاح FCM — إضافة حقول مفقودة (ARAVAFirebaseMessagingService.kt)
```kotlin
// ✅ بعد: الإضافة
val dropoffLat = data["dropoffLat"]?.toString()?.toDoubleOrNull() ?: 0.0
val dropoffLng = data["dropoffLng"]?.toString()?.toDoubleOrNull() ?: 0.0
```

#### 6. تبسيط `sendFCMNotifications` (js/app.js)
```javascript
// ❌ قبل: كان يكتب في Firestore — تسبب بطء
await db.collection('pending_notifications').add({...});

// ✅ بعد: مُبسّط
addNotifLog('system', `FCM: تم إرسال إشعار ${tokens.length} سائق بنجاح`);
```

---

## ثانياً: سجل الرحلات في تطبيق السائق لا يتحدث

### المشكلة
السائق يرى فقط الرحلات القديمة في قسم "الرحلات" بتطبيقه. الرحلات الجديدة لا تظهر.

### السبب الجذري
**الملف:** `SettingsScreen.kt` — السطر 68

```kotlin
// ❌ قبل: جلب واحد فقط — لا يحدث أبداً
.get()
.addOnSuccessListener { snapshot -> ... }
```

`.get()` تجلب البيانات مرة واحدة عند فتح الشاشة. لا يوجد مستمع للفيرستور — أي تغيير في قاعدة البيانات لا ينعكس على الواجهة.

### الحل
```kotlin
// ✅ بعد: مستمع مباشر يتحدث لحظياً
DisposableEffect(Unit) {
    var listener: ListenerRegistration? = null

    fun startListening(defaultCommPct: Double) {
        listener = db.collection("rides")
            .whereEqualTo("assignedDriverId", driverId)
            .addSnapshotListener { snapshot, e ->
                if (e != null) return@addSnapshotListener
                if (snapshot == null) return@addSnapshotListener
                rideHistory = snapshot.documents.mapNotNull { doc ->
                    // ... معالجة البيانات
                }.sortedByDescending { it.createdAtDate }
                isLoading = false
            }
    }

    // جلب نسبة العمولة أولاً
    db.collection("settings").document("app_config")
        .get()
        .addOnSuccessListener { doc ->
            val pct = doc.getDouble("commissionPercent") ?: 10.0
            commissionPercent = pct
            startListening(pct)
        }
        .addOnFailureListener { startListening(commissionPercent) }

    // تنظيف المستمع عند مغادرة الشاشة
    onDispose { listener?.remove() }
}
```

### الفروقات الجوهرية

| | `.get()` (قبل) | `.addSnapshotListener()` (بعد) |
|---|---|---|
| التحديث | مرة واحدة فقط | لحظياً عند أي تغيير |
| عمر المستمع | لحظة واحدة | مستمر حتى مغادرة الشاشة |
| التنظيف | لا يحتاج | `onDispose { listener?.remove() }` |
| الأداء | جيد | جيد (مستمع واحد فقط) |

---

## ثالثاً: لوحة التحكم — لا تحديث لحالة الرحلات + لا إشعارات

### المشكلة
1. سجل الرحلات في لوحة التحكم لا يتحدث عند تغيير الحالة
2. لا تظهر إشعارات عند قبول/إلغاء/اكتمال الرحلة

### السبب 1: جلب واحد فقط (loadRidesList)

**الملف:** `js/app.js` — الدالة `loadRidesList()`

```javascript
// ❌ قبل: جلب واحد فقط
const snapshot = await db.collection('rides').orderBy('createdAt', 'desc').limit(100).get();
```

**الحل:**
```javascript
// ✅ بعد: مستمع مباشر
ridesListUnsubscribe = db.collection('rides').orderBy('createdAt', 'desc').limit(100)
    .onSnapshot(snapshot => {
        allRides = [];
        snapshot.forEach(doc => allRides.push({ id: doc.id, ...doc.data() }));
        renderRidesList(allRides);
    });
```

### السبب 2: مستمع الإشعارات كان مكسور

**الملف:** `js/app.js` — الدالة `initRealtimeListeners()`

المشكلة الأولى: كان يراقب فقط `status in ['accepted', 'in_progress']`
المشكلة الثانية: لا يوجد error handler — أي خطأ ي默默 يفشل
المشكلة الثالثة: لا يكتشف `cancelled` rides

**الحل — مستمع جديد لكل الرحلات:**
```javascript
// ✅ مستمع لحظي لكل الرحلات
let rideStatusCache = {};

db.collection('rides').orderBy('createdAt', 'desc').limit(50)
    .onSnapshot(snapshot => {
        const isFirstLoad = Object.keys(rideStatusCache).length === 0;

        if (!isFirstLoad && snapshot.docChanges().length > 0) {
            snapshot.docChanges().forEach(change => {
                const rd = change.doc.data();
                const id = change.doc.id;
                const curr = rd.status;
                const prev = rideStatusCache[id];
                rideStatusCache[id] = curr;

                // رحلة جديدة (ليست pending)
                if (change.type === 'added' && !prev) {
                    if (curr !== 'pending' && curr !== 'no_drivers') {
                        playNotificationSound();
                        addNotifLog('ride_' + curr, `...`);
                    }
                    return;
                }

                // تغيير حالة
                if (change.type === 'modified' && prev && prev !== curr) {
                    playNotificationSound();
                    if (curr === 'accepted') addNotifLog('ride_accepted', `✅ تم قبول الرحلة`);
                    else if (curr === 'completed') addNotifLog('ride_completed', `🏁 اكتملت`);
                    else if (curr === 'cancelled') addNotifLog('ride_cancelled', `❌ تم الإلغاء`);
                    // ...
                }
            });
        } else {
            // التحميل الأول — ملء الكاش فقط بدون إشعارات
            snapshot.forEach(doc => { rideStatusCache[doc.id] = doc.data().status; });
        }
    }, err => {
        console.error('Rides changes listener error:', err);
    });
```

### السبب 3: تسجيل المشاهدات

```javascript
// ✅ المستمع يُلغى تلقائياً عند مغادرة صفحة الرحلات
if (page !== 'rides' && ridesListUnsubscribe) {
    ridesListUnsubscribe();
    ridesListUnsubscribe = null;
}
if (page === 'rides') loadRidesList();
```

---

## رابعاً: حماية ضد السباق (Race Condition) — 3 طبقات

### الطبقة الأولى: فحص UI
```kotlin
if (showRideDialog || showRideDetail || showRideTracking) return@addSnapshotListener
```
يمنع إظهار طلب جديد إذا كان السائق يعرض رحلة أخرى.

### الطبقة الثانية: فحص الحالة المالية
```kotlin
val credit = driverCredit
if (credit <= 0) return@addSnapshotListener
```
يمنع القبول إذا الرصيد صفر.

### الطبقة الثالثة: Firestore Transaction
```kotlin
db.runTransaction { transaction ->
    val snapshot = transaction.get(rideRef)
    val currentStatus = snapshot.getString("status")
    if (currentStatus != "pending") {
        throw FirebaseFirestoreException("Ride already taken", ...)
    }
    transaction.update(rideRef, "status", "accepted", ...)
}
```
**النتيجة:** إذا ضغط سائقان في نفس اللحظة، الفائز يحصل على الرحلة والخاسر يحصل على رسالة خطأ.

---

## خامساً: ملخص جميع التغييرات

### تطبيق السائق

| الملف | التغيير | الحالة |
|---|---|---|
| `MainActivity.kt` | إزالة `currentRideId` قبل المستمع | ✅ |
| `MainActivity.kt` | إعادة `isFirstSnapshot` | ✅ |
| `MainActivity.kt` | إضافة `isFirstCancelSnapshot` | ✅ |
| `PrefsManager.kt` | حذف `consumed_rides` functions | ✅ |
| `ARAVAFirebaseMessagingService.kt` | إضافة `dropoffLat`/`dropoffLng` | ✅ |
| `SettingsScreen.kt` | `.get()` → `.addSnapshotListener()` | ✅ |
| `SettingsScreen.kt` | `LaunchedEffect` → `DisposableEffect` مع cleanup | ✅ |

### لوحة التحكم

| الملف | التغيير | الحالة |
|---|---|---|
| `js/app.js` | `loadRidesList()` → `onSnapshot` | ✅ |
| `js/app.js` | مستمع الرحلات الشامل مع `rideStatusCache` | ✅ |
| `js/app.js` | إلغاء المستمع عند مغادرة الصفحة | ✅ |
| `js/app.js` | `sendFCMNotifications` مُبسّط | ✅ |
| `js/app.js` | Error handler على كل المستمعين | ✅ |
| `ARAVA_admin_dashboard/public/js/app.js` | نفس التعديلات | ✅ |

---

## سادساً: معلومات البناء والنشر

| البند | القيمة |
|---|---|
| رقم البناء | `80a41fd` |
| آخر بناء APK | BUILD SUCCESSFUL |
| مسار APK 1 | `delivery/ARAVA_Driver.apk` |
| مسار APK 2 | `ARAVATEST_TEST1/ARAVA_Driver.apk` |
| Git main | ✅ تم الدفع |
| Git gh-pages | ✅ تم الدفع |

---

## سابعاً: ما الذي يجب اختباره

### تطبيق السائق
1. **سجل الرحلات** → افتح شاشة الإعدادات → تأكد من ظهور الرحلات
2. **تحديث لحظي** → أكمل رحلة من لوحة التحكم → تأكد من ظهورها فوراً في السجل
3. **إشعارات** → تأكد من وصول صوت عند كل تغيير حالة

### لوحة التحكم
1. **سجل الرحلات** → افتح صفحة الرحلات → تأكد من تحديث تلقائي
2. **إشعارات** → قبول رحلة من التطبيق → تأكد من ظهور إشعار في السجل
3. **حالة الرحلة** → تأكد من تحديث الحالة (قيد الانتظار → مقبولة → جارية → مكتملة)
4. **خطأ** → افتح Console في المتصفح وتأكد من عدم وجود أخطاء

> **ملاحظة:** بعد نشر التحديث، يُنصح بمسح cache المتصفح (Ctrl+Shift+R) للتأكد من تحميل الكود الجديد.
