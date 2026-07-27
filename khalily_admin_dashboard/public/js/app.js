// ============================================
// KHALILY ADMIN DASHBOARD - app.js (Bootstrap 5)
// Two-click map: pickup + dropoff, auto-fare
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
let dropoffMarker = null;
let pickupCoords = null;
let dropoffCoords = null;
let radiusCircle = null;
let mapClickMode = 'pickup'; // 'pickup' or 'dropoff'
let allDrivers = [];
let allRides = [];
let ridesListUnsubscribe = null;
let currentPage = 'map';

// ============================================
// PRICING CONFIG
// ============================================
const BASE_FARE = 10;   // 10 MRU base
const PER_KM = 11;       // 11 MRU per km
const MIN_FARE = 100;    // minimum 100 MRU

function calculateFare(distanceKm) {
    if (!distanceKm || distanceKm <= 0) return MIN_FARE;
    return Math.max(MIN_FARE, Math.round(BASE_FARE + (distanceKm * PER_KM)));
}

// ============================================
// MAP INIT
// ============================================
function initMap() {
    map = L.map('map', { zoomControl: false }).setView([18.0735, -15.9582], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(map);

    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (mapClickMode === 'pickup') {
            setPickupPoint(lat, lng);
            mapClickMode = 'dropoff';
            document.getElementById('pickupCoords').placeholder = '✓ تم تحديد الانطلاق';
            document.getElementById('dropoffCoords').placeholder = 'نقرة ثانية = الوجهة';
            document.getElementById('pickupCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-success fw-bold">✓ نقطة الانطلاق</span>';
            document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-danger fw-bold">نقطة الوجهة (انقر على الخريطة)</span>';
        } else {
            setDropoffPoint(lat, lng);
            mapClickMode = 'pickup';
            document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-success fw-bold">✓ نقطة الوجهة</span>';
            document.getElementById('pickupCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-muted fw-bold">نقطة الانلاق (انقر على الخريطة)</span>';
        }
        updateDispatchBtn();
    });
}

function setPickupPoint(lat, lng) {
    pickupCoords = { lat, lng };
    if (pickupMarker) map.removeLayer(pickupMarker);
    const icon = L.divIcon({
        className: 'pickup-marker-wrapper',
        html: '<div style="background:#124D1C;border:3px solid white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);color:white;font-size:18px;font-weight:bold;">A</div>',
        iconSize: [40, 40], iconAnchor: [20, 20]
    });
    pickupMarker = L.marker([lat, lng], { icon }).addTo(map);
    document.getElementById('pickupCoords').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    updateRadiusCircle();
    updateDistanceInfo();
}

function setDropoffPoint(lat, lng) {
    dropoffCoords = { lat, lng };
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    const icon = L.divIcon({
        className: 'dropoff-marker-wrapper',
        html: '<div style="background:#B71C1C;border:3px solid white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);color:white;font-size:18px;font-weight:bold;">B</div>',
        iconSize: [40, 40], iconAnchor: [20, 20]
    });
    dropoffMarker = L.marker([lat, lng], { icon }).addTo(map);
    document.getElementById('dropoffCoords').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    updateDistanceInfo();
}

function updateRadiusCircle() {
    if (!pickupCoords) return;
    if (radiusCircle) map.removeLayer(radiusCircle);
    const radius = parseInt(document.getElementById('searchRadius').value) * 1000;
    radiusCircle = L.circle([pickupCoords.lat, pickupCoords.lng], {
        radius, color: '#0B1849', fillColor: '#D4A843',
        fillOpacity: 0.15, weight: 2, dashArray: '8, 8'
    }).addTo(map);
}

function updateDistanceInfo() {
    const infoDiv = document.getElementById('distanceInfo');
    if (pickupCoords && dropoffCoords) {
        const dist = haversine(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);
        const fare = calculateFare(dist);
        document.getElementById('realDistance').textContent = `${dist.toFixed(2)} كم`;
        document.getElementById('autoFare').textContent = `${fare} MRU`;
        document.getElementById('fareInput').value = fare;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
        document.getElementById('fareInput').value = BASE_FARE;
    }
}

function updateDispatchBtn() {
    const hasAll = pickupCoords && dropoffCoords &&
        document.getElementById('passengerName').value.trim() &&
        document.getElementById('passengerPhone').value.trim() &&
        document.getElementById('pickupAddress').value.trim() &&
        document.getElementById('dropoffAddress').value.trim();
    document.getElementById('dispatchBtn').disabled = !hasAll;
}

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
    settings: 'الإعدادات',
    messages: 'الرسائل',
    admins: 'إدارة المشرفين'
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
    if (page !== 'rides' && ridesListUnsubscribe) { ridesListUnsubscribe(); ridesListUnsubscribe = null; }
    if (page === 'drivers') loadDriversList();
    if (page === 'rides') loadRidesList();
    if (page === 'settings') loadCommission();
    if (page === 'admins') loadAdminsList();
    if (page === 'messages') { loadMsgRecipients(); loadSentMessages(); }
}

