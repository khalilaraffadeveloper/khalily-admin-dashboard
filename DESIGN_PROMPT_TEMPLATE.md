أنت مصمم UI/UX محترف للتطبيقات العربية على أندرويد. مهمتك تصميم نظام بصري كامل لتطبيق "خليلي" (Khalily) — خدمة توصيل دراجات نارية في نواكشط، موريتانيا.

التقنية: Kotlin + Jetpack Compose + Material 3
الخط: Cairo من Google Fonts
اللغة: العربية فقط (RTL)
العملة: أوقية موريتانية (MRU)
الوضع: فاتح فقط (لا Dark Mode)
النمط: تصميم مسطح (Flat) بدون تدرجات

الألوان الأساسية: أزرق #0B1849، ذهبي #D4A843، أخضر #124D1C
المشكلة الرئيسية: الأزرق الداكن #0B1849 يُستخدم كخلفية كاملة وهو معيب — يجب استخدامه كلون عناوين فقط.
الخلفية المطلوبة: كريمية دافئة (وليس أبيض نقي).

المطلوب منك تزويدي بالthings التالية مباشرة كأكواد Kotlin جاهزة للنسخ:

---

الthing 1: ملف Color.kt

اكتب ملف Color.kt كامل يحتوي على:
- جميع ألوان النظام (primary, secondary, tertiary, surface, background, error, outline)
- ألوان لكل شاشة (loginTint, homeTint, rideRequestTint, historyTint, settingsTint)
- ألوان الحالات (pending, accepted, inProgress, completed, cancelled)
- ألوان الأزرار (primary, secondary, danger, ghost)
- ألوان النصوص على كل خلفية
- تأكد أن كل لون نص يحقق نسبة تباين 4.5:1 على الخلفية المرتبطة به
- لا تستخدم أبيض #FFFFFF كخلفية — استخدم كريمي مثل #F8F6F0 أو #FDF8EE
- الأزرق الداكن #0B1849 يُستخدم فقط في: عناوين الشاشات، شريط التنقل السفلي، نصوص على خلفية فاتحة

---

الthing 2: ملف Type.kt

اكتب ملف Type.kt يحتوي على شريحة خطوط كاملة بخط Cairo:

Display Large: للأرقام الكبيرة في البطاقات (مثل عدد الرحلات)
Display Medium: لأرقام الأرباح
Headline Large: لعناوين الشاشات الرئيسية
Headline Medium: لعناوين النوافذ المنبثقة
Title Large: لعناوين البطاقات
Title Medium: لعناوين العناصر في القوائم
Title Small: لعناوين الأقسام الفرعية
Body Large: للنص الرئيسي (وصف، عنوان)
Body Medium: للنص الثانوي (معلومات إضافية)
Body Small: للتوقيقات والتعليقات الصغيرة
Label Large: لنصوص الأزرار
Label Medium: لتسميات التبويبات
Label Small: للشارات والأرقام الصغيرة

ملاحظة: الأحجام العربية تحتاج أكبر بنسبة 10-15% من الإنجليزية. الخط العربي أعرض.

---

الthing 3: ملف Theme.kt

اكتب ملف Theme.kt يحتوي على:
- KhalilyTheme composable function
- MaterialTheme colorScheme مرتبط بالألوان من Color.kt
- MaterialTheme typography مرتبط بالخطوط من Type.kt
- دعم RTL عبر LocalLayoutDirection
- لا يوجد darkTheme parameter — فاتح فقط

---

الthing 4: مكونات UI

اكتب أكواد Compose جاهزة للنسخ لكل مكون:

أ) KhalilyCard — بطاقة بألوان مختلفة حسب النوع:
- DefaultCard: خلفية سطح محايدة
- AccentCard: خلفية ملونة حسب القسم
- UrgentCard: خلفية ذهبية لطلبات الرحلة (مهم جداً — يجب أن يلفت الانتباه)

ب) KhalilyButton — زر بأربعة أنماط:
- Primary: ممتلئ بلون أساسي، مستطيل الزوايا 12.dp
- Secondary: محدد بلون، خلفية شفافة
- Danger: أحمر للإجراءات التدميرية
- Ghost: نص فقط بدون خلفية

ج) RideInfoRow — صف معلومات يحتوي على:
- أيقونة بحجم 20.dp بلون.primary
- عنوان بخط Body Small بلون ثانوي
- قيمة بخط Title Medium بلون رئيسي
- فاصل بين الصفوف

