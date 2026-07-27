// ============================================
// KHALILY ADMIN DASHBOARD - app.js
// ============================================

let db = null;
let firebaseReady = false;
let commissionPercent = 10;

// ============================================
// ADMIN LOGIN
// ============================================
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'khalily2024'
};

function checkLogin() {
    const loggedIn = sessionStorage.getItem('khalily_admin_logged_in');
    if (loggedIn === 'true') {
        document.getElementById('loginOverlay').classList.add('hidden');
        initDashboard();
    }
}

document.getElementById('loginBtn').addEventListener('click', () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const errorEl = document.getElementById('loginError');
    if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('khalily_admin_logged_in', 'true');
        document.getElementById('loginOverlay').classList.add('hidden');
        errorEl.textContent = '';
        initDashboard();
    } else {
        errorEl.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
});

document.getElementById('loginPass').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('loginUser').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginPass').focus();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('khalily_admin_logged_in');
    location.reload();
});

// ============================================
// FIREBASE INIT
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

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;
    console.log('✅ Khalily Dashboard connected to Firestore:', firebaseConfig.projectId);
} catch (e) {
    console.error("Firebase init failed:", e);
}

function requireDb(caller) {
    if (!firebaseReady || !db) {
        if (caller) showStatus(caller, 'خطأ: Firebase غير مُعد.', 'error');
        return false;
    }
    return true;
}

// ============================================
// MAP INITIALIZATION
// ============================================
let map = null;
let driversMap = {};
let pickupMarker = null;
let pickupCoords = null;
let radiusCircle = null;

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([18.0735, -15.9582], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);

    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        pickupCoords = { lat, lng };
        if (pickupMarker) map.removeLayer(pickupMarker);
        if (radiusCircle) map.removeLayer(radiusCircle);
        const icon = L.divIcon({
            className: 'pickup-marker-wrapper',
            html: '<div class="pickup-marker">📍</div>',
            iconSize: [40, 40], iconAnchor: [20, 20]
        });
        pickupMarker = L.marker([lat, lng], { icon }).addTo(map);
        const radius = parseInt(document.getElementById('searchRadius').value) * 1000;
        radiusCircle = L.circle([lat, lng], {
            radius, color: '#1565C0', fillColor: '#42A5F5',
            fillOpacity: 0.15, weight: 2, dashArray: '8, 8'
        }).addTo(map);
        document.getElementById('pickupCoords').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        document.getElementById('dispatchBtn').disabled = false;
        updateFareDisplay();
    });
}

// ============================================
// FARE CALCULATION
// ============================================
function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateFareDisplay() {
    const radius = parseInt(document.getElementById('searchRadius').value) || 3;
    const fare = Math.round(200 + (radius * 150));
    document.getElementById('fareDisplay').value = `${fare} MRU (مسافة ~${radius} كم)`;
}

// ============================================
// STATE
// ============================================
let allDrivers = [];
let allRides = [];
let ridesListUnsubscribe = null;
let currentPage = 'map';

// ============================================
// CLOCK
// ============================================
function updateClock() {
    const now = new Date();
    const el = document.getElementById('currentTime');
    if (el) el.textContent = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================
// MOBILE MENU
// ============================================
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
});

// ============================================
// NAVIGATION
// ============================================
const pageTitles = {
    map: 'تتبع مباشر للسائقين',
    drivers: 'إدارة السائقين',
    rides: 'سجل الرحلات',
    settings: 'الإعدادات'
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        document.getElementById('pageTitle').textContent = pageTitles[page] || '';
        document.getElementById('liveBadge').style.display = page === 'map' ? '' : 'none';
        currentPage = page;
        if (page !== 'rides' && ridesListUnsubscribe) { ridesListUnsubscribe(); ridesListUnsubscribe = null; }
        if (page === 'drivers') loadDriversList();
        if (page === 'rides') loadRidesList();
        if (page === 'settings') loadCommission();
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
    });
});

// ============================================
// EXPAND / COLLAPSE
// ============================================
document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
        const target = header.dataset.toggle;
        if (!target) return;
        const body = document.getElementById('body-' + target);
        const icon = document.getElementById('toggle-' + target);
        if (body && icon) {
            body.classList.toggle('open');
            icon.classList.toggle('open');
            icon.textContent = body.classList.contains('open') ? '▲' : '▼';
        }
    });
});

