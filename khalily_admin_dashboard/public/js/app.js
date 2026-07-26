// ============================================
// KHALILY ADMIN DASHBOARD - app.js (Bootstrap 5)
// ============================================

let db = null;
let firebaseReady = false;
let commissionPercent = 10;

// ============================================
// AUTH CHECK
// ============================================
if (sessionStorage.getItem('khalily_admin_logged_in') !== 'true') {
    window.location.href = 'index.html';
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('khalily_admin_logged_in');
    window.location.href = 'index.html';
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
// STATE
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
            html: '<div style="background:#0B1849;border:3px solid white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);color:white;font-size:20px;">📍</div>',
            iconSize: [40, 40], iconAnchor: [20, 20]
        });
        pickupMarker = L.marker([lat, lng], { icon }).addTo(map);
        const radius = parseInt(document.getElementById('searchRadius').value) * 1000;
        radiusCircle = L.circle([lat, lng], {
            radius, color: '#0B1849', fillColor: '#D4A843',
            fillOpacity: 0.15, weight: 2, dashArray: '8, 8'
        }).addTo(map);
        document.getElementById('pickupCoords').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        document.getElementById('dispatchBtn').disabled = false;
    });
}

// ============================================
// STATE
// ============================================
let allDrivers = [];
let allRides = [];
let currentPage = 'map';

// ============================================
// SOUND NOTIFICATION
// ============================================
let audioCtx = null;

function playNotificationSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        [800, 1000, 1200, 1000, 800].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.15);
            osc.start(audioCtx.currentTime + i * 0.15);
            osc.stop(audioCtx.currentTime + i * 0.15 + 0.15);
        });
    } catch (e) {}
}

function requestAudioPermission() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        gain.gain.value = 0;
        osc.start(); osc.stop(audioCtx.currentTime + 0.01);
    } catch (e) {}
}
document.addEventListener('click', requestAudioPermission, { once: true });

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
// NAVIGATION
// ============================================
const pageTitles = {
    map: 'تتبع مباشر للسائقين',
    drivers: 'إدارة السائقين',
    rides: 'سجل الرحلات',
    settings: 'الإعدادات'
};

function navigateToPage(page) {
    document.querySelectorAll('.sidebar-link').forEach(n => n.classList.remove('active'));
    document.querySelectorAll(`.sidebar-link[data-page="${page}"]`).forEach(n => n.classList.add('active'));
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('d-none'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.remove('d-none');
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = pageTitles[page] || '';
    const titleMobile = document.getElementById('pageTitleMobile');
    if (titleMobile) titleMobile.textContent = (pageTitles[page] || '').substring(0, 20);
    const liveBadge = document.getElementById('liveBadge');
    if (liveBadge) liveBadge.classList.toggle('d-none', page !== 'map');
    currentPage = page;
    if (page === 'drivers') loadDriversList();
    if (page === 'rides') loadRidesList();
    if (page === 'settings') loadCommission();
}

document.querySelectorAll('.sidebar-link').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage(item.dataset.page);
    });
});

// ============================================
// DISPATCH OFFCANVAS (Bootstrap handles show/hide)
// ============================================

document.getElementById('searchRadius').addEventListener('input', (e) => {
    document.getElementById('radiusValue').textContent = `${e.target.value} كم`;
    if (radiusCircle && pickupCoords) radiusCircle.setRadius(e.target.value * 1000);
});

