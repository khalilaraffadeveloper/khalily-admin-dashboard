// ============================================
// KHALILY ADMIN LOGIN - login.js
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

if (sessionStorage.getItem('khalily_admin_logged_in') === 'true') {
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

    let matched = ADMIN_ACCOUNTS.find(a => a.username === user && a.password === pass);

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
            console.warn('Firestore admin check failed, using local accounts:', err.message);
        }
    }

    if (matched) {
        sessionStorage.setItem('khalily_admin_logged_in', 'true');
        sessionStorage.setItem('khalily_admin_name', matched.name);
        window.location.href = 'dashboard.html';
    } else {
        loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
    }

    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-left me-2"></i>تسجيل الدخول';
}
