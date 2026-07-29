const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAkYQEb-aHo0Oft41tOAegVAyzH1fCmJWM",
    authDomain: "khalily-app.firebaseapp.com",
    projectId: "khalily-app",
    storageBucket: "khalily-app.firebasestorage.app",
    messagingSenderId: "384215858598",
    appId: "1:384215858598:web:c19bf6d475c567285aa367",
    measurementId: "G-P8XMPWG9SY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRides() {
    console.log('=== فحص الرحلات في Firestore ===\n');

    const q = query(collection(db, 'rides'), orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('لا توجد أي رحلات في Firestore');
        return;
    }

    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`--- رحلة: ${doc.id} ---`);
        console.log(`  status: ${d.status}`);
        console.log(`  assignedDriverId: ${d.assignedDriverId || 'غير موجود'}`);
        console.log(`  notifiedDrivers: ${JSON.stringify(d.notifiedDrivers || [])}`);
        console.log(`  passengerName: ${d.passengerName || '-'}`);
        console.log(`  fare: ${d.fare || '-'}`);
        console.log(`  finalFare: ${d.finalFare || '-'}`);
        console.log(`  commissionAmount: ${d.commissionAmount || '-'}`);
        console.log(`  completedAt: ${d.completedAt || '-'}`);
        console.log('');
    });
}

checkRides().then(() => process.exit(0)).catch(err => {
    console.error('خطأ:', err.message);
    process.exit(1);
});
