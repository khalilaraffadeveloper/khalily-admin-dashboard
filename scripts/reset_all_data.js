const https = require('https');

const API_KEY = 'AIzaSyAkYQEb-aHo0Oft41tOAegVAyzH1fCmJWM';
const PROJECT_ID = 'ARAVA-app';
const FIREBASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function request(method, url, token, body) {
    return new Promise((resolve, reject) => {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;
        const req = https.request(url, opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); }
                    catch { resolve(data); }
                } else {
                    reject(new Error(`${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function signIn() {
    const data = await request('POST',
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        null,
        { email: 'khalilarafa@ARAVA.app', password: '5910852820', returnSecureToken: true }
    );
    console.log('✓ تم تسجيل الدخول');
    return data.idToken;
}

async function listDocs(token, collection) {
    try {
        const data = await request('GET', `${FIREBASE_URL}/${collection}?pageSize=500`, token);
        return data.documents ? data.documents.map(d => d.name.split('/').pop()) : [];
    } catch (e) {
        if (e.message.includes('404') || e.message.includes('NOT_FOUND')) return [];
        throw e;
    }
}

async function deleteDocs(token, collection, ids) {
    let deleted = 0;
    for (const id of ids) {
        await request('DELETE', `${FIREBASE_URL}/${collection}/${id}`, token);
        deleted++;
    }
    return deleted;
}

async function resetAll() {
    console.log('=== بداية مسح جميع البيانات (REST API) ===\n');
    const token = await signIn();

    const collections = ['rides', 'customers', 'drivers', 'messages', 'notifications'];
    for (const col of collections) {
        const ids = await listDocs(token, col);
        if (ids.length === 0) {
            console.log(`  ${col}: 0`);
            continue;
        }
        const deleted = await deleteDocs(token, col, ids);
        console.log(`  ${col}: ${deleted} تم الحذف`);
    }

    console.log('\n=== تم مسح جميع البيانات بنجاح ===');
    process.exit(0);
}

resetAll().catch(e => {
    console.error('خطأ:', e.message);
    process.exit(1);
});
