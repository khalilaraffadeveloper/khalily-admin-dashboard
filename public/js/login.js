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

firebase.auth().onAuthStateChanged(function(user) {
    if (user && sessionStorage.getItem('ARAVA_admin_logged_in') === 'true') {
        window.location.href = 'dashboard.html';
    }
});

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

    let matched = null;
    let role = 'supervisor';

    // 1. Try Firebase Authentication (Email/Password)
    if (auth) {
        try {
            const email = user.includes('@') ? user : `${user}@khalily.app`;
            await auth.signInWithEmailAndPassword(email, pass);
            const firebaseUser = auth.currentUser;
            if (firebaseUser) {
                // Check Firestore for admin role
                try {
                    const adminDoc = await db.collection('admins').where('authUid', '==', firebaseUser.uid).limit(1).get();
                    if (!adminDoc.empty) {
                        const data = adminDoc.docs[0].data();
                        matched = { name: data.name || user, isFirebase: true, role: data.role || 'supervisor' };
                    } else {
                        // Check by username
                        const byUser = await db.collection('admins').where('username', '==', user).limit(1).get();
                        if (!byUser.empty) {
                            const data = byUser.docs[0].data();
                            matched = { name: data.name || user, isFirebase: true, role: data.role || 'supervisor' };
                        } else {
                            matched = { name: user, isFirebase: true, role: 'supervisor' };
                        }
                    }
                } catch (e) {
                    matched = { name: user, isFirebase: true, role: 'supervisor' };
                }
            }
        } catch (authErr) {
            console.log('Firebase Auth failed:', authErr.code);
        }
    }

    // 2. Fallback: Firestore 'admins' collection (legacy)
    if (!matched && db) {
        try {
            const snapshot = await db.collection('admins')
                .where('username', '==', user)
                .where('password', '==', pass)
                .limit(1)
                .get();
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                matched = { username: user, name: data.name || user, role: data.role || 'supervisor' };
                // Migrate to Firebase Auth
                if (auth) {
                    try {
                        const email = `${user}@khalily.app`;
                        await auth.createUserWithEmailAndPassword(email, pass);
                        const firebaseUser = auth.currentUser;
                        if (firebaseUser) {
                            await doc.ref.update({ authUid: firebaseUser.uid });
                        }
                    } catch (e) {
                        if (e.code === 'auth/email-already-in-use') {
                            try {
                                await auth.signInWithEmailAndPassword(email, pass);
                                const firebaseUser = auth.currentUser;
                                if (firebaseUser) {
                                    await doc.ref.update({ authUid: firebaseUser.uid });
                                }
                            } catch (e2) {}
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('Firestore admin check failed:', err.message);
        }
    }

    if (matched) {
        sessionStorage.setItem('ARAVA_admin_logged_in', 'true');
        sessionStorage.setItem('ARAVA_admin_name', matched.name || matched.username || user);
        sessionStorage.setItem('ARAVA_admin_role', matched.role || 'supervisor');
        window.location.href = 'dashboard.html';
    } else {
        if (auth) {
            try { await auth.signOut(); } catch (e) {}
        }
        loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        document.getElementById('loginPass').value = '';
        document.getElementById('loginPass').focus();
    }

    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-left me-2"></i>تسجيل الدخول';
}