// ============================================
// DISPATCH PANEL TOGGLE
// ============================================
document.getElementById('togglePanel').addEventListener('click', () => {
    const panel = document.getElementById('dispatchPanel');
    const btn = document.getElementById('togglePanel');
    panel.classList.toggle('collapsed');
    btn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
});

document.getElementById('searchRadius').addEventListener('input', (e) => {
    document.getElementById('radiusValue').textContent = `${e.target.value} كم`;
    if (radiusCircle && pickupCoords) radiusCircle.setRadius(e.target.value * 1000);
    updateFareDisplay();
});

document.getElementById('clearPickup').addEventListener('click', () => {
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (radiusCircle) map.removeLayer(radiusCircle);
    pickupMarker = null; pickupCoords = null; radiusCircle = null;
    document.getElementById('pickupCoords').value = '';
    document.getElementById('dispatchBtn').disabled = true;
    document.getElementById('fareDisplay').value = '';
});

// ============================================
// DISPATCH RIDE
// ============================================
document.getElementById('dispatchBtn').addEventListener('click', async () => {
    if (!requireDb('dispatchStatus')) return;

    const passengerName = document.getElementById('passengerName').value.trim();
    const passengerPhone = document.getElementById('passengerPhone').value.trim();
    const pickupAddress = document.getElementById('pickupAddress').value.trim();
    const dropoffAddress = document.getElementById('dropoffAddress').value.trim();
    const radius = parseInt(document.getElementById('searchRadius').value);

    if (!passengerName || !pickupCoords) {
        showStatus('dispatchStatus', 'يرجى إدخال اسم الزبون وتحديد نقطة الانطلاق', 'error');
        return;
    }

    const btn = document.getElementById('dispatchBtn');
    btn.disabled = true; btn.textContent = 'جاري الإرسال...';

    try {
        const fare = Math.round(200 + (radius * 150));
        const rideData = {
            passengerName, passengerPhone: passengerPhone || '',
            pickupLat: pickupCoords.lat, pickupLng: pickupCoords.lng,
            pickupAddress: pickupAddress || 'موقع على الخريطة',
            dropoffAddress: dropoffAddress || '',
            distanceKm: radius,
            searchRadiusKm: radius, fare,
            commissionPercent,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('rides').add(rideData);
        const nearby = await findNearbyDrivers(pickupCoords.lat, pickupCoords.lng, radius);

        if (nearby.length === 0) {
            showStatus('dispatchStatus', 'لا يوجد سائقون متاحون في النطاق', 'error');
            await db.collection('rides').doc(docRef.id).update({ status: 'no_drivers' });
        } else {
            const resp = await fetch('/api/dispatch-ride', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rideId: docRef.id, ...rideData, driverIds: nearby.map(d => d.id) })
            });
            if (resp.ok) {
                showStatus('dispatchStatus', `تم الإرسال! تم تنبيه ${nearby.length} سائق | السعر: ${fare} MRU`, 'success');
                clearForm();
            } else {
                const err = await resp.json();
                showStatus('dispatchStatus', err.error || 'حدث خطأ أثناء الإرسال', 'error');
            }
        }
    } catch (err) {
        console.error('Dispatch error:', err);
        showStatus('dispatchStatus', 'حدث خطأ في الاتصال: ' + err.message, 'error');
    }
    btn.disabled = false; btn.textContent = '📡 إرسال تنبيه جغرافي للسائقين';
});

// ============================================
// COMMISSION MANAGEMENT
// ============================================
async function loadCommission() {
    if (!requireDb()) return;
    try {
        const doc = await db.collection('settings').doc('app_config').get();
        if (doc.exists) {
            commissionPercent = doc.data().commissionPercent || 10;
        }
        document.getElementById('currentCommission').textContent = `${commissionPercent}%`;
        document.getElementById('newCommission').value = commissionPercent;
    } catch (e) {
        console.log('Commission load error, using default:', commissionPercent);
    }
}

