// ============================================
// ARAVA ADMIN LOGIN - login.js
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAkYQEb-aHo0Oft41tOAegVAyzH1fCmJWM",
    authDomain: "khalily-app.firebaseapp.com",
    projectId: "khalily-app",
    storageBucket: "khalily-app.firebasestorage.app",
    messagingSenderId: "384215858598",
    appId: "1:384215858598:web:c19bf6d475c567285aa367",
    measurementId: "G-P8XMPWG9SY"
};

let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} catch (e) {
    console.error("Firebase init failed:", e);
}

if (sessionStorage.getItem('ARAVA_admin_logged_in') === 'true') {
    window.location.href = 'dashboard.html';
}

const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

document.getElementById('loginPass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('loginUser').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
});
loginBtn.addEventListener('click', doLogin);

const ADMIN_ACCOUNTS = [
    { username: 'admin', password: 'khalily2024', name: 'المدير' },
    { username: 'khalily', password: 'khalily2024', name: 'Khalily Admin' },
    { username: '26067036', password: '5926', name: 'محمد سالم' },
    { username: 'khalilarafa', password: '5910852820', name: 'المدير العام' },
];

async function doLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!user || !pass) {
        loginError.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>جاري التحقق...';
    loginError.textContent = '';

    let matched = null;

    if (db && typeof firebase.auth === 'function') {
        try {
            const email = user.includes('@') ? user : `${user}@khalily.app`;
            await firebase.auth().signInWithEmailAndPassword(email, pass);
            matched = { name: user, isFirebase: true };
        } catch (authErr) {
            console.log('Firebase Auth failed:', authErr.code);
        }
    }

    // 2) Fallback: Firestore admins collection (legacy accounts)
    if (!matched && db) {
        try {
            const snapshot = await db.collection('admins')
                .where('username', '==', user)
                .where('password', '==', pass)
                .limit(1)
                .get();
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                matched = { username: user, password: pass, name: doc.data().name || user };
            }
        } catch (err) {
            console.warn('Firestore admin check failed:', err.message);
        }
    }

    if (!matched) {
        matched = ADMIN_ACCOUNTS.find(a => a.username === user && a.password === pass);
    }

    if (matched) {
        sessionStorage.setItem('ARAVA_admin_logged_in', 'true');
        sessionStorage.setItem('ARAVA_admin_name', matched.name || matched.username || user);
        window.location.href = 'dashboard.html';
    } else {
        if (typeof firebase.auth === 'function') {
            try { await firebase.auth().signOut(); } catch (e) {}
        }
        loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
    }

    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-left me-2"></i>تسجيل الدخول';
}