د) StatusBadge — شارة حالة:
- شكل pill (مستطيل مستدير الزوايا 20.dp)
- ألوان مختلفة لكل حالة: قيد الانتظار (برتقالي)، مقبولة (أزرق)، جارية (أخضر غامق)، مكتملة (أخضر فاتح)، ملغاة (أحمر)

هـ) SectionHeader — عنوان قسم:
- خلفية بلون خفيف
- أيقونة + عنوان
- خط Title Medium عريض

---

الthing 5: تصميم شاشة تسجيل الدخول

اكتب composable يسمى LoginScreen يحتوي على:
- خلفية دافئة (مثل #FDF8EE أو كريمية مشابهة)
- شعار التطبيق في الأعلى (圈 circle بلون ذهبي)
- اسم "خليلي" بخط Headline Large
- حقل اسم المستخدم
- حقل كلمة المرور (قابلة لإظهار/إخفاء)
- زر تسجيل دخول كبير بلون primary
- معلومات الشركة في الأسفل (رقم الهاتف: 47717983)
- لا تستخدم خلفية زرقاء داكنة — خلفية دافئة فاتحة

---

الthing 6: تصميم شاشة طلب الرحلة (RideRequestDialog)

اكتب composable يسمى RideRequestDialog:
- نافذة منبثقة تملأ 90% من عرض الشاشة
- خلفية ذهبية/كركمية دافئة (#FFF8E1 أو مشابهة)
- أيقونة دراجة نارية ذهبية في الأعلى بنبض (pulse animation)
- عنوان "طلب رحلة جديدة!" بخط Headline Medium
- معلومات الزبون:
  - أيقونة شخص + اسم الزبون (Body Large)
  - أيقونة هاتف + رقم الزبون (Body Large)
- معلومات الرحلة في بطاقة:
  - نقطة الانطلاق (عنوان + إحداثيات)
  - نقطة الوجهة (عنوان + إحداثيات)
  - المسافة الفعلية (بخط كبير)
  - السعر (بخط عريض كبير ولون أخضر)
- زر "قبول الرحلة" أخضر كبير وعريض (56dp ارتفاع)
- زر "رفض" محدد بلون أحمر في الأسفل

---

الthing 7: تصميم شاشة سجل الرحلات

اكتب composable يسمى RideHistoryItem لعنصر واحد في القائمة:
- بطاقة بخلفية فاتحة متدرجة (خلفيتان متناوبتان)
- الجزء العلوي: اسم الزبون + شارة الحالة
- الجزء الأوسط: الانطلاق ← الوجهة مع أيقونات
- الجزء السفلي: المسافة | السعر | العمولة | صافي الأرباح
- العمولة بلون أحمر، صافي الأرباح بلون أخضر
- التاريخ والوقت في الزاوية
- حالة فارغة: رسالة "لا توجد رحلات بعد" بأيقونة دراجة شفافة

---

الthing 8: تصميم شاشة الإعدادات

اكتب SettingsScreen composable يحتوي على:
- تبويبات في الأعلى: الرحلات | الاتصال | الرصيد | حول
- كل تبويب بلون مختلف خفيف
- قسم الاتصال: بطاقة هاتف (أزرق) + بطاقة واتساب (أخضر)
- قسم الرصيد: تعليمات تزويد الرصيد
- قسم حول التطبيق: الاسم، الإصدار، الشركة، الشروط
- خلفية كل قسم بلون مختلف (أزرق فاتح، أخضر فاتح، ذهبي فاتح)

---

مهم: اكتب كل الكود أعلاه كأكواد Kotlin جاهزة للنسخ واللصق مباشرة في المشروع. لا تكتب وصفاً نصياً فقط — اكتب كود فعلي.

يجب أن تستخدم هذه الحزم:
- androidx.compose.material3.*
- androidx.compose.foundation.*
- androidx.compose.ui.*
- androidx.compose.runtime.*
- androidx.compose.animation.*
- androidx.compose.ui.unit.*
- androidx.compose.ui.graphics.*
- androidx.compose.ui.text.font.*
- androidx.compose.ui.text.style.*
- androidx.compose.ui.text.input.*
- androidx.compose.foundation.shape.RoundedCornerShape
- androidx.compose.foundation.layout.*
- androidx.compose.material.icons.Icons
- androidx.compose.material.icons.filled.*