window.saveCommission = async function () {
    if (!requireDb()) return;
    const val = parseFloat(document.getElementById('newCommission').value);
    if (isNaN(val) || val < 0 || val > 100) {
        alert('يرجى إدخال نسبة صحيحة (0-100)');
        return;
    }
    try {
        await db.collection('settings').doc('app_config').set(
            { commissionPercent: val },
            { merge: true }
        );
        commissionPercent = val;
        document.getElementById('currentCommission').textContent = `${val}%`;
        alert('تم حفظ النسبة بنجاح');
    } catch (e) {
        alert('حدث خطأ: ' + e.message);
    }
};

// ============================================
// DRIVER SEARCH BY PHONE
// ============================================
window.searchDriverByPhone = async function () {
    if (!requireDb()) return;
    const phone = document.getElementById('searchDriverPhone').value.trim();
    if (!phone) { alert('يرجى إدخال رقم الهاتف'); return; }

    const resultEl = document.getElementById('searchDriverResult');
    resultEl.innerHTML = '<p style="color:var(--text-secondary);">جاري البحث...</p>';

    try {
        const snapshot = await db.collection('drivers').where('phone', '==', phone).get();
        if (snapshot.empty) {
            resultEl.innerHTML = '<p style="color:var(--error);font-weight:600;">لم يتم العثور على سائق بهذا الرقم</p>';
            return;
        }
        const doc = snapshot.docs[0];
        const d = doc.data();
        resultEl.innerHTML = `
            <div style="background:var(--bg);padding:16px;border-radius:12px;">
                <p style="font-weight:700;font-size:16px;">${d.name || '-'}</p>
                <p style="font-size:13px;color:var(--text-secondary);">الهاتف: ${d.phone}</p>
                <p style="font-size:13px;color:var(--text-secondary);">الرصيد الحالي: <strong style="color:var(--primary);">${d.credit || 0} MRU</strong></p>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    <input type="number" id="quickCreditAmount" placeholder="المبلغ" min="1"
                        style="flex:1;padding:8px 12px;border:2px solid #E8E8E8;border-radius:8px;font-family:Cairo;font-size:14px;">
                    <button onclick="quickAddCredit('${doc.id}')"
                        style="padding:8px 16px;background:var(--success);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:Cairo;">
                        شحن الرصيد
                    </button>
                </div>
            </div>
        `;
    } catch (e) {
        resultEl.innerHTML = `<p style="color:var(--error);">خطأ: ${e.message}</p>`;
    }
};

window.quickAddCredit = async function (driverId) {
    const amount = parseFloat(document.getElementById('quickCreditAmount').value);
    if (!amount || amount <= 0) { alert('أدخل مبلغ صحيح'); return; }
    try {
        await db.collection('drivers').doc(driverId).update({
            credit: firebase.firestore.FieldValue.increment(amount)
        });
        alert(`تم شحن ${amount} MRU بنجاح`);
        document.getElementById('quickCreditAmount').value = '';
        searchDriverByPhone();
        if (currentPage === 'drivers') loadDriversList();
    } catch (e) {
        alert('خطأ: ' + e.message);
    }
};

// ============================================
// REAL-TIME LISTENERS
// ============================================
function initRealtimeListeners() {
    if (!db) return;

    db.collection('drivers').where('isOnline', '==', true)
        .onSnapshot(snapshot => {
            const onlineIds = new Set();
            snapshot.forEach(doc => {
                const data = doc.data();
                const id = doc.id;
                if (!data.lat || !data.lng) return;
                onlineIds.add(id);
                if (driversMap[id]) {
                    driversMap[id].marker.setLatLng([data.lat, data.lng]);
                } else {
                    const icon = L.divIcon({
                        className: 'driver-marker-wrapper',
                        html: '<div class="driver-marker">🛵</div>',
                        iconSize: [36, 36], iconAnchor: [18, 18]
                    });
                    const marker = L.marker([data.lat, data.lng], { icon }).addTo(map)
                        .bindPopup(`
                            <div style="font-family:Cairo;text-align:center;direction:rtl;">
                                <strong>${data.name || 'سائق'}</strong><br>
                                <small>دراجة نارية | رصيد: ${data.credit || 0} MRU</small><br>
                                <span style="color:#4CAF50;">● متاح</span>
                            </div>
                        `);
                    driversMap[id] = { marker, data };
                }
            });
            Object.keys(driversMap).forEach(id => {
                if (!onlineIds.has(id)) {
                    map.removeLayer(driversMap[id].marker);
                    delete driversMap[id];
                }
            });
            document.getElementById('onlineCount').textContent = onlineIds.size;
        });

    db.collection('rides').where('status', 'in', ['accepted', 'in_progress'])
        .onSnapshot(snapshot => {
            document.getElementById('rideCount').textContent = snapshot.size;
        });
}

