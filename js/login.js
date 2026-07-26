// ============================================
// KHALILY ADMIN LOGIN - login.js
// ============================================

const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'khalily2024'
};

// If already logged in, redirect to dashboard
if (sessionStorage.getItem('khalily_admin_logged_in') === 'true') {
    window.location.href = 'dashboard.html';
}

document.getElementById('loginBtn').addEventListener('click', doLogin);

document.getElementById('loginPass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
});
document.getElementById('loginUser').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
});

function doLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const errorEl = document.getElementById('loginError');

    if (!user || !pass) {
        errorEl.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
        return;
    }

    if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('khalily_admin_logged_in', 'true');
        errorEl.textContent = '';
        window.location.href = 'dashboard.html';
    } else {
        errorEl.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
    }
}
