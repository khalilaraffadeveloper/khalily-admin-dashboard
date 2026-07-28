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
let auth = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
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

    try {
        // Try Firebase Auth first (email = username@khalily.app)
        const email = `${user}@khalily.app`;
        await auth.signInWithEmailAndPassword(email, pass);

        // Verify admin in Firestore
        if (db) {
            const snapshot = await db.collection('admins')
                .where('username', '==', user)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                sessionStorage.setItem('khalily_admin_logged_in', 'true');
                sessionStorage.setItem('khalily_admin_name', data.name || user);
                sessionStorage.setItem('khalily_admin_role', data.role || 'admin');
                window.location.href = 'dashboard.html';
                return;
            }
        }

        // Allow login even without admin doc if auth succeeded
        sessionStorage.setItem('khalily_admin_logged_in', 'true');
        sessionStorage.setItem('khalily_admin_name', user);
        sessionStorage.setItem('khalily_admin_role', 'admin');
        window.location.href = 'dashboard.html';
    } catch (authErr) {
        // Firebase Auth failed - fallback to hardcoded admin account
        const ADMIN_ACCOUNTS = [
            { username: 'khalilarafa', password: '5910852820', name: 'الخليل عرفه', role: 'super_admin' },
        ];

        let matched = ADMIN_ACCOUNTS.find(a => a.username === user && a.password === pass);

        if (matched) {
            sessionStorage.setItem('khalily_admin_logged_in', 'true');
            sessionStorage.setItem('khalily_admin_name', matched.name);
            sessionStorage.setItem('khalily_admin_role', matched.role || 'admin');
            window.location.href = 'dashboard.html';
        } else {
            loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
            document.getElementById('loginPass').value = '';
            document.getElementById('loginPass').focus();
        }
    }

    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-left me-2"></i>تسجيل الدخول';
}
