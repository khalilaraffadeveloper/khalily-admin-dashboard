const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAkYQEb-aHo0Oft41tOAegVAyzH1fCmJWM",
    authDomain: "ARAVA-app.firebaseapp.com",
    projectId: "ARAVA-app",
    storageBucket: "ARAVA-app.firebasestorage.app",
    messagingSenderId: "384215858598",
    appId: "1:384215858598:web:c19bf6d475c567285aa367"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanup() {
    const snapshot = await getDocs(collection(db, 'rides'));
    console.log(`Found ${snapshot.size} rides to delete`);
    let deleted = 0;
    for (const d of snapshot.docs) {
        await deleteDoc(doc(db, 'rides', d.id));
        deleted++;
    }
    console.log(`Deleted ${deleted} rides`);
    
    const d2 = await getDocs(collection(db, 'drivers'));
    for (const driver of d2.docs) {
        const data = driver.data();
        if (data.currentRideId) {
            await deleteDoc.ref.update ? undefined : undefined;
        }
    }
}

cleanup().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