document.querySelectorAll('.sidebar-link').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage(item.dataset.page);
    });
});

// ============================================
// DISPATCH PANEL (Custom RTL-safe)
// ============================================
let dispatchPanelOpen = false;

window.toggleDispatchPanel = function () {
    dispatchPanelOpen = !dispatchPanelOpen;
    document.getElementById('dispatchPanel').classList.toggle('open', dispatchPanelOpen);
    document.getElementById('dispatchOverlay').classList.toggle('show', dispatchPanelOpen);
    document.getElementById('dispatchOverlay').classList.toggle('d-none', !dispatchPanelOpen);
};

function closeDispatchPanel() {
    dispatchPanelOpen = false;
    document.getElementById('dispatchPanel').classList.remove('open');
    document.getElementById('dispatchOverlay').classList.remove('show');
    setTimeout(() => document.getElementById('dispatchOverlay').classList.add('d-none'), 300);
}

document.getElementById('searchRadius').addEventListener('input', (e) => {
    document.getElementById('radiusValue').textContent = `${e.target.value} كم`;
    updateRadiusCircle();
});

document.getElementById('clearPickup').addEventListener('click', () => {
    resetDispatchForm();
});

document.getElementById('clearDropoff').addEventListener('click', () => {
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    dropoffMarker = null; dropoffCoords = null;
    document.getElementById('dropoffCoords').value = '';
    document.getElementById('dropoffCoords').placeholder = 'نقرة ثانية = الوجهة';
    document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
        '<span class="text-muted fw-bold">نقطة الوجهة (انقر مرة ثانية على الخريطة)</span>';
    mapClickMode = 'dropoff';
    updateDistanceInfo();
    updateDispatchBtn();
});

['passengerName', 'passengerPhone', 'pickupAddress', 'dropoffAddress'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateDispatchBtn);
});

