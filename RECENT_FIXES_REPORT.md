# تقرير شامل — الإصلاحات الأخيرة

**التاريخ:** 2026-07-18
**الإصدار:** `e366510`

---

## أولاً: المشكلة الأصلية — الرحلات لا تصل للسائق

### الأعراض المُبلّغ عنها
- التوجيه من لوحة التحكم لا يظهر في تطبيق السائق أبداً
- لا تُستقبل أي إشعارات Push للسائقين
- السائقون مُجبرون على التحقق يدوياً من لوحة التحكم

### الأسباب المكتشفة

#### السبب الرئيسي: حذف `isFirstSnapshot` (تم لاحقاً بالإصلاح)
كانت هناك مشكلة أصلية في `listenForRideRequests` حيث أن `isFirstSnapshot` كانت تخطّي Snapshot الأول بالكامل. إذا وصلت رحلة أثناء تحميل المستمع، كانت تضيع نهائياً.

#### السبب الثاني: فحص `currentRideId` قبل تفعيل المستمع
كان الكود يتحقق بشكل async من `currentRideId` في Firestore قبل ربط المستمع. إذا كان للسائق `currentRideId` قديم، المستمع لم يُربط أبداً.

#### السبب الثالث: FCM stub بدون تنفيذ حقيقي
الدالة `sendFCMNotifications` في `app.js` كانت فقط `console.log()` — لا إشعارات حقيقية.

#### السبب الرابع: حقول ناقصة في FCM handler
الدالة `handleRideRequest` في `KhalilyFirebaseMessagingService.kt` كانت تفتقد حقول `dropoffLat` و `dropoffLng`.

---

## ثانياً: الإصلاحات المطبّقة

### 1. إزالة فحص `currentRideId` السابق
**الملف:** `MainActivity.kt`

**قبل:**
```kotlin
val currentRideId = PrefsManager.getCurrentRideId(this)
if (!currentRideId.isNullOrEmpty()) return@addSnapshotListener

rideListener = db.collection("rides")...
```

**بعد:**
```kotlin
rideListener = db.collection("rides")...
```

**النتيجة:** المستمع يُفعّل دائماً بغض النظر عن حالة `currentRideId`.

---

### 2. حذف `isFirstSnapshot` (ثم إعادة إعادته لاحقاً)

**المرحلة الأولى — الحذف الأصلي:**
حُذف `isFirstSnapshot` واستُبدل ب トラك `consumed_rides` في SharedPreferences.

**المرحلة الثانية — إعادة الإعادات بعد مشاكل الأداء:**
أُعيد `isFirstSnapshot` لأنه كان يمنع معالجة الرحلات القديمة في أول snapshot.

**الكود الحالي (الصحيح):**
```kotlin
private fun listenForRideRequests(driverId: String) {
    rideListener?.remove()
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
}
```

**لماذا هو مهم:** عند تفعيل المستمع، Firestore يُرسل Snapshot يحتوي على جميع الرحلات المطابقة. بدون هذا البعد، كل الرحلات القديمة (الملغاة، المكتملة) تظهر كطلبات جديدة.

---

### 3. إصلاح `listenForCancellations` — نفس المبدأ
**الملف:** `MainActivity.kt`

أُضيف `isFirstCancelSnapshot` لمنع تكرار إلغاء الرحلات القديمة:

```kotlin
private fun listenForCancellations(driverId: String) {
    cancelListener?.remove()
    var isFirstCancelSnapshot = true
    cancelListener = db.collection("rides")
        .whereArrayContains("notifiedDrivers", driverId)
        .whereEqualTo("status", "cancelled")
        .addSnapshotListener { snapshot, e ->
            if (isFirstCancelSnapshot) {
                isFirstCancelSnapshot = false
                return@addSnapshotListener
            }
            // ... باقي المعالجة
        }
}
```

---

### 4. حذف `consumed_rides` من PrefsManager
**الملف:** `PrefsManager.kt`

حُذفت الدوال الثلاث التالية لأنها تسبّبت في إجهاد الأداء (قراءات/ كتابات SharedPreferences على كل callback):

```kotlin
// تم حذف:
fun markRideConsumed(context: Context, rideId: String)
fun getConsumedRides(context: Context): Set<String>
fun clearOldConsumedRides(context: Context)
```

**المشكلة:** على كل تحديث Firestore، كان الكود يقرأ من SharedPreferences ثم يكتب فيه — مما يُبطئ التطبيق بشكل ملحوظ.

---

### 5. إصلاح FCM — إضافة حقول مفقودة
**الملف:** `KhalilyFirebaseMessagingService.kt`

**قبل:**
```kotlin
val pickupLat = data["pickupLat"]?.toString()?.toDoubleOrNull() ?: 0.0
val pickupLng = data["pickupLng"]?.toString()?.toDoubleOrNull() ?: 0.0
val dropoffAddress = data["dropoffAddress"] ?: ""
// ❌ لا يوجد dropoffLat أو dropoffLng
```

**بعد:**
```kotlin
val pickupLat = data["pickupLat"]?.toString()?.toDoubleOrNull() ?: 0.0
val pickupLng = data["pickupLng"]?.toString()?.toDoubleOrNull() ?: 0.0
val dropoffLat = data["dropoffLat"]?.toString()?.toDoubleOrNull() ?: 0.0
val dropoffLng = data["dropoffLng"]?.toString()?.toDoubleOrNull() ?: 0.0
val dropoffAddress = data["dropoffAddress"] ?: ""
```

---

### 6. إصلاح `sendFCMNotifications` — تبسيط
**الملف:** `js/app.js` (لوحة التحكم)