// ============================================
// REGISTER NEW DRIVER
// ============================================
document.getElementById('registerDriverBtn').addEventListener('click', async () => {
    const statusEl = 'registerDriverStatus';
    if (!requireDb(statusEl)) return;

    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();
    const password = document.getElementById('newDriverPassword').value.trim();
    const vehicle = document.getElementById('newDriverVehicle').value;
    const credit = parseFloat(document.getElementById('newDriverCredit').value) || 0;

    if (!name) { showStatus(statusEl, 'يرجى إدخال اسم السائق', 'error'); return; }
    if (!phone) { showStatus(statusEl, 'يرجى إدخال رقم الهاتف', 'error'); return; }
    if (!password) { showStatus(statusEl, 'يرجى إدخال كلمة السر', 'error'); return; }

    const btn = document.getElementById('registerDriverBtn');
    btn.disabled = true; btn.textContent = 'جاري التسجيل...';

    try {
        await db.collection('drivers').add({
            name, phone, password, vehicleType: vehicle, credit,
            lat: 18.0735, lng: -15.9582, geohash: '',
            isOnline: false, disabled: false, currentRideId: null,
            rating: 5.0, totalRides: 0, fcmToken: '',
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showStatus(statusEl, `تم التسجيل بنجاح!`, 'success');
        document.getElementById('newDriverName').value = '';
        document.getElementById('newDriverPhone').value = '';
        document.getElementById('newDriverPassword').value = '';
        document.getElementById('newDriverCredit').value = '0';
        loadDriversList();
    } catch (err) {
        showStatus(statusEl, 'خطأ: ' + err.message, 'error');
    }
    btn.disabled = false; btn.textContent = 'تسجيل السائق';
});

// ============================================
// LOAD DRIVERS LIST
// ============================================
async function loadDriversList() {
    if (!requireDb('registerDriverStatus')) return;
    try {
        const snapshot = await db.collection('drivers').get();
        allDrivers = [];
        snapshot.forEach(doc => {
            allDrivers.push({ id: doc.id, ...doc.data() });
        });
        renderDriversList(allDrivers);
    } catch (err) {
        console.error('Load drivers error:', err);
    }
}

function renderDriversList(drivers) {
    const tbody = document.getElementById('driversTableBody');
    document.getElementById('totalDriversCount').textContent = drivers.length;

    if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">لا يوجد سائقون مسجلون</td></tr>';
        return;
    }

    tbody.innerHTML = drivers.map(d => {
        const status = d.disabled ? 'disabled' : (d.isOnline ? 'online' : 'offline');
        const statusLabel = d.disabled ? 'معطّل' : (d.isOnline ? 'متاح' : 'غير متاح');
        const badgeClass = `badge badge-${status}`;
        const safeName = (d.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `
        <tr>
            <td><strong>${d.name || '-'}</strong></td>
            <td>${d.phone || '-'}</td>
            <td>🛵</td>
            <td><strong>${d.credit || 0}</strong> MRU</td>
            <td><span class="${badgeClass}">${statusLabel}</span></td>
            <td>
                <div class="action-btns">
                    <button class="action-btn action-btn-edit" onclick="openEditModal('${d.id}','${safeName}','${d.phone||''}','${d.disabled?"disabled":"active"}')">تعديل</button>
                    <button class="action-btn action-btn-credit" onclick="openCreditModal('${d.id}','${safeName}',${d.credit||0})">شحن</button>
                    <button class="action-btn action-btn-toggle" onclick="toggleDriverStatus('${d.id}',${d.disabled||false})">${d.disabled ? 'تفعيل' : 'تعطيل'}</button>
                    <button class="action-btn action-btn-delete" onclick="openDeleteModal('${d.id}','${safeName}')">حذف</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('searchDrivers').addEventListener('input', filterDrivers);
document.getElementById('filterDriverStatus').addEventListener('change', filterDrivers);

function filterDrivers() {
    const query = document.getElementById('searchDrivers').value.toLowerCase();
    const status = document.getElementById('filterDriverStatus').value;
    let filtered = allDrivers.filter(d => {
        const matchQuery = !query || (d.name||'').toLowerCase().includes(query) || (d.phone||'').includes(query);
        let matchStatus = true;
        if (status === 'online') matchStatus = d.isOnline && !d.disabled;
        else if (status === 'offline') matchStatus = !d.isOnline && !d.disabled;
        else if (status === 'disabled') matchStatus = d.disabled;
        return matchQuery && matchStatus;
    });
    renderDriversList(filtered);
}

// ============================================
// EDIT DRIVER MODAL
// ============================================
window.openEditModal = function(id, name, phone, status) {
    document.getElementById('editDriverId').value = id;
    document.getElementById('editDriverName').value = name;
    document.getElementById('editDriverPhone').value = phone;
    document.getElementById('editDriverStatus').value = status;
    document.getElementById('editDriverModal').classList.add('active');
};

document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editDriverModal').classList.remove('active');
});
document.getElementById('cancelEditBtn').addEventListener('click', () => {
    document.getElementById('editDriverModal').classList.remove('active');
});

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('editDriverId').value;
    const name = document.getElementById('editDriverName').value.trim();
    const phone = document.getElementById('editDriverPhone').value.trim();
    const status = document.getElementById('editDriverStatus').value;
    if (!name) return;
    try {
        await db.collection('drivers').doc(id).update({
            name, phone, disabled: status === 'disabled'
        });
        document.getElementById('editDriverModal').classList.remove('active');
        loadDriversList();
    } catch (err) {
        console.error('Edit error:', err);
    }
});

// ============================================
// CREDIT TOP-UP MODAL
// ============================================
window.openCreditModal = function(id, name, current) {
    document.getElementById('creditDriverId').value = id;
    document.getElementById('creditDriverName').textContent = name;
    document.getElementById('creditDriverCurrent').textContent = current;
    document.getElementById('creditAmount').value = '';
    document.getElementById('creditModal').classList.add('active');
};

document.getElementById('closeCreditModal').addEventListener('click', () => {
    document.getElementById('creditModal').classList.remove('active');
});
document.getElementById('cancelCreditBtn').addEventListener('click', () => {
    document.getElementById('creditModal').classList.remove('active');
});

document.getElementById('confirmCreditBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('creditDriverId').value;
    const amount = parseFloat(document.getElementById('creditAmount').value);
    if (!amount || amount <= 0) return;
    try {
        await db.collection('drivers').doc(id).update({
            credit: firebase.firestore.FieldValue.increment(amount)
        });
        document.getElementById('creditModal').classList.remove('active');
        loadDriversList();
    } catch (err) {
        console.error('Credit error:', err);
    }
});

// ============================================
// TOGGLE / DELETE DRIVER
// ============================================
window.toggleDriverStatus = async function(id, currentlyDisabled) {
    if (!requireDb()) return;
    try {
        await db.collection('drivers').doc(id).update({
            disabled: !currentlyDisabled,
            isOnline: false
        });
        loadDriversList();
    } catch (err) {
        console.error('Toggle error:', err);
    }
};

window.openDeleteModal = function(id, name) {
    document.getElementById('deleteDriverId').value = id;
    document.getElementById('deleteDriverName').textContent = name;
    document.getElementById('deleteModal').classList.add('active');
};

document.getElementById('closeDeleteModal').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('active');
});
document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('active');
});

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('deleteDriverId').value;
    try {
        await db.collection('drivers').doc(id).delete();
        document.getElementById('deleteModal').classList.remove('active');
        loadDriversList();
    } catch (err) {
        console.error('Delete error:', err);
    }
});

// ============================================
// LOAD RIDES LIST
// ============================================
async function loadRidesList() {
    if (!requireDb()) return;
    if (ridesListUnsubscribe) { ridesListUnsubscribe(); ridesListUnsubscribe = null; }
    try {
        ridesListUnsubscribe = db.collection('rides').orderBy('createdAt', 'desc').limit(100)
            .onSnapshot(snapshot => {
                allRides = [];
                snapshot.forEach(doc => allRides.push({ id: doc.id, ...doc.data() }));
                const currentFilter = document.getElementById('filterRideStatus')?.value || 'all';
                if (currentFilter === 'all') renderRidesList(allRides);
                else renderRidesList(allRides.filter(r => r.status === currentFilter));
            }, err => {
                console.error('Rides listener error:', err);
            });
    } catch (err) {
        console.error('Load rides error:', err);
    }
}

function renderRidesList(rides) {
    const tbody = document.getElementById('ridesTableBody');
    if (rides.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">لا توجد رحلات مسجلة</td></tr>';
        return;
    }
    const statusLabels = {
        pending: 'قيد الانتظار', accepted: 'مقبولة', in_progress: 'جارية',
        completed: 'مكتملة', cancelled: 'ملغاة', no_drivers: 'بلا سائق', expired: 'منتهية'
    };
    tbody.innerHTML = rides.map(r => {
        const created = r.createdAt && r.createdAt.toDate
            ? new Date(r.createdAt.toDate()).toLocaleString('ar-MA')
            : (r.createdAt ? new Date(r.createdAt).toLocaleString('ar-MA') : '-');
        const dist = r.distanceKm || r.searchRadiusKm || '-';
        const fare = r.fare || 0;
        const comm = r.commissionAmount || Math.round(fare * commissionPercent / 100);
        return `
        <tr>
            <td>${r.passengerName || '-'}</td>
            <td>${r.pickupAddress || '-'}</td>
            <td>${r.dropoffAddress || '-'}</td>
            <td>${dist} كم</td>
            <td><strong>${fare}</strong> MRU</td>
            <td><strong style="color:var(--error);">${comm}</strong> MRU</td>
            <td><span class="badge badge-${r.status}">${statusLabels[r.status] || r.status}</span></td>
            <td>${created}</td>
        </tr>`;
    }).join('');
}

document.getElementById('filterRideStatus').addEventListener('change', () => {
    const status = document.getElementById('filterRideStatus').value;
    if (status === 'all') renderRidesList(allRides);
    else renderRidesList(allRides.filter(r => r.status === status));
});

// ============================================
// HELPERS
// ============================================
function findNearbyDrivers(lat, lng, radiusKm) {
    return new Promise(resolve => {
        const drivers = [];
        db.collection('drivers').where('isOnline', '==', true).get()
            .then(snapshot => {
                snapshot.forEach(doc => {
                    const d = doc.data();
                    if (d.lat && d.lng) {
                        const dist = haversine(lat, lng, d.lat, d.lng);
                        if (dist <= radiusKm) drivers.push({ id: doc.id, distance: dist, ...d });
                    }
                });
                resolve(drivers.sort((a, b) => a.distance - b.distance));
            })
            .catch(() => resolve([]));
    });
}

function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371, toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function showStatus(elId, msg, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = `dispatch-status ${type}`;
    setTimeout(() => { el.textContent = ''; el.className = 'dispatch-status'; }, 6000);
}

function clearForm() {
    ['passengerName','passengerPhone','pickupAddress','dropoffAddress','pickupCoords','fareDisplay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (radiusCircle) map.removeLayer(radiusCircle);
    pickupMarker = null; pickupCoords = null; radiusCircle = null;
    document.getElementById('searchRadius').value = 3;
    document.getElementById('radiusValue').textContent = '3 كم';
    document.getElementById('dispatchBtn').disabled = true;
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// ============================================
// INIT DASHBOARD
// ============================================
function initDashboard() {
    initMap();
    loadCommission();
    initRealtimeListeners();
    updateFareDisplay();
}

// Auto-init if already logged in
checkLogin();