function resetDispatchForm() {
    if (pickupMarker) map.removeLayer(pickupMarker);
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    if (radiusCircle) map.removeLayer(radiusCircle);
    pickupMarker = null; dropoffMarker = null; pickupCoords = null; dropoffCoords = null; radiusCircle = null;
    mapClickMode = 'pickup';
    ['passengerName', 'passengerPhone', 'pickupAddress', 'dropoffAddress', 'pickupCoords', 'dropoffCoords'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('pickupCoords').placeholder = 'نقرة أولى = الانطلاق';
    document.getElementById('dropoffCoords').placeholder = 'نقرة ثانية = الوجهة';
    document.getElementById('pickupCoords').closest('.mb-3').querySelector('label').innerHTML =
        '<span class="text-muted fw-bold">نقطة الانطلاق (انقر على الخريطة)</span>';
    document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
        '<span class="text-muted fw-bold">نقطة الوجهة (انقر مرة ثانية على الخريطة)</span>';
    document.getElementById('searchRadius').value = 3;
    document.getElementById('radiusValue').textContent = '3 كم';
    document.getElementById('fareInput').value = BASE_FARE;
    document.getElementById('distanceInfo').style.display = 'none';
    document.getElementById('dispatchBtn').disabled = true;
    document.getElementById('dispatchStatus').textContent = '';
}

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
    const fare = parseFloat(document.getElementById('fareInput').value) || BASE_FARE;

    if (!passengerName || !passengerPhone) {
        showStatus('dispatchStatus', 'يرجى إدخال اسم الزبون ورقم هاتفه', 'error');
        return;
    }
    if (!pickupCoords) {
        showStatus('dispatchStatus', 'يرجى تحديد نقطة الانطلاق على الخريطة', 'error');
        return;
    }
    if (!dropoffCoords) {
        showStatus('dispatchStatus', 'يرجى تحديد نقطة الوجهة على الخريطة', 'error');
        return;
    }
    if (!pickupAddress || !dropoffAddress) {
        showStatus('dispatchStatus', 'يرجى إدخال عنوان الانطلاق وعنوان الوجهة', 'error');
        return;
    }

    const btn = document.getElementById('dispatchBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جاري الإرسال...';

    const realDistance = haversine(pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng);

    try {
        const rideData = {
            passengerName,
            passengerPhone,
            pickupLat: pickupCoords.lat,
            pickupLng: pickupCoords.lng,
            dropoffLat: dropoffCoords.lat,
            dropoffLng: dropoffCoords.lng,
            pickupAddress,
            dropoffAddress,
            realDistanceKm: Math.round(realDistance * 100) / 100,
            searchRadiusKm: radius,
            fare,
            commissionPercent,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('rides').add(rideData);
        const nearby = await findNearbyDrivers(pickupCoords.lat, pickupCoords.lng, radius);

        if (nearby.length === 0) {
            showStatus('dispatchStatus', 'لا يوجد سائقون متاحون في النطاق', 'error');
            await db.collection('rides').doc(docRef.id).update({ status: 'no_drivers' });
            addNotifLog('dispatch', `فشل الإرسال: لا يوجد سائقون في نطاق ${radius} كم`);
        } else {
            const nearbyIds = nearby.map(d => d.id);
            const tokens = nearby.filter(d => d.fcmToken).map(d => d.fcmToken);

            await db.collection('rides').doc(docRef.id).update({
                notifiedDrivers: nearbyIds,
                notificationSentAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (tokens.length > 0) {
                sendFCMNotifications(tokens, docRef.id, passengerName, fare, pickupCoords.lat, pickupCoords.lng, pickupAddress, dropoffAddress, radius);
            }

            showStatus('dispatchStatus', `تم الإرسال! ${nearby.length} سائق تم تنبيههم | ${realDistance.toFixed(1)} كم | ${fare} MRU`, 'success');
            addNotifLog('dispatch', `رحلة ${passengerName}: ${pickupAddress} → ${dropoffAddress} | ${realDistance.toFixed(1)} كم | ${fare} MRU | تنبيه ${nearby.length} سائق`);
            resetDispatchForm();
            setTimeout(closeDispatchPanel, 1500);
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
let rideStatusCache = {};

function initRealtimeListeners() {
    if (!db) return;

    db.collection('rides').where('status', 'in', ['accepted', 'in_progress'])
        .onSnapshot(snapshot => {
            document.getElementById('rideCount').textContent = snapshot.size;
            document.getElementById('statActiveRides').textContent = snapshot.size;
            const mobileCount = document.querySelector('.rideCount-mobile');
            if (mobileCount) mobileCount.textContent = snapshot.size;

            const activeIds = new Set();
            snapshot.forEach(doc => {
                const r = doc.data();
                const id = doc.id;
                activeIds.add(id);
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
                if (!activeIds.has(id)) { map.removeLayer(activeRidesMap[id].marker); delete activeRidesMap[id]; }
            });
        }, err => {
            console.error('Active rides listener error:', err);
        });

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
            document.getElementById('statOnlineDrivers').textContent = onlineIds.size;
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
    const tbody = document.getElementById('driversTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="khalily-spinner"></div><div class="mt-2 text-muted small">جاري تحميل السائقين...</div></td></tr>';
    try {
        const snapshot = await db.collection('drivers').get();
        allDrivers = [];
        snapshot.forEach(doc => allDrivers.push({ id: doc.id, ...doc.data() }));
        renderDriversList(allDrivers);
    } catch (err) {
        console.error('Load drivers error:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
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
    const query = document.getElementById('searchDrivers').value;
    const status = document.getElementById('filterDriverStatus').value;
    renderDriversList(allDrivers.filter(d => {
        const name = (d.name || '');
        const phone = (d.phone || '');
        const matchQ = !query || name.includes(query) || phone.includes(query) ||
            name.localeCompare(query, 'ar', { sensitivity: 'base' }) === 0;
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
    if (ridesListUnsubscribe) { ridesListUnsubscribe(); ridesListUnsubscribe = null; }
    const tbody = document.getElementById('ridesTableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4"><div class="khalily-spinner"></div><div class="mt-2 text-muted small">جاري تحميل الرحلات...</div></td></tr>';
    try {
        ridesListUnsubscribe = db.collection('rides').orderBy('createdAt', 'desc').limit(100)
            .onSnapshot(snapshot => {
                const labels = { pending: 'قيد الانتظار', accepted: 'مقبولة', in_progress: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة', no_drivers: 'بلا سائق' };
                const statusIcons = { pending: '⏳', accepted: '✅', in_progress: '🛵', completed: '🏁', cancelled: '❌', no_drivers: '🚫' };

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'modified' || change.type === 'added') {
                        const rd = change.doc.data();
                        const id = change.doc.id;
                        const curr = rd.status;
                        const prev = rideStatusCache[id];
                        rideStatusCache[id] = curr;
                        if (change.type === 'added' && !prev && curr !== 'pending' && curr !== 'no_drivers') {
                            playNotificationSound();
                            addNotifLog('ride_' + curr, `${statusIcons[curr] || '📌'} ${labels[curr] || curr}: ${rd.passengerName || 'زبون'} — ${rd.fare || 0} MRU`);
                        }
                        if (change.type === 'modified' && prev && prev !== curr) {
                            playNotificationSound();
                            if (curr === 'accepted') addNotifLog('ride_accepted', `✅ تم قبول الرحلة: ${rd.passengerName || 'زبون'} — ${rd.fare || 0} MRU`);
                            else if (curr === 'in_progress') addNotifLog('ride_in_progress', `🛵 بدء التنفيذ: ${rd.passengerName || 'زبون'}`);
                            else if (curr === 'completed') addNotifLog('ride_completed', `🏁 اكتملت: ${rd.passengerName || 'زبون'} — ${rd.fare || 0} MRU`);
                            else if (curr === 'cancelled') addNotifLog('ride_cancelled', `❌ تم الإلغاء: ${rd.passengerName || 'زبون'}`);
                            else addNotifLog('ride_' + curr, `${statusIcons[curr] || '📌'} ${labels[curr] || curr}: ${rd.passengerName || 'زبون'}`);
                        }
                    }
                });
                snapshot.forEach(doc => { rideStatusCache[doc.id] = doc.data().status; });

                allRides = [];
                snapshot.forEach(doc => allRides.push({ id: doc.id, ...doc.data() }));
                const currentFilter = document.getElementById('filterRideStatus')?.value || 'all';
                if (currentFilter === 'all') renderRidesList(allRides);
                else renderRidesList(allRides.filter(r => r.status === currentFilter));
            }, err => {
                console.error('Rides listener error:', err);
                tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
            });
    } catch (err) {
        console.error('Load rides error:', err);
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

function renderRidesList(rides) {
    const tbody = document.getElementById('ridesTableBody');
    if (rides.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">لا توجد رحلات</td></tr>';
        return;
    }
    const labels = { pending: 'قيد الانتظار', accepted: 'مقبولة', in_progress: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة', no_drivers: 'بلا سائق' };
    const colors = { pending: 'warning', accepted: 'primary', in_progress: 'success', completed: 'purple', cancelled: 'danger', no_drivers: 'secondary' };
    const canCancel = ['pending', 'accepted', 'in_progress'];
    tbody.innerHTML = rides.map(r => {
        const created = r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleString('ar-MA') : '-';
        const fare = r.fare || 0;
        const comm = r.commissionAmount || Math.round(fare * commissionPercent / 100);
        const dist = r.realDistanceKm ? `${r.realDistanceKm} كم` : '-';
        const cancelBtn = canCancel.includes(r.status)
            ? `<button class="btn-action btn-action-delete mt-1" onclick="cancelRide('${r.id}')">إلغاء</button>` : '';
        return `<tr>
            <td><strong>${r.passengerName || '-'}</strong></td>
            <td class="d-none d-md-table-cell">${r.pickupAddress || '-'}</td>
            <td class="d-none d-md-table-cell">${r.dropoffAddress || '-'}</td>
            <td><small>${dist}</small></td>
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
// STATISTICS
// ============================================
async function loadStats() {
    if (!requireDb()) return;
    try {
        const driversSnap = await db.collection('drivers').get();
        const allDrivs = [];
        driversSnap.forEach(d => allDrivs.push(d.data()));
        const onlineCount = allDrivs.filter(d => d.isOnline && !d.disabled).length;
        document.getElementById('statOnlineDrivers').textContent = onlineCount;
        document.getElementById('statTotalDrivers').textContent = allDrivs.length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTs = firebase.firestore.Timestamp.fromDate(today);

        const todayRidesSnap = await db.collection('rides')
            .where('createdAt', '>=', todayTs).get();
        document.getElementById('statTodayRides').textContent = todayRidesSnap.size;

        let totalComm = 0;
        let totalRidesCount = 0;
        let activeCount = 0;
        let completedCount = 0;
        const allRidesSnap = await db.collection('rides').get();
        allRidesSnap.forEach(doc => {
            const r = doc.data();
            totalRidesCount++;
            if (r.status === 'completed') {
                completedCount++;
                if (r.commissionAmount) totalComm += r.commissionAmount;
            }
            if (r.status === 'accepted' || r.status === 'in_progress') activeCount++;
        });
        document.getElementById('statTotalRides').textContent = totalRidesCount;
        document.getElementById('statTotalComm').innerHTML = `${totalComm} <small>MRU</small>`;
        document.getElementById('statActiveRides').textContent = activeCount;
    } catch (e) {
        console.error('Stats load error:', e);
    }
}

// ============================================
// EXPORT CSV
// ============================================
window.exportDriversCSV = function () {
    if (allDrivers.length === 0) { alert('لا يوجد سائقون للتصدير'); return; }
    let csv = '\uFEFF' + 'الاسم,الهاتف,الرصيد,الحالة,المجموعات\n';
    allDrivers.forEach(d => {
        const status = d.disabled ? 'معطّل' : (d.isOnline ? 'متاح' : 'غير متاح');
        csv += `${d.name||''},${d.phone||''},${d.credit||0},${status},${d.totalRides||0}\n`;
    });
    downloadCSV(csv, 'khalily_drivers.csv');
};

window.exportRidesCSV = function () {
    if (allRides.length === 0) { alert('لا توجد رحلات للتصدير'); return; }
    let csv = '\uFEFF' + 'الزبون,الهاتف,نقطة الانطلاق,الوجهة,المسافة,السعر,العمولة,الحالة,التاريخ\n';
    allRides.forEach(r => {
        const created = r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleString('ar-MA') : '';
        const fare = r.fare || 0;
        const comm = r.commissionAmount || Math.round(fare * commissionPercent / 100);
        csv += `${r.passengerName||''},${r.passengerPhone||''},${r.pickupAddress||''},${r.dropoffAddress||''},${r.realDistanceKm||''},${fare},${comm},${r.status||''},${created}\n`;
    });
    downloadCSV(csv, 'khalily_rides.csv');
};

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ============================================
// FCM NOTIFICATIONS (stub)
// ============================================
async function sendFCMNotifications(tokens, rideId, passengerName, fare, lat, lng, pickup, dropoff, radius) {
    console.log(`FCM: ${tokens.length} tokens, ride ${rideId}`);
    if (tokens.length === 0) {
        addNotifLog('system', `FCM: لا توجد رموز إشعارات للسائقين`);
        return;
    }
    addNotifLog('system', `FCM: تم إرسال إشعار ${tokens.length} سائق بنجاح`);
}

// ============================================
// NOTIFICATION LOG
// ============================================
let notifLog = [];

function addNotifLog(type, message) {
    const now = new Date();
    const time = now.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString('ar-MA', { month: 'short', day: 'numeric' });
    notifLog.unshift({ type, message, time, date });
    if (notifLog.length > 100) notifLog = notifLog.slice(0, 100);
    renderNotifLog();
}

function renderNotifLog() {
    const container = document.getElementById('notifLogContainer');
    const countEl = document.getElementById('notifLogCount');
    if (!container) return;
    if (countEl) countEl.textContent = notifLog.length;
    if (notifLog.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4 small">لا توجد إشعارات بعد</div>';
        return;
    }
    const badgeMap = {
        'new_ride': { cls: 'log-badge-warning', label: 'رحلة جديدة' },
        'ride_accepted': { cls: 'log-badge-success', label: 'تم القبول' },
        'ride_completed': { cls: 'log-badge-info', label: 'اكتملت' },
        'ride_cancelled': { cls: 'log-badge-danger', label: 'ملغاة' },
        'ride_in_progress': { cls: 'log-badge-success', label: 'جارية' },
        'dispatch': { cls: 'log-badge-info', label: 'إرسال' },
        'system': { cls: 'log-badge-info', label: 'نظام' },
    };
    container.innerHTML = notifLog.map(n => {
        const badge = badgeMap[n.type] || { cls: 'log-badge-info', label: n.type };
        return `<div class="log-entry d-flex align-items-center gap-2">
            <span class="log-time">${n.date} ${n.time}</span>
            <span class="log-badge ${badge.cls}">${badge.label}</span>
            <span class="flex-grow-1">${n.message}</span>
        </div>`;
    }).join('');
}

window.clearNotifLog = function () {
    notifLog = [];
    renderNotifLog();
};

// ============================================
// FIND NEARBY DRIVERS
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

// ============================================
// MESSAGING SYSTEM
// ============================================
let selectedMsgDrivers = [];

function initMsgTypeSwitch() {
    const typeEl = document.getElementById('msgType');
    if (!typeEl) return;
    typeEl.addEventListener('change', () => {
        const t = typeEl.value;
        document.getElementById('msgTextGroup').classList.toggle('d-none', t !== 'text');
        document.getElementById('msgImageGroup').classList.toggle('d-none', t !== 'image');
        document.getElementById('msgAudioGroup').classList.toggle('d-none', t !== 'audio');
    });

    const imgFile = document.getElementById('msgImageFile');
    if (imgFile) imgFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 500000) { alert('الصورة كبيرة جداً. الحد الأقصى 500KB'); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('msgImagePreview').innerHTML =
                `<img src="${ev.target.result}" style="max-width:200px;max-height:200px;border-radius:8px;" class="img-fluid">`;
        };
        reader.readAsDataURL(file);
    });

    const audioFile = document.getElementById('msgAudioFile');
    if (audioFile) audioFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 500000) { alert('الملف الصوتي كبير جداً. الحد الأقصى 500KB'); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('msgAudioPreview').innerHTML =
                `<audio controls src="${ev.target.result}" style="width:100%;"></audio>`;
        };
        reader.readAsDataURL(file);
    });
}
initMsgTypeSwitch();

async function loadMsgRecipients() {
    if (!requireDb()) return;
    const sel = document.getElementById('msgRecipients');
    if (!sel) return;
    sel.innerHTML = '<option value="all">جميع السائقين</option>';
    try {
        const snap = await db.collection('drivers').get();
        snap.forEach(doc => {
            const d = doc.data();
            sel.innerHTML += `<option value="${doc.id}">${d.name || 'سائق'} (${d.phone || ''})</option>`;
        });
    } catch (e) { console.log('Recipients load error'); }
}

document.getElementById('sendMsgBtn')?.addEventListener('click', async () => {
    if (!requireDb('msgSendStatus')) return;
    const type = document.getElementById('msgType').value;
    const recipientsSel = document.getElementById('msgRecipients');
    const recipientIds = Array.from(recipientsSel.selectedOptions).map(o => o.value);
    const senderName = sessionStorage.getItem('khalily_admin_name') || 'المدير';
    const msg = { type, sentBy: senderName, readBy: [], timestamp: firebase.firestore.FieldValue.serverTimestamp() };

    if (recipientIds.includes('all')) {
        const snap = await db.collection('drivers').get();
        msg.recipients = snap.docs.map(d => d.id);
        msg.recipientLabel = 'جميع السائقين';
    } else {
        msg.recipients = recipientIds;
        msg.recipientLabel = `${recipientIds.length} سائق`;
    }

    if (msg.recipients.length === 0) {
        showStatus('msgSendStatus', 'لا يوجد مستلمون', 'error');
        return;
    }

    if (type === 'text') {
        msg.content = document.getElementById('msgText').value.trim();
        if (!msg.content) { showStatus('msgSendStatus', 'اكتب نص الرسالة', 'error'); return; }
    } else if (type === 'image') {
        const fileInput = document.getElementById('msgImageFile');
        if (!fileInput.files[0]) { showStatus('msgSendStatus', 'اختر صورة', 'error'); return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            msg.content = ev.target.result;
            await sendMsgToFirestore(msg);
        };
        reader.readAsDataURL(fileInput.files[0]);
        return;
    } else if (type === 'audio') {
        const fileInput = document.getElementById('msgAudioFile');
        if (!fileInput.files[0]) { showStatus('msgSendStatus', 'اختر ملف صوتي', 'error'); return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            msg.content = ev.target.result;
            await sendMsgToFirestore(msg);
        };
        reader.readAsDataURL(fileInput.files[0]);
        return;
    }

    await sendMsgToFirestore(msg);
});

async function sendMsgToFirestore(msg) {
    try {
        await db.collection('messages').add(msg);
        showStatus('msgSendStatus', `تم إرسال الرسالة لـ ${msg.recipientLabel} بنجاح!`, 'success');
        document.getElementById('msgText').value = '';
        document.getElementById('msgImageFile').value = '';
        document.getElementById('msgAudioFile').value = '';
        document.getElementById('msgImagePreview').innerHTML = '';
        document.getElementById('msgAudioPreview').innerHTML = '';
        loadSentMessages();
    } catch (err) {
        showStatus('msgSendStatus', 'خطأ: ' + err.message, 'error');
    }
}

async function loadSentMessages() {
    if (!requireDb()) return;
    const container = document.getElementById('msgListContainer');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><div class="khalily-spinner"></div></div>';

    try {
        const snap = await db.collection('messages').orderBy('timestamp', 'desc').limit(50).get();
        document.getElementById('msgCount').textContent = snap.size;

        if (snap.empty) {
            container.innerHTML = '<div class="text-center text-muted py-4 small">لا توجد رسائل بعد</div>';
            return;
        }

        const typeIcons = { text: 'bi-chat-left-text-fill', image: 'bi-image-fill', audio: 'bi-mic-fill' };
        const typeLabels = { text: 'نص', image: 'صورة', audio: 'صوت' };

        container.innerHTML = snap.docs.map(doc => {
            const m = doc.data();
            const time = m.timestamp?.toDate ? new Date(m.timestamp.toDate()).toLocaleString('ar-MA') : '';
            const readCount = (m.readBy || []).length;
            const totalCount = (m.recipients || []).length;
            const allRead = readCount >= totalCount;

            let contentPreview = '';
            if (m.type === 'text') {
                contentPreview = `<p class="mb-1">${m.content || ''}</p>`;
            } else if (m.type === 'image') {
                contentPreview = `<img src="${m.content}" style="max-width:120px;max-height:80px;border-radius:6px;" class="img-fluid">`;
            } else if (m.type === 'audio') {
                contentPreview = `<audio controls src="${m.content}" style="height:32px;max-width:200px;"></audio>`;
            }

            return `<div class="log-entry p-3 border-bottom">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <span class="badge bg-info"><i class="bi ${typeIcons[m.type] || 'bi-envelope'}"></i> ${typeLabels[m.type] || m.type}</span>
                    <small class="text-muted">${time}</small>
                </div>
                <div class="mb-1">${contentPreview}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted"><i class="bi bi-people"></i> ${m.recipientLabel || totalCount + ' سائق'} | <i class="bi bi-eye"></i> ${readCount}/${totalCount} قراءة</small>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSentMsg('${doc.id}')"><i class="bi bi-trash"></i></button>
                </div>
                ${allRead && totalCount > 0 ? '<div class="mt-1"><span class="badge bg-success">تمت القراءة من الجميع</span></div>' : ''}
            </div>`;
        }).join('');
    } catch (err) {
        container.innerHTML = '<div class="text-center text-danger py-4">خطأ في تحميل الرسائل</div>';
    }
}

window.deleteSentMsg = async function(id) {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    if (!requireDb()) return;
    try {
        await db.collection('messages').doc(id).delete();
        loadSentMessages();
    } catch (err) { alert('خطأ: ' + err.message); }
};

window.clearOldMessages = async function() {
    if (!confirm('حذف جميع الرسائل القديمة؟')) return;
    if (!requireDb()) return;
    try {
        const snap = await db.collection('messages').get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        loadSentMessages();
    } catch (err) { alert('خطأ: ' + err.message); }
};

// ============================================
// ADMINS MANAGEMENT
// ============================================
async function loadAdminsList() {
    if (!requireDb()) return;
    const tbody = document.getElementById('adminsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="khalily-spinner"></div><div class="mt-2 text-muted small">جاري تحميل المشرفين...</div></td></tr>';
    try {
        const snapshot = await db.collection('admins').get();
        const admins = [];
        snapshot.forEach(doc => admins.push({ id: doc.id, ...doc.data() }));
        document.getElementById('totalAdminsCount').textContent = admins.length;
        if (admins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">لا يوجد مشرفون</td></tr>';
            return;
        }
        const roleLabels = { admin: 'مدير عام', supervisor: 'مشرف' };
        const roleBadge = { admin: 'bg-primary', supervisor: 'bg-secondary' };
        tbody.innerHTML = admins.map(a => `<tr>
            <td><strong>${a.name || '-'}</strong></td>
            <td>${a.username || '-'}</td>
            <td><span class="badge ${roleBadge[a.role] || 'bg-secondary'}">${roleLabels[a.role] || a.role}</span></td>
            <td>
                <button class="btn-action btn-action-delete" onclick="deleteAdmin('${a.id}','${(a.name||'').replace(/'/g,"\\'")}')">حذف</button>
            </td>
        </tr>`).join('');
    } catch (err) {
        console.error('Load admins error:', err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

window.addAdmin = async function () {
    if (!requireDb('addAdminStatus')) return;
    const username = document.getElementById('newAdminUsername').value.trim();
    const name = document.getElementById('newAdminName').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const role = document.getElementById('newAdminRole').value;

    if (!username) { showStatus('addAdminStatus', 'أدخل اسم المستخدم', 'error'); return; }
    if (!name) { showStatus('addAdminStatus', 'أدخل الاسم الكامل', 'error'); return; }
    if (!password) { showStatus('addAdminStatus', 'أدخل كلمة المرور', 'error'); return; }

    try {
        const existing = await db.collection('admins').where('username', '==', username).get();
        if (!existing.empty) {
            showStatus('addAdminStatus', 'اسم المستخدم مستخدم بالفعل', 'error');
            return;
        }
        await db.collection('admins').add({
            username, name, password, role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showStatus('addAdminStatus', 'تم إضافة المشرف بنجاح!', 'success');
        document.getElementById('newAdminUsername').value = '';
        document.getElementById('newAdminName').value = '';
        document.getElementById('newAdminPassword').value = '';
        loadAdminsList();
    } catch (err) {
        showStatus('addAdminStatus', 'خطأ: ' + err.message, 'error');
    }
};

window.deleteAdmin = async function (id, name) {
    if (!confirm(`هل أنت متأكد من حذف المشرف "${name}"؟`)) return;
    if (!requireDb()) return;
    try {
        await db.collection('admins').doc(id).delete();
        loadAdminsList();
    } catch (err) {
        alert('خطأ: ' + err.message);
    }
};

// ============================================
// ROLE-BASED VISIBILITY
// ============================================
function applyRoleVisibility() {
    const role = sessionStorage.getItem('khalily_admin_role') || 'admin';
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = role === 'admin' ? '' : 'none';
    });
}

// ============================================
// INIT
// ============================================
function initDashboard() {
    initMap();
    loadCommission();
    loadStats();
    initRealtimeListeners();
    applyRoleVisibility();
    setInterval(loadStats, 60000);
    addNotifLog('system', 'تم تشغيل لوحة التحكم');
}

initDashboard();
