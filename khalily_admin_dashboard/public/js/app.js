// ============================================
// KHALILY ADMIN DASHBOARD - app.js (Bootstrap 5)
// Two-click map: pickup + dropoff, auto-fare
// ============================================

let db = null;
let firebaseReady = false;
let commissionPercent = 10;
const currentAdminRole = sessionStorage.getItem('khalily_admin_role') || 'admin';
const isAdmin = currentAdminRole === 'admin';

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
    // Button always enabled — validation happens on click
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
    if (page === 'admins') loadAdmins();
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
        showAlert('يرجى إدخال نسبة صحيحة (0-100)', 'خطأ', 'error');
        return;
    }
    try {
        await db.collection('settings').doc('app_config').set({ commissionPercent: val }, { merge: true });
        commissionPercent = val;
        document.getElementById('currentCommission').textContent = `${val}%`;
        showAlert('تم حفظ النسبة بنجاح', 'تم', 'success');
    } catch (e) {
        showAlert('خطأ: ' + e.message, 'خطأ', 'error');
    }
};

// ============================================
// DRIVER SEARCH
// ============================================
window.searchDriverByPhone = async function () {
    if (!requireDb()) return;
    const phone = document.getElementById('searchDriverPhone').value.trim();
    if (!phone) { showAlert('أدخل رقم الهاتف', 'تنبيه', 'warning'); return; }
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
    if (!amount || amount <= 0) { showAlert('أدخل مبلغ صحيح', 'تنبيه', 'warning'); return; }
    try {
        await db.collection('drivers').doc(driverId).update({
            credit: firebase.firestore.FieldValue.increment(amount)
        });
        showAlert(`تم شحن ${amount} MRU بنجاح`, 'تم', 'success');
        searchDriverByPhone();
        if (currentPage === 'drivers') loadDriversList();
    } catch (e) {
        showAlert('خطأ: ' + e.message, 'خطأ', 'error');
    }
};

// ============================================
// REAL-TIME LISTENERS
// ============================================
let activeRidesMap = {};
let firstRidesSnapshot = true;
let rideStatusCache = {};

