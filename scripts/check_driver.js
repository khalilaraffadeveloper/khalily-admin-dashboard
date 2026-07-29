const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAkYQEb-aHo0Oft41tOAegVAyzH1fCmJWM",
    authDomain: "khalily-app.firebaseapp.com",
    projectId: "khalily-app",
    storageBucket: "khalily-app.firebasestorage.app",
    messagingSenderId: "384215858598",
    appId: "1:384215858598:web:c19bf6d475c567285aa367"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    const driverId = 'gDVB7iT61ZsxtxvcIHXA';
    
    console.log('=== Driver Document ===');
    const driverSnap = await getDoc(doc(db, 'drivers', driverId));
    if (driverSnap.exists()) {
        console.log('EXISTS:', JSON.stringify(driverSnap.data(), null, 2));
    } else {
        console.log('DRIVER NOT FOUND!');
    }
    
    console.log('\n=== Active Rides ===');
    const { collection, query, where, getDocs } = require('firebase/firestore');
    const q = query(collection(db, 'rides'), where('status', 'in', ['pending', 'accepted']));
    const snap = await getDocs(q);
    snap.forEach(d => {
        console.log(`Ride ${d.id}:`, JSON.stringify(d.data(), null, 2));
    });
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
