const { db } = require('../src/config/firebase');
const { collection, doc, setDoc, getDoc, getDocs, deleteDoc } = require('firebase/firestore');

// ══════════════════════════════════════════════════
// اختبار Firestore - إضافة وقراءة البيانات
// ══════════════════════════════════════════════════

async function testFirestore() {
    console.log('🔥 بدء اختبار Firestore...\n');

    try {
        // ═══════════════════════════════════════════
        // 1. إضافة مستند تجريبي
        // ═══════════════════════════════════════════
        console.log('📝 الخطوة 1: إضافة مستند تجريبي...');
        await setDoc(doc(db, 'drivers', 'test_driver_001'), {
            name: 'محمد ولد أحمد',
            phone: '22111111',
            vehicleType: 'motorcycle',
            credit: 5,
            isOnline: false,
            lat: 18.0735,
            lng: -15.9582,
            rating: 5.0,
            totalRides: 0,
            createdAt: new Date().toISOString()
        });
        console.log('✅ تم إضافة المستند بنجاح\n');

        // ═══════════════════════════════════════════
        // 2. قراءة المستند
        // ═══════════════════════════════════════════
        console.log('📖 الخطوة 2: قراءة المستند...');
        const docSnap = await getDoc(doc(db, 'drivers', 'test_driver_001'));
        if (docSnap.exists()) {
            console.log('✅ البيانات المُستخرجة:', docSnap.data());
        } else {
            console.log('❌ المستند غير موجود');
        }
        console.log('');

        // ═══════════════════════════════════════════
        // 3. قراءة جميع المستندات في المجموعة
        // ═══════════════════════════════════════════
        console.log('📋 الخطوة 3: قراءة جميع السائقين...');
        const querySnapshot = await getDocs(collection(db, 'drivers'));
        console.log(`✅ عدد السائقين في القاعدة: ${querySnapshot.size}`);
        querySnapshot.forEach((doc) => {
            console.log(`   - ${doc.id}: ${doc.data().name}`);
        });
        console.log('');

        // ═══════════════════════════════════════════
        // 4. حذف المستند التجريبي
        // ═══════════════════════════════════════════
        console.log('🗑️ الخطوة 4: حذف المستند التجريبي...');
        await deleteDoc(doc(db, 'drivers', 'test_driver_001'));
        console.log('✅ تم الحذف بنجاح\n');

        console.log('═══════════════════════════════════════');
        console.log('🎉 اختبار Firestore مكتمل بنجاح!');
        console.log('═══════════════════════════════════════');

    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error.message);
        console.error('');
        console.error('التشخيص:');
        console.error('1. تأكد من أن firebaseConfig صحيح في src/config/firebase.js');
        console.error('2. تأكد من أن Firestore مفعل في Firebase Console');
        console.error('3. تأكد من اتصالك بالإنترنت');
    }
}

// تشغيل الاختبار
testFirestore();