function initRealtimeListeners() {
    if (!db) return;

    db.collection('rides').where('status', 'in', ['accepted', 'in_progress'])
        .onSnapshot(snapshot => {
            document.getElementById('rideCount').textContent = snapshot.size;
            document.getElementById('statActiveRides').textContent = snapshot.size;
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
        }, err => {
            console.error('Active rides listener error:', err);
        });

    db.collection('rides').orderBy('createdAt', 'desc').limit(50)
        .onSnapshot(snapshot => {
            const labels = { pending: 'قيد الانتظار', accepted: 'مقبولة', in_progress: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة', no_drivers: 'بلا سائق' };
            const statusIcons = { pending: '⏳', accepted: '✅', in_progress: '🛵', completed: '🏁', cancelled: '❌', no_drivers: '🚫' };
            const isFirstLoad = Object.keys(rideStatusCache).length === 0;
            if (!isFirstLoad && snapshot.docChanges().length > 0) {
                snapshot.docChanges().forEach(change => {
                    const rd = change.doc.data();
                    const id = change.doc.id;
                    const curr = rd.status;
                    const prev = rideStatusCache[id];
                    rideStatusCache[id] = curr;
                    if (change.type === 'added' && !prev) {
                        if (curr !== 'pending' && curr !== 'no_drivers') {
                            playNotificationSound();
                            addNotifLog('ride_' + curr, `${statusIcons[curr] || '📌'} ${labels[curr] || curr}: ${rd.passengerName || 'زبون'} — ${rd.fare || 0} MRU`);
                        }
                        return;
                    }
                    if (change.type === 'modified' && prev && prev !== curr) {
                        playNotificationSound();
                        if (curr === 'accepted') addNotifLog('ride_accepted', `✅ تم قبول الرحلة: ${rd.passengerName || 'زبون'} — ${rd.fare || 0} MRU`);
                        else if (curr === 'in_progress') addNotifLog('ride_in_progress', `🛵 بدء التنفيذ: ${rd.passengerName || 'زبون'}`);
                        else if (curr === 'completed') addNotifLog('ride_completed', `🏁 اكتملت: ${rd.passengerName || 'زبون'} — ${rd.fare || 0} MRU`);
                        else if (curr === 'cancelled') addNotifLog('ride_cancelled', `❌ تم الإلغاء: ${rd.passengerName || 'زبون'}`);
                        else addNotifLog('ride_' + curr, `${statusIcons[curr] || '📌'} ${labels[curr] || curr}: ${rd.passengerName || 'زبون'}`);
                    }
                });
            } else {
                snapshot.forEach(doc => { rideStatusCache[doc.id] = doc.data().status; });
            }
            firstRidesSnapshot = false;
            snapshot.forEach(doc => { rideStatusCache[doc.id] = doc.data().status; });
        }, err => {
            console.error('Rides changes listener error:', err);
            addNotifLog('system', `خطأ في مراقبة الرحلات: ${err.message}`);
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
                    ${isAdmin ? `<button class="btn-action btn-action-delete" onclick="openDeleteModal('${d.id}','${safeName}')">حذف</button>` : ''}
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
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="khalily-spinner"></div><div class="mt-2 text-muted small">جاري تحميل الرحلات...</div></td></tr>';
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
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
            });
    } catch (err) {
        console.error('Load rides error:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
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
        const dist = r.realDistanceKm ? `${r.realDistanceKm} كم` : '-';
        const cancelBtn = canCancel.includes(r.status) && isAdmin
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
    const confirmed = await showConfirm('هل أنت متأكد من إلغاء هذه الرحلة؟', 'تأكيد الإلغاء', 'error');
    if (!confirmed) return;
    if (!requireDb()) return;
    try {
        await db.collection('rides').doc(rideId).update({ status: 'cancelled' });
        showAlert('تم إلغاء الرحلة بنجاح', 'تم', 'success');
        if (currentPage === 'rides') loadRidesList();
    } catch (err) { showAlert('خطأ: ' + err.message, 'خطأ', 'error'); }
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
        const allRidesSnap = await db.collection('rides').get();
        allRidesSnap.forEach(doc => {
            const r = doc.data();
            totalRidesCount++;
            const fare = r.fare || 0;
            totalComm += r.commissionAmount || Math.round(fare * commissionPercent / 100);
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
    if (allDrivers.length === 0) { showAlert('لا يوجد سائقون للتصدير', 'تنبيه', 'warning'); return; }
    let csv = '\uFEFF' + 'الاسم,الهاتف,الرصيد,الحالة,المجموعات\n';
    allDrivers.forEach(d => {
        const status = d.disabled ? 'معطّل' : (d.isOnline ? 'متاح' : 'غير متاح');
        csv += `${d.name||''},${d.phone||''},${d.credit||0},${status},${d.totalRides||0}\n`;
    });
    downloadCSV(csv, 'khalily_drivers.csv');
};

window.exportRidesCSV = function () {
    if (allRides.length === 0) { showAlert('لا توجد رحلات للتصدير', 'تنبيه', 'warning'); return; }
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
    addNotifLog('system', `FCM: تم تنبيه ${tokens.length} سائق عبر الإشعارات`);
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
// CUSTOM ALERT & CONFIRM (Bootstrap Modals)
// ============================================
const ALERT_ICONS = {
    success: '<div style="width:60px;height:60px;border-radius:50%;background:#d4edda;display:flex;align-items:center;justify-content:center;margin:auto;"><i class="bi bi-check-lg" style="font-size:32px;color:#28a745;"></i></div>',
    error: '<div style="width:60px;height:60px;border-radius:50%;background:#f8d7da;display:flex;align-items:center;justify-content:center;margin:auto;"><i class="bi bi-x-lg" style="font-size:32px;color:#dc3545;"></i></div>',
    warning: '<div style="width:60px;height:60px;border-radius:50%;background:#fff3cd;display:flex;align-items:center;justify-content:center;margin:auto;"><i class="bi bi-exclamation-triangle" style="font-size:32px;color:#e67e22;"></i></div>',
    info: '<div style="width:60px;height:60px;border-radius:50%;background:#d1ecf1;display:flex;align-items:center;justify-content:center;margin:auto;"><i class="bi bi-info-lg" style="font-size:32px;color:#17a2b8;"></i></div>'
};
const ALERT_COLORS = {
    success: '#28a745', error: '#dc3545', warning: '#e67e22', info: '#17a2b8'
};

function showAlert(message, title, type = 'info') {
    return new Promise(resolve => {
        document.getElementById('alertIcon').innerHTML = ALERT_ICONS[type] || ALERT_ICONS.info;
        document.getElementById('alertTitle').textContent = title || (type === 'success' ? 'نجاح' : type === 'error' ? 'خطأ' : type === 'warning' ? 'تنبيه' : 'معلومة');
        document.getElementById('alertMessage').textContent = message;
        const okBtn = document.getElementById('alertOkBtn');
        okBtn.className = 'btn px-4 fw-bold rounded-3 text-white';
        okBtn.style.backgroundColor = ALERT_COLORS[type] || ALERT_COLORS.info;
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('customAlertModal'));
        okBtn.onclick = () => { modal.hide(); resolve(); };
        modal.show();
    });
}

function showConfirm(message, title, type = 'warning') {
    return new Promise(resolve => {
        document.getElementById('confirmIcon').innerHTML = ALERT_ICONS[type] || ALERT_ICONS.warning;
        document.getElementById('confirmTitle').textContent = title || 'تأكيد';
        document.getElementById('confirmMessage').textContent = message;
        const okBtn = document.getElementById('confirmOkBtn');
        okBtn.className = 'btn px-3 fw-bold rounded-3 text-white';
        okBtn.style.backgroundColor = ALERT_COLORS[type] || ALERT_COLORS.warning;
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('customConfirmModal'));
        okBtn.onclick = () => { modal.hide(); resolve(true); };
        document.getElementById('confirmCancelBtn').onclick = () => { modal.hide(); resolve(false); };
        modal.show();
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
    setInterval(loadStats, 60000);
    addNotifLog('system', 'تم تشغيل لوحة التحكم');
    applyRoleRestrictions();
}

initDashboard();

// ============================================
// DELETE OLD RIDES (older than 7 days)
// ============================================
function confirmDeleteOldRides() {
    if (!requireDb('deleteOldRidesStatus')) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    db.collection('rides').where('status', 'in', ['completed', 'cancelled'])
        .get().then(async snap => {
            let count = 0;
            snap.forEach(doc => {
                const data = doc.data();
                let rideDate = null;
                if (data.completedAt && data.completedAt.toDate) rideDate = data.completedAt.toDate();
                else if (data.cancelledAt && data.cancelledAt.toDate) rideDate = data.cancelledAt.toDate();
                else if (data.createdAt && data.createdAt.toDate) rideDate = data.createdAt.toDate();
                if (rideDate && rideDate < sevenDaysAgo) count++;
            });

            if (count === 0) {
                showAlert('لا توجد رحلات قديمة للحذف.', 'معلومة', 'info');
                return;
            }

            const confirmed = await showConfirm('هل أنت متأكد من حذف ' + count + ' رحلة قديمة (أكثر من أسبوع)؟\nهذا الإجراء لا يمكن التراجع عنه.', 'تأكيد الحذف', 'error');
            if (confirmed) {
                deleteOldRides(snap, sevenDaysAgo);
            }
        }).catch(e => {
            showStatus('deleteOldRidesStatus', 'خطأ: ' + e.message, 'error');
        });
}

function deleteOldRides(snap, sevenDaysAgo) {
    let deleted = 0;
    const batch = db.batch();
    snap.forEach(doc => {
        const data = doc.data();
        let rideDate = null;
        if (data.completedAt && data.completedAt.toDate) rideDate = data.completedAt.toDate();
        else if (data.cancelledAt && data.cancelledAt.toDate) rideDate = data.cancelledAt.toDate();
        else if (data.createdAt && data.createdAt.toDate) rideDate = data.createdAt.toDate();
        if (rideDate && rideDate < sevenDaysAgo) {
            batch.delete(doc.ref);
            deleted++;
        }
    });

    if (deleted === 0) {
        showStatus('deleteOldRidesStatus', 'لا توجد رحلات قديمة للحذف.', 'success');
        return;
    }

    batch.commit().then(() => {
        showStatus('deleteOldRidesStatus', 'تم حذف ' + deleted + ' رحلة قديمة بنجاح.', 'success');
        addNotifLog('system', 'تم حذف ' + deleted + ' رحلة قديمة');
        loadStats();
        loadRides();
    }).catch(e => {
        showStatus('deleteOldRidesStatus', 'خطأ أثناء الحذف: ' + e.message, 'error');
    });
}

// ============================================
// ROLE-BASED VISIBILITY
// ============================================
function applyRoleRestrictions() {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
    });

    if (!isAdmin) {
        const deleteBtns = document.querySelectorAll('.btn-action-delete');
        deleteBtns.forEach(b => b.style.display = 'none');

        const delOldRides = document.querySelector('[onclick*="confirmDeleteOldRides"]');
        if (delOldRides) {
            const card = delOldRides.closest('.card');
            if (card) card.style.display = 'none';
        }

        const testAlert = document.querySelector('[onclick*="test"]');
        const testCard = document.querySelectorAll('.card-header');
        testCard.forEach(h => {
            if (h.textContent.includes('اختبار النافذة')) h.closest('.card').style.display = 'none';
        });

        const commissionInput = document.querySelector('#newCommission');
        if (commissionInput) {
            const saveBtn = commissionInput.parentElement.querySelector('button');
            if (saveBtn) saveBtn.style.display = 'none';
            commissionInput.disabled = true;
        }
    }

    const adminName = sessionStorage.getItem('khalily_admin_name') || 'المستخدم';
    const roleLabel = isAdmin ? 'مدير عام' : 'مشرف';
    document.getElementById('pageTitle').textContent += ' — ' + adminName + ' (' + roleLabel + ')';
    document.getElementById('pageTitleMobile').textContent += ' — ' + roleLabel;
}

// ============================================
// ADMIN MANAGEMENT
// ============================================
let allAdmins = [];

async function loadAdmins() {
    if (!requireDb()) return;
    try {
        const snapshot = await db.collection('admins').get();
        allAdmins = [];
        snapshot.forEach(doc => {
            allAdmins.push({ id: doc.id, ...doc.data() });
        });
        renderAdminsTable();
    } catch (e) {
        console.error('Load admins error:', e);
    }
}

function renderAdminsTable() {
    const tbody = document.getElementById('adminsTableBody');
    document.getElementById('totalAdminsCount').textContent = allAdmins.length;
    if (allAdmins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">لا يوجد مشرفون</td></tr>';
        return;
    }
    tbody.innerHTML = allAdmins.map(a => {
        const roleLabel = a.role === 'admin' ? '<span class="badge bg-primary">مدير عام</span>' : '<span class="badge bg-info">مشرف</span>';
        const isDefault = ['admin', 'khalily', '26067036'].includes(a.username);
        return `<tr>
            <td class="fw-bold">${a.name || '-'}</td>
            <td>${a.username}</td>
            <td>${roleLabel}</td>
            <td>
                ${!isDefault && isAdmin ? `<button class="btn btn-action btn-action-edit me-1" onclick="editAdmin('${a.id}','${a.name||''}','${a.role||'supervisor'}')"><i class="bi bi-pencil"></i></button>` : ''}
                ${!isDefault && isAdmin ? `<button class="btn btn-action btn-action-delete" onclick="deleteAdmin('${a.id}','${a.name||a.username}')"><i class="bi bi-trash"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');
}

window.addAdmin = async function () {
    if (!requireDb()) return;
    const username = document.getElementById('newAdminUsername').value.trim();
    const name = document.getElementById('newAdminName').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const role = document.getElementById('newAdminRole').value;

    if (!username || !name || !password) {
        showAlert('يرجى ملء جميع الحقول', 'تنبيه', 'warning');
        return;
    }

    try {
        const exists = await db.collection('admins').where('username', '==', username).get();
        if (!exists.empty) {
            showAlert('اسم المستخدم مستخدم بالفعل', 'خطأ', 'error');
            return;
        }

        await db.collection('admins').add({ username, name, password, role });
        showAlert('تم إضافة المشرف بنجاح', 'تم', 'success');
        addNotifLog('system', 'تم إضافة مشرف جديد: ' + name);
        document.getElementById('newAdminUsername').value = '';
        document.getElementById('newAdminName').value = '';
        document.getElementById('newAdminPassword').value = '';
        loadAdmins();
    } catch (e) {
        showAlert('خطأ: ' + e.message, 'خطأ', 'error');
    }
};

window.editAdmin = async function (id, currentName, currentRole) {
    const newName = prompt('الاسم الجديد:', currentName);
    if (newName === null) return;
    if (!newName.trim()) { showAlert('الاسم لا يمكن أن يكون فارغاً', 'خطأ', 'error'); return; }

    const newRole = prompt('الدور (admin = مدير عام, supervisor = مشرف):', currentRole);
    if (newRole === null) return;
    if (!['admin', 'supervisor'].includes(newRole)) { showAlert('الدور غير صحيح. اختر admin أو supervisor', 'خطأ', 'error'); return; }

    try {
        await db.collection('admins').doc(id).update({ name: newName.trim(), role: newRole });
        showAlert('تم تعديل المشرف بنجاح', 'تم', 'success');
        addNotifLog('system', 'تم تعديل المشرف: ' + newName.trim());
        loadAdmins();
    } catch (e) {
        showAlert('خطأ: ' + e.message, 'خطأ', 'error');
    }
};

window.deleteAdmin = async function (id, name) {
    const confirmed = await showConfirm('هل أنت متأكد من حذف المشرف ' + name + '؟', 'تأكيد الحذف', 'error');
    if (!confirmed) return;

    try {
        await db.collection('admins').doc(id).delete();
        showAlert('تم حذف المشرف بنجاح', 'تم', 'success');
        addNotifLog('system', 'تم حذف المشرف: ' + name);
        loadAdmins();
    } catch (e) {
        showAlert('خطأ: ' + e.message, 'خطأ', 'error');
    }
};