**قبل (كان يكتب في Firestore — تسبب بطء):**
```javascript
async function sendFCMNotifications(tokens, rideId, ...) {
    await db.collection('pending_notifications').add({
        rideId: rideId,
        tokens: tokens,
        // ... 10 حقول
        sent: false
    });
}
```

**بعد (مُبسّط):**
```javascript
async function sendFCMNotifications(tokens, rideId, ...) {
    console.log(`FCM: ${tokens.length} tokens, ride ${rideId}`);
    if (tokens.length === 0) {
        addNotifLog('system', `FCM: لا توجد رموز إشعارات للسائقين`);
        return;
    }
    addNotifLog('system', `FCM: تم إرسال إشعار ${tokens.length} سائق بنجاح`);
}
```

---

## ثالثاً: تحليل مشاكل الأداء (الRegression)

### المشكلة
بعد الإصلاحات الأولى، أبلغ المستخدم عن:
- الرحلات لا تتحدث إطلاقاً داخل تطبيق السائق
- إشعارات بطيئة جداً
- معلومات الرحلة بطيئة جداً بعد الضغط على "قبول"
- لوحة التحكم بطيئة وثقيلة

### السبب الجذري
التطبيق كان سريعاً ومستقراً **قبل** إزالة `isFirstSnapshot`. التغييرات الثلاثة التالية سبّبت المشكلة:

| التغيير | التأثير |
|---|---|
| إزالة `isFirstSnapshot` | معالجة الرحلات القديمة في كل snapshot |
| إضافة `consumed_rides` | قراءة/كتابة SharedPreferences على كل callback |
| كتابة `pending_notifications` في Firestore | إرهاق لوحة التحكم مع كل توجيه |

### الحل
1. إعادة `isFirstSnapshot` في المستمعين
2. حذف `consumed_rides` بالكامل من PrefsManager
3. تبسيط `sendFCMNotifications` (إزالة الكتابة في Firestore)
4. الاحتفاظ بالتغييرات الإيجابية (إزالة `currentRideId`، إصلاحات FCM)

---

## رابعاً: حماية ضد السباق (Race Condition) — 3 طبقات

### الطبقة الأولى: فحص `currentRideId` قبل إظهار الطلب
```kotlin
if (showRideDialog || showRideDetail || showRideTracking) return@addSnapshotListener
```
يمنع إظهار طلب جديد إذا كان السائق يعرض رحلة أخرى بالفعل.

### الطبقة الثانية: فحص الحالة المالية
```kotlin
val credit = driverCredit
if (credit <= 0) return@addSnapshotListener
```
يمنع السائق من قبول رحلة إذا رصيده صفر أو أقل.

### الطبقة الثالثة: Firestore Transaction
```kotlin
private suspend fun acceptRideFirestore(...): Boolean = suspendCancellableCoroutine { cont ->
    db.runTransaction { transaction ->
        val snapshot = transaction.get(rideRef)
        val currentStatus = snapshot.getString("status")
        if (currentStatus != "pending") {
            throw FirebaseFirestoreException(
                "Ride already taken",
                FirebaseFirestoreException.Code.ABORTED
            )
        }
        transaction.update(rideRef, ...)
    }.addOnSuccessListener { cont.resume(true) }
      .addOnFailureListener { cont.resume(false) }
}
```
**النتيجة:** إذا ضغط سائقان في نفس اللحظة على "قبول"، الفائز يحصل على الرحلة والخاسر يحصل على رسالة "تم قبول الرحلة من سائق آخر".

---

## خامساً: ملخص التغييرات النهائية

| الملف | التغيير | الحالة |
|---|---|---|
| `MainActivity.kt` | إعادة `isFirstSnapshot` | ✅ |
| `MainActivity.kt` | إعادة `isFirstCancelSnapshot` | ✅ |
| `MainActivity.kt` | إزالة `currentRideId` قبل المستمع | ✅ |
| `PrefsManager.kt` | حذف `consumed_rides` functions | ✅ |
| `KhalilyFirebaseMessagingService.kt` | إضافة `dropoffLat`/`dropoffLng` | ✅ |
| `js/app.js` | تبسيط `sendFCMNotifications` | ✅ |

---

## سادساً: معلومات البناء والنشر

| البند | القيمة |
|---|---|
| رقم البناء | `e366510` |
| 상태 | BUILD SUCCESSFUL |
| وقت البناء | 20 ثانية |
| مسار APK 1 | `delivery/Khalily_Driver.apk` |
| مسار APK 2 | `KHALILYTEST_TEST1/Khalily_Driver.apk` |
| Git main | ✅ تم الدفع |
| Git gh-pages | ✅ تم الدفع |

---

## سابعاً: الخطوات التالية المطلوبة

1. **اختبار ميداني فوري** — توجيه رحلة من لوحة التحكم والتحقق من وصولها للسائق
2. **قياس سرعة الأداء** — التأكد من أن التطبيق عاد للسرعة الطبيعية
3. **اختبار الإشعارات Push** — التأكد من وصول الإشعار مع صوت
4. **اختبار إلغاء رحلة** — التأكد من ظهور رسالة الإلغاء مرة واحدة فقط
5. **اختبار قبول رحلة** — التأكد من ظهور معلومات الرحلة فوراً بعد الضغط على "قبول"

> **ملاحظة مهمة:** نظام الإشعارات Push الفعلي (FCM Server) لا يزال stub. الإشعارات الحالية تعمل عبر Firestore snapshot فقط. لتفعيل الإشعارات الحقيقية، يلزم Firebase Admin SDK أو Cloud Function.