document.getElementById('clearPickup').addEventListener('click', () => {
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (radiusCircle) map.removeLayer(radiusCircle);
    pickupMarker = null; pickupCoords = null; radiusCircle = null;
    document.getElementById('pickupCoords').value = '';
    document.getElementById('dispatchBtn').disabled = true;
    document.getElementById('fareInput').value = 350;
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
    const fare = parseFloat(document.getElementById('fareInput').value) || 0;

    if (!passengerName || !pickupCoords) {
        showStatus('dispatchStatus', 'يرجى إدخال اسم الزبون وتحديد نقطة الانطلاق', 'error');
        return;
    }
    if (!fare || fare <= 0) {
        showStatus('dispatchStatus', 'يرجى إدخال سعر صحيح للرحلة', 'error');
        return;
    }

    const btn = document.getElementById('dispatchBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جاري الإرسال...';

    try {
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
            showStatus('dispatchStatus', `تم الإرسال! تم تنبيه ${nearby.length} سائق | السعر: ${fare} MRU`, 'success');
            clearForm();
            setTimeout(() => {
                const offcanvasEl = document.getElementById('dispatchOffcanvas');
                const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
                if (offcanvas) offcanvas.hide();
            }, 1500);
        }
    } catch (err) {
        showStatus('dispatchStatus', 'حدث خطأ: ' + err.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>إرسال تنبيه للسائقين';
});

// ============================================
// COMMISSION
// ============================================
async function loadCommission() {
    if (!requireDb()) return;
    try {
        const doc = await db.collection('settings').doc('app_config').get();
        if (doc.exists) commissionPercent = doc.data().commissionPercent || 10;
        document.getElementById('currentCommission').textContent = `${commissionPercent}%`;
        document.getElementById('newCommission').value = commissionPercent;
    } catch (e) {
        console.log('Commission load error');
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
        await db.collection('settings').doc('app_config').set({ commissionPercent: val }, { merge: true });
        commissionPercent = val;
        document.getElementById('currentCommission').textContent = `${val}%`;
        alert('تم حفظ النسبة بنجاح');
    } catch (e) {
        alert('خطأ: ' + e.message);
    }
};

// ============================================
// DRIVER SEARCH
// ============================================
window.searchDriverByPhone = async function () {
    if (!requireDb()) return;
    const phone = document.getElementById('searchDriverPhone').value.trim();
    if (!phone) { alert('أدخل رقم الهاتف'); return; }
    const resultEl = document.getElementById('searchDriverResult');
    resultEl.innerHTML = '<div class="text-muted"><i class="bi bi-hourglass-split"></i> جاري البحث...</div>';

    try {
        const snapshot = await db.collection('drivers').where('phone', '==', phone).get();
        if (snapshot.empty) {
            resultEl.innerHTML = '<div class="alert alert-danger py-2">لم يتم العثور على سائق</div>';
            return;
        }
        const doc = snapshot.docs[0];
        const d = doc.data();
        resultEl.innerHTML = `
            <div class="bg-light rounded-3 p-3">
                <p class="fw-bold mb-1">${d.name || '-'}</p>
                <p class="text-muted small mb-1">الهاتف: ${d.phone} | الرصيد: <strong class="text-gold">${d.credit || 0} MRU</strong></p>
                <div class="input-group input-group-sm mt-2">
                    <input type="number" class="form-control" id="quickCreditAmount" placeholder="المبلغ" min="1">
                    <button class="btn btn-success text-white fw-bold" onclick="quickAddCredit('${doc.id}')">شحن</button>
                </div>
            </div>`;
    } catch (e) {
        resultEl.innerHTML = `<div class="alert alert-danger py-2">${e.message}</div>`;
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
        searchDriverByPhone();
        if (currentPage === 'drivers') loadDriversList();
    } catch (e) {
        alert('خطأ: ' + e.message);
    }
};

// ============================================
// REAL-TIME LISTENERS
// ============================================
let activeRidesMap = {};
let firstRidesSnapshot = true;

function initRealtimeListeners() {
    if (!db) return;

    // Active rides listener with sound
    db.collection('rides').where('status', 'in', ['accepted', 'in_progress'])
        .onSnapshot(snapshot => {
            if (!firstRidesSnapshot && snapshot.docChanges().length > 0) {
                const hasNew = snapshot.docChanges().some(c => c.type === 'added');
                if (hasNew) playNotificationSound();
            }
            firstRidesSnapshot = false;

            document.getElementById('rideCount').textContent = snapshot.size;
            const mobileCount = document.querySelector('.rideCount-mobile');
            if (mobileCount) mobileCount.textContent = snapshot.size;

            snapshot.forEach(doc => {
                const r = doc.data();
                const id = doc.id;
                if (!r.pickupLat || !r.pickupLng) return;
                if (activeRidesMap[id]) {
                    activeRidesMap[id].marker.setLatLng([r.pickupLat, r.pickupLng]);
                } else {
                    const icon = L.divIcon({
                        className: 'ride-marker-wrapper',
                        html: `<div style="background:${r.status==='in_progress'?'#2E7D32':'#E65100'};border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);color:white;font-size:18px;">🎫</div>`,
                        iconSize: [38, 38], iconAnchor: [19, 19]
                    });
                    const statusLabel = r.status === 'in_progress' ? 'جارية' : 'مقبولة';
                    const marker = L.marker([r.pickupLat, r.pickupLng], { icon })
                        .bindPopup(`<div style="font-family:Cairo;text-align:center;direction:rtl;"><strong>${r.passengerName || 'زبون'}</strong><br><small>${r.pickupAddress || ''} → ${r.dropoffAddress || ''}</small><br><strong>${r.fare || 0} MRU</strong><br><span style="color:${r.status==='in_progress'?'#2E7D32':'#E65100'};">● ${statusLabel}</span></div>`)
                        .addTo(map);
                    activeRidesMap[id] = { marker, data: r };
                }
            });

            Object.keys(activeRidesMap).forEach(id => {
                if (!snapshot.docs.find(d => d.id === id)) {
                    map.removeLayer(activeRidesMap[id].marker);
                    delete activeRidesMap[id];
                }
            });
        });

    // Drivers online listener
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
                        html: '<div style="background:#0B1849;border:3px solid white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);color:white;font-size:18px;">🛵</div>',
                        iconSize: [36, 36], iconAnchor: [18, 18]
                    });
                    const marker = L.marker([data.lat, data.lng], { icon }).addTo(map)
                        .bindPopup(`<div style="font-family:Cairo;text-align:center;direction:rtl;"><strong>${data.name || 'سائق'}</strong><br><small>دراجة نارية | رصيد: ${data.credit || 0} MRU</small><br><span style="color:#2E7D32;">● متاح</span></div>`);
                    driversMap[id] = { marker, data };
                }
            });
            Object.keys(driversMap).forEach(id => {
                if (!onlineIds.has(id)) { map.removeLayer(driversMap[id].marker); delete driversMap[id]; }
            });
            document.getElementById('onlineCount').textContent = onlineIds.size;
            const mobileCount = document.querySelector('.onlineCount-mobile');
            if (mobileCount) mobileCount.textContent = onlineIds.size;
        });
}

