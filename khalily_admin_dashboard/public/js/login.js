// ============================================
// KHALILY ADMIN LOGIN - login.js (Firestore)
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

async function doLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();

    if (!user || !pass) {
        loginError.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
        return;
    }

    if (!db) {
        loginError.textContent = 'خطأ في الاتصال بقاعدة البيانات';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>جاري التحقق...';
    loginError.textContent = '';

    try {
        const snapshot = await db.collection('admins')
            .where('username', '==', user)
            .where('password', '==', pass)
            .limit(1)
            .get();

        if (snapshot.empty) {
            loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
            document.getElementById('loginPass').value = '';
            document.getElementById('loginPass').focus();
        } else {
            const adminDoc = snapshot.docs[0];
            sessionStorage.setItem('khalily_admin_logged_in', 'true');
            sessionStorage.setItem('khalily_admin_name', adminDoc.data().name || user);
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        loginError.textContent = 'خطأ في الاتصال: ' + err.message;
    }

    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-left me-2"></i>تسجيل الدخول';
}