// ============================================
// REGISTER DRIVER
// ============================================
document.getElementById('registerDriverBtn').addEventListener('click', async () => {
    const statusEl = 'registerDriverStatus';
    if (!requireDb(statusEl)) return;
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();
    const password = document.getElementById('newDriverPassword').value.trim();
    const vehicle = document.getElementById('newDriverVehicle')?.value || 'motorcycle';
    const credit = parseFloat(document.getElementById('newDriverCredit').value) || 0;

    if (!name) { showStatus(statusEl, 'أدخل اسم السائق', 'error'); return; }
    if (!phone) { showStatus(statusEl, 'أدخل رقم الهاتف', 'error'); return; }
    if (!password) { showStatus(statusEl, 'أدخل كلمة السر', 'error'); return; }

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
        showStatus(statusEl, 'تم التسجيل بنجاح!', 'success');
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
// DRIVERS LIST
// ============================================
async function loadDriversList() {
    if (!requireDb()) return;
    try {
        const snapshot = await db.collection('drivers').get();
        allDrivers = [];
        snapshot.forEach(doc => allDrivers.push({ id: doc.id, ...doc.data() }));
        renderDriversList(allDrivers);
    } catch (err) {
        console.error('Load drivers error:', err);
    }
}

function renderDriversList(drivers) {
    const tbody = document.getElementById('driversTableBody');
    document.getElementById('totalDriversCount').textContent = drivers.length;
    if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">لا يوجد سائقون</td></tr>';
        return;
    }
    tbody.innerHTML = drivers.map(d => {
        const status = d.disabled ? 'disabled' : (d.isOnline ? 'online' : 'offline');
        const label = d.disabled ? 'معطّل' : (d.isOnline ? 'متاح' : 'غير متاح');
        const badgeClass = `badge bg-${status === 'online' ? 'success' : status === 'disabled' ? 'danger' : 'secondary'}`;
        const safeName = (d.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<tr>
            <td><strong>${d.name || '-'}</strong></td>
            <td>${d.phone || '-'}</td>
            <td><strong>${d.credit || 0}</strong> MRU</td>
            <td><span class="${badgeClass}">${label}</span></td>
            <td>
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn-action btn-action-edit" onclick="openEditModal('${d.id}','${safeName}','${d.phone||''}','${d.disabled?"disabled":"active"}')">تعديل</button>
                    <button class="btn-action btn-action-credit" onclick="openCreditModal('${d.id}','${safeName}',${d.credit||0})">شحن</button>
                    <button class="btn-action btn-action-toggle" onclick="toggleDriverStatus('${d.id}',${d.disabled||false})">${d.disabled ? 'تفعيل' : 'تعطيل'}</button>
                    <button class="btn-action btn-action-delete" onclick="openDeleteModal('${d.id}','${safeName}')">حذف</button>
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
    renderDriversList(allDrivers.filter(d => {
        const matchQ = !query || (d.name||'').toLowerCase().includes(query) || (d.phone||'').includes(query);
        let matchS = true;
        if (status === 'online') matchS = d.isOnline && !d.disabled;
        else if (status === 'offline') matchS = !d.isOnline && !d.disabled;
        else if (status === 'disabled') matchS = d.disabled;
        return matchQ && matchS;
    }));
}

// ============================================
// BOOTSTRAP MODALS
// ============================================
const editModal = new bootstrap.Modal(document.getElementById('editDriverModal'));
const creditModal = new bootstrap.Modal(document.getElementById('creditModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));

window.openEditModal = function(id, name, phone, status) {
    document.getElementById('editDriverId').value = id;
    document.getElementById('editDriverName').value = name;
    document.getElementById('editDriverPhone').value = phone;
    document.getElementById('editDriverStatus').value = status;
    editModal.show();
};

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('editDriverId').value;
    const name = document.getElementById('editDriverName').value.trim();
    const phone = document.getElementById('editDriverPhone').value.trim();
    const status = document.getElementById('editDriverStatus').value;
    if (!name) return;
    try {
        await db.collection('drivers').doc(id).update({ name, phone, disabled: status === 'disabled' });
        editModal.hide();
        loadDriversList();
    } catch (err) { console.error('Edit error:', err); }
});

window.openCreditModal = function(id, name, current) {
    document.getElementById('creditDriverId').value = id;
    document.getElementById('creditDriverName').textContent = name;
    document.getElementById('creditDriverCurrent').textContent = current;
    document.getElementById('creditAmount').value = '';
    creditModal.show();
};

document.getElementById('confirmCreditBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('creditDriverId').value;
    const amount = parseFloat(document.getElementById('creditAmount').value);
    if (!amount || amount <= 0) return;
    try {
        await db.collection('drivers').doc(id).update({ credit: firebase.firestore.FieldValue.increment(amount) });
        creditModal.hide();
        loadDriversList();
    } catch (err) { console.error('Credit error:', err); }
});

window.toggleDriverStatus = async function(id, currentlyDisabled) {
    if (!requireDb()) return;
    try {
        await db.collection('drivers').doc(id).update({ disabled: !currentlyDisabled, isOnline: false });
        loadDriversList();
    } catch (err) { console.error('Toggle error:', err); }
};

window.openDeleteModal = function(id, name) {
    document.getElementById('deleteDriverId').value = id;
    document.getElementById('deleteDriverName').textContent = name;
    deleteModal.show();
};

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('deleteDriverId').value;
    try {
        await db.collection('drivers').doc(id).delete();
        deleteModal.hide();
        loadDriversList();
    } catch (err) { console.error('Delete error:', err); }
});

// ============================================
// RIDES LIST
// ============================================
async function loadRidesList() {
    if (!requireDb()) return;
    try {
        const snapshot = await db.collection('rides').orderBy('createdAt', 'desc').limit(100).get();
        allRides = [];
        snapshot.forEach(doc => allRides.push({ id: doc.id, ...doc.data() }));
        renderRidesList(allRides);
    } catch (err) { console.error('Load rides error:', err); }
}

function renderRidesList(rides) {
    const tbody = document.getElementById('ridesTableBody');
    if (rides.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">لا توجد رحلات</td></tr>';
        return;
    }
    const labels = { pending: 'قيد الانتظار', accepted: 'مقبولة', in_progress: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة', no_drivers: 'بلا سائق' };
    const colors = { pending: 'warning', accepted: 'primary', in_progress: 'success', completed: 'purple', cancelled: 'danger', no_drivers: 'secondary' };
    const canCancel = ['pending', 'accepted', 'in_progress'];
    tbody.innerHTML = rides.map(r => {
        const created = r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleString('ar-MA') : '-';
        const fare = r.fare || 0;
        const comm = r.commissionAmount || Math.round(fare * commissionPercent / 100);
        const cancelBtn = canCancel.includes(r.status)
            ? `<button class="btn-action btn-action-delete mt-1" onclick="cancelRide('${r.id}')">إلغاء</button>` : '';
        return `<tr>
            <td><strong>${r.passengerName || '-'}</strong></td>
            <td class="d-none d-md-table-cell">${r.pickupAddress || '-'}</td>
            <td class="d-none d-md-table-cell">${r.dropoffAddress || '-'}</td>
            <td><strong>${fare}</strong> MRU</td>
            <td><strong class="text-danger">${comm}</strong> MRU</td>
            <td><span class="badge bg-${colors[r.status] || 'secondary'}">${labels[r.status] || r.status}</span></td>
            <td class="d-none d-lg-table-cell"><small>${created}</small></td>
            <td>${cancelBtn}</td>
        </tr>`;
    }).join('');
}

window.cancelRide = async function (rideId) {
    if (!confirm('هل أنت متأكد من إلغاء هذه الرحلة؟')) return;
    if (!requireDb()) return;
    try {
        await db.collection('rides').doc(rideId).update({ status: 'cancelled' });
        if (currentPage === 'rides') loadRidesList();
    } catch (err) { alert('خطأ: ' + err.message); }
};

document.getElementById('filterRideStatus').addEventListener('change', () => {
    const s = document.getElementById('filterRideStatus').value;
    renderRidesList(s === 'all' ? allRides : allRides.filter(r => r.status === s));
});

// ============================================
// HELPERS
// ============================================
function findNearbyDrivers(lat, lng, radiusKm) {
    return new Promise(resolve => {
        db.collection('drivers').where('isOnline', '==', true).get()
            .then(snapshot => {
                const drivers = [];
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
    el.className = type === 'error' ? 'text-danger fw-semibold mt-2' : 'text-success fw-semibold mt-2';
    setTimeout(() => { el.textContent = ''; el.className = ''; }, 6000);
}

function clearForm() {
    ['passengerName','passengerPhone','pickupAddress','dropoffAddress','pickupCoords'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (radiusCircle) map.removeLayer(radiusCircle);
    pickupMarker = null; pickupCoords = null; radiusCircle = null;
    document.getElementById('searchRadius').value = 3;
    document.getElementById('radiusValue').textContent = '3 كم';
    document.getElementById('dispatchBtn').disabled = true;
    document.getElementById('fareInput').value = 350;
}

// ============================================
// INIT
// ============================================
initDashboard();

function initDashboard() {
    initMap();
    loadCommission();
    initRealtimeListeners();
}
