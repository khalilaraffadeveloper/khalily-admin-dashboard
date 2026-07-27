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
        if (caller) showStatus(caller, 'Ø®Ø·Ø£: Firebase ØºÙŠØ± Ù…ÙØ¹Ø¯.', 'error');
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
        attribution: 'Â© OpenStreetMap', maxZoom: 19
    }).addTo(map);

    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (mapClickMode === 'pickup') {
            setPickupPoint(lat, lng);
            mapClickMode = 'dropoff';
            document.getElementById('pickupCoords').placeholder = 'âœ“ ØªÙ… ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚';
            document.getElementById('dropoffCoords').placeholder = 'Ù†Ù‚Ø±Ø© Ø«Ø§Ù†ÙŠØ© = Ø§Ù„ÙˆØ¬Ù‡Ø©';
            document.getElementById('pickupCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-success fw-bold">âœ“ Ù†Ù‚Ø·Ø© Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚</span>';
            document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-danger fw-bold">Ù†Ù‚Ø·Ø© Ø§Ù„ÙˆØ¬Ù‡Ø© (Ø§Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©)</span>';
        } else {
            setDropoffPoint(lat, lng);
            mapClickMode = 'pickup';
            document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-success fw-bold">âœ“ Ù†Ù‚Ø·Ø© Ø§Ù„ÙˆØ¬Ù‡Ø©</span>';
            document.getElementById('pickupCoords').closest('.mb-3').querySelector('label').innerHTML =
                '<span class="text-muted fw-bold">Ù†Ù‚Ø·Ø© Ø§Ù„Ø§Ù†Ù„Ø§Ù‚ (Ø§Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©)</span>';
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
        document.getElementById('realDistance').textContent = `${dist.toFixed(2)} ÙƒÙ…`;
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
    map: 'ØªØªØ¨Ø¹ Ù…Ø¨Ø§Ø´Ø± Ù„Ù„Ø³Ø§Ø¦Ù‚ÙŠÙ†',
    drivers: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø³Ø§Ø¦Ù‚ÙŠÙ†',
    rides: 'Ø³Ø¬Ù„ Ø§Ù„Ø±Ø­Ù„Ø§Øª',
    settings: 'Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª'
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
    document.getElementById('radiusValue').textContent = `${e.target.value} ÙƒÙ…`;
    updateRadiusCircle();
});

document.getElementById('clearPickup').addEventListener('click', () => {
    resetDispatchForm();
});

document.getElementById('clearDropoff').addEventListener('click', () => {
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    dropoffMarker = null; dropoffCoords = null;
    document.getElementById('dropoffCoords').value = '';
    document.getElementById('dropoffCoords').placeholder = 'Ù†Ù‚Ø±Ø© Ø«Ø§Ù†ÙŠØ© = Ø§Ù„ÙˆØ¬Ù‡Ø©';
    document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
        '<span class="text-muted fw-bold">Ù†Ù‚Ø·Ø© Ø§Ù„ÙˆØ¬Ù‡Ø© (Ø§Ù†Ù‚Ø± Ù…Ø±Ø© Ø«Ø§Ù†ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©)</span>';
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
    document.getElementById('pickupCoords').placeholder = 'Ù†Ù‚Ø±Ø© Ø£ÙˆÙ„Ù‰ = Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚';
    document.getElementById('dropoffCoords').placeholder = 'Ù†Ù‚Ø±Ø© Ø«Ø§Ù†ÙŠØ© = Ø§Ù„ÙˆØ¬Ù‡Ø©';
    document.getElementById('pickupCoords').closest('.mb-3').querySelector('label').innerHTML =
        '<span class="text-muted fw-bold">Ù†Ù‚Ø·Ø© Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚ (Ø§Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©)</span>';
    document.getElementById('dropoffCoords').closest('.mb-3').querySelector('label').innerHTML =
        '<span class="text-muted fw-bold">Ù†Ù‚Ø·Ø© Ø§Ù„ÙˆØ¬Ù‡Ø© (Ø§Ù†Ù‚Ø± Ù…Ø±Ø© Ø«Ø§Ù†ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©)</span>';
    document.getElementById('searchRadius').value = 3;
    document.getElementById('radiusValue').textContent = '3 ÙƒÙ…';
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
        showStatus('dispatchStatus', 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø²Ø¨ÙˆÙ† ÙˆØ±Ù‚Ù… Ù‡Ø§ØªÙÙ‡', 'error');
        return;
    }
    if (!pickupCoords) {
        showStatus('dispatchStatus', 'ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ù†Ù‚Ø·Ø© Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚ Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©', 'error');
        return;
    }
    if (!dropoffCoords) {
        showStatus('dispatchStatus', 'ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ù†Ù‚Ø·Ø© Ø§Ù„ÙˆØ¬Ù‡Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø®Ø±ÙŠØ·Ø©', 'error');
        return;
    }
    if (!pickupAddress || !dropoffAddress) {
        showStatus('dispatchStatus', 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø¹Ù†ÙˆØ§Ù† Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚ ÙˆØ¹Ù†ÙˆØ§Ù† Ø§Ù„ÙˆØ¬Ù‡Ø©', 'error');
        return;
    }

    const btn = document.getElementById('dispatchBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„...';

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
            showStatus('dispatchStatus', 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø§Ø¦Ù‚ÙˆÙ† Ù…ØªØ§Ø­ÙˆÙ† ÙÙŠ Ø§Ù„Ù†Ø·Ø§Ù‚', 'error');
            await db.collection('rides').doc(docRef.id).update({ status: 'no_drivers' });
            addNotifLog('dispatch', `ÙØ´Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„: Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø§Ø¦Ù‚ÙˆÙ† ÙÙŠ Ù†Ø·Ø§Ù‚ ${radius} ÙƒÙ…`);
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

            showStatus('dispatchStatus', `ØªÙ… Ø§Ù„Ø¥Ø±Ø³Ø§Ù„! ${nearby.length} Ø³Ø§Ø¦Ù‚ ØªÙ… ØªÙ†Ø¨ÙŠÙ‡Ù‡Ù… | ${realDistance.toFixed(1)} ÙƒÙ… | ${fare} MRU`, 'success');
            addNotifLog('dispatch', `Ø±Ø­Ù„Ø© ${passengerName}: ${pickupAddress} â†’ ${dropoffAddress} | ${realDistance.toFixed(1)} ÙƒÙ… | ${fare} MRU | ØªÙ†Ø¨ÙŠÙ‡ ${nearby.length} Ø³Ø§Ø¦Ù‚`);
            resetDispatchForm();
            setTimeout(closeDispatchPanel, 1500);
        }
    } catch (err) {
        showStatus('dispatchStatus', 'Ø­Ø¯Ø« Ø®Ø·Ø£: ' + err.message, 'error');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Ø¥Ø±Ø³Ø§Ù„ ØªÙ†Ø¨ÙŠÙ‡ Ù„Ù„Ø³Ø§Ø¦Ù‚ÙŠÙ†';
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
        alert('ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù†Ø³Ø¨Ø© ØµØ­ÙŠØ­Ø© (0-100)');
        return;
    }
    try {
        await db.collection('settings').doc('app_config').set({ commissionPercent: val }, { merge: true });
        commissionPercent = val;
        document.getElementById('currentCommission').textContent = `${val}%`;
        alert('ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù†Ø³Ø¨Ø© Ø¨Ù†Ø¬Ø§Ø­');
    } catch (e) {
        alert('Ø®Ø·Ø£: ' + e.message);
    }
};

// ============================================
// DRIVER SEARCH
// ============================================
window.searchDriverByPhone = async function () {
    if (!requireDb()) return;
    const phone = document.getElementById('searchDriverPhone').value.trim();
    if (!phone) { alert('Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ'); return; }
    const resultEl = document.getElementById('searchDriverResult');
    resultEl.innerHTML = '<div class="text-muted"><i class="bi bi-hourglass-split"></i> Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¨Ø­Ø«...</div>';

    try {
        const snapshot = await db.collection('drivers').where('phone', '==', phone).get();
        if (snapshot.empty) {
            resultEl.innerHTML = '<div class="alert alert-danger py-2">Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø³Ø§Ø¦Ù‚</div>';
            return;
        }
        const doc = snapshot.docs[0];
        const d = doc.data();
        resultEl.innerHTML = `
            <div class="bg-light rounded-3 p-3">
                <p class="fw-bold mb-1">${d.name || '-'}</p>
                <p class="text-muted small mb-1">Ø§Ù„Ù‡Ø§ØªÙ: ${d.phone} | Ø§Ù„Ø±ØµÙŠØ¯: <strong class="text-gold">${d.credit || 0} MRU</strong></p>
                <div class="input-group input-group-sm mt-2">
                    <input type="number" class="form-control" id="quickCreditAmount" placeholder="Ø§Ù„Ù…Ø¨Ù„Øº" min="1">
                    <button class="btn btn-success text-white fw-bold" onclick="quickAddCredit('${doc.id}')">Ø´Ø­Ù†</button>
                </div>
            </div>`;
    } catch (e) {
        resultEl.innerHTML = `<div class="alert alert-danger py-2">${e.message}</div>`;
    }
};

window.quickAddCredit = async function (driverId) {
    const amount = parseFloat(document.getElementById('quickCreditAmount').value);
    if (!amount || amount <= 0) { alert('Ø£Ø¯Ø®Ù„ Ù…Ø¨Ù„Øº ØµØ­ÙŠØ­'); return; }
    try {
        await db.collection('drivers').doc(driverId).update({
            credit: firebase.firestore.FieldValue.increment(amount)
        });
        alert(`ØªÙ… Ø´Ø­Ù† ${amount} MRU Ø¨Ù†Ø¬Ø§Ø­`);
        searchDriverByPhone();
        if (currentPage === 'drivers') loadDriversList();
    } catch (e) {
        alert('Ø®Ø·Ø£: ' + e.message);
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
                        html: `<div style="background:${r.status==='in_progress'?'#2E7D32':'#E65100'};border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);color:white;font-size:18px;">ðŸŽ«</div>`,
                        iconSize: [38, 38], iconAnchor: [19, 19]
                    });
                    const statusLabel = r.status === 'in_progress' ? 'Ø¬Ø§Ø±ÙŠØ©' : 'Ù…Ù‚Ø¨ÙˆÙ„Ø©';
                    const marker = L.marker([r.pickupLat, r.pickupLng], { icon })
                        .bindPopup(`<div style="font-family:Cairo;text-align:center;direction:rtl;"><strong>${r.passengerName || 'Ø²Ø¨ÙˆÙ†'}</strong><br><small>${r.pickupAddress || ''} â†’ ${r.dropoffAddress || ''}</small><br><strong>${r.fare || 0} MRU</strong><br><span style="color:${r.status==='in_progress'?'#2E7D32':'#E65100'};">â— ${statusLabel}</span></div>`)
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
                        html: '<div style="background:#0B1849;border:3px solid white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.3);color:white;font-size:18px;">ðŸ›µ</div>',
                        iconSize: [36, 36], iconAnchor: [18, 18]
                    });
                    const marker = L.marker([data.lat, data.lng], { icon }).addTo(map)
                        .bindPopup(`<div style="font-family:Cairo;text-align:center;direction:rtl;"><strong>${data.name || 'Ø³Ø§Ø¦Ù‚'}</strong><br><small>Ø¯Ø±Ø§Ø¬Ø© Ù†Ø§Ø±ÙŠØ© | Ø±ØµÙŠØ¯: ${data.credit || 0} MRU</small><br><span style="color:#2E7D32;">â— Ù…ØªØ§Ø­</span></div>`);
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

    if (!name) { showStatus(statusEl, 'Ø£Ø¯Ø®Ù„ Ø§Ø³Ù… Ø§Ù„Ø³Ø§Ø¦Ù‚', 'error'); return; }
    if (!phone) { showStatus(statusEl, 'Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ', 'error'); return; }
    if (!password) { showStatus(statusEl, 'Ø£Ø¯Ø®Ù„ ÙƒÙ„Ù…Ø© Ø§Ù„Ø³Ø±', 'error'); return; }

    const btn = document.getElementById('registerDriverBtn');
    btn.disabled = true; btn.textContent = 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ³Ø¬ÙŠÙ„...';
    try {
        await db.collection('drivers').add({
            name, phone, password, vehicleType: vehicle, credit,
            lat: 18.0735, lng: -15.9582, geohash: '',
            isOnline: false, disabled: false, currentRideId: null,
            rating: 5.0, totalRides: 0, fcmToken: '',
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showStatus(statusEl, 'ØªÙ… Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø¨Ù†Ø¬Ø§Ø­!', 'success');
        document.getElementById('newDriverName').value = '';
        document.getElementById('newDriverPhone').value = '';
        document.getElementById('newDriverPassword').value = '';
        document.getElementById('newDriverCredit').value = '0';
        loadDriversList();
    } catch (err) {
        showStatus(statusEl, 'Ø®Ø·Ø£: ' + err.message, 'error');
    }
    btn.disabled = false; btn.textContent = 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø³Ø§Ø¦Ù‚';
});

// ============================================
// DRIVERS LIST
// ============================================
async function loadDriversList() {
    if (!requireDb()) return;
    const tbody = document.getElementById('driversTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="khalily-spinner"></div><div class="mt-2 text-muted small">Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø³Ø§Ø¦Ù‚ÙŠÙ†...</div></td></tr>';
    try {
        const snapshot = await db.collection('drivers').get();
        allDrivers = [];
        snapshot.forEach(doc => allDrivers.push({ id: doc.id, ...doc.data() }));
        renderDriversList(allDrivers);
    } catch (err) {
        console.error('Load drivers error:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</td></tr>';
    }
}

function renderDriversList(drivers) {
    const tbody = document.getElementById('driversTableBody');
    document.getElementById('totalDriversCount').textContent = drivers.length;
    if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø§Ø¦Ù‚ÙˆÙ†</td></tr>';
        return;
    }
    tbody.innerHTML = drivers.map(d => {
        const status = d.disabled ? 'disabled' : (d.isOnline ? 'online' : 'offline');
        const label = d.disabled ? 'Ù…Ø¹Ø·Ù‘Ù„' : (d.isOnline ? 'Ù…ØªØ§Ø­' : 'ØºÙŠØ± Ù…ØªØ§Ø­');
        const badgeClass = `badge bg-${status === 'online' ? 'success' : status === 'disabled' ? 'danger' : 'secondary'}`;
        const safeName = (d.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<tr>
            <td><strong>${d.name || '-'}</strong></td>
            <td>${d.phone || '-'}</td>
            <td><strong>${d.credit || 0}</strong> MRU</td>
            <td><span class="${badgeClass}">${label}</span></td>
            <td>
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn-action btn-action-edit" onclick="openEditModal('${d.id}','${safeName}','${d.phone||''}','${d.disabled?"disabled":"active"}')">ØªØ¹Ø¯ÙŠÙ„</button>
                    <button class="btn-action btn-action-credit" onclick="openCreditModal('${d.id}','${safeName}',${d.credit||0})">Ø´Ø­Ù†</button>
                    <button class="btn-action btn-action-toggle" onclick="toggleDriverStatus('${d.id}',${d.disabled||false})">${d.disabled ? 'ØªÙØ¹ÙŠÙ„' : 'ØªØ¹Ø·ÙŠÙ„'}</button>
                    <button class="btn-action btn-action-delete" onclick="openDeleteModal('${d.id}','${safeName}')">Ø­Ø°Ù</button>
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
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4"><div class="khalily-spinner"></div><div class="mt-2 text-muted small">Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø±Ø­Ù„Ø§Øª...</div></td></tr>';
    try {
        ridesListUnsubscribe = db.collection('rides').orderBy('createdAt', 'desc').limit(100)
            .onSnapshot(snapshot => {
                const labels = { pending: 'Ù‚ÙŠØ¯ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±', accepted: 'Ù…Ù‚Ø¨ÙˆÙ„Ø©', in_progress: 'Ø¬Ø§Ø±ÙŠØ©', completed: 'Ù…ÙƒØªÙ…Ù„Ø©', cancelled: 'Ù…Ù„ØºØ§Ø©', no_drivers: 'Ø¨Ù„Ø§ Ø³Ø§Ø¦Ù‚' };
                const statusIcons = { pending: 'â³', accepted: 'âœ…', in_progress: 'ðŸ›µ', completed: 'ðŸ', cancelled: 'âŒ', no_drivers: 'ðŸš«' };

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'modified' || change.type === 'added') {
                        const rd = change.doc.data();
                        const id = change.doc.id;
                        const curr = rd.status;
                        const prev = rideStatusCache[id];
                        rideStatusCache[id] = curr;
                        if (change.type === 'added' && !prev && curr !== 'pending' && curr !== 'no_drivers') {
                            playNotificationSound();
                            addNotifLog('ride_' + curr, `${statusIcons[curr] || 'ðŸ“Œ'} ${labels[curr] || curr}: ${rd.passengerName || 'Ø²Ø¨ÙˆÙ†'} â€” ${rd.fare || 0} MRU`);
                        }
                        if (change.type === 'modified' && prev && prev !== curr) {
                            playNotificationSound();
                            if (curr === 'accepted') addNotifLog('ride_accepted', `âœ… ØªÙ… Ù‚Ø¨ÙˆÙ„ Ø§Ù„Ø±Ø­Ù„Ø©: ${rd.passengerName || 'Ø²Ø¨ÙˆÙ†'} â€” ${rd.fare || 0} MRU`);
                            else if (curr === 'in_progress') addNotifLog('ride_in_progress', `ðŸ›µ Ø¨Ø¯Ø¡ Ø§Ù„ØªÙ†ÙÙŠØ°: ${rd.passengerName || 'Ø²Ø¨ÙˆÙ†'}`);
                            else if (curr === 'completed') addNotifLog('ride_completed', `ðŸ Ø§ÙƒØªÙ…Ù„Øª: ${rd.passengerName || 'Ø²Ø¨ÙˆÙ†'} â€” ${rd.fare || 0} MRU`);
                            else if (curr === 'cancelled') addNotifLog('ride_cancelled', `âŒ ØªÙ… Ø§Ù„Ø¥Ù„ØºØ§Ø¡: ${rd.passengerName || 'Ø²Ø¨ÙˆÙ†'}`);
                            else addNotifLog('ride_' + curr, `${statusIcons[curr] || 'ðŸ“Œ'} ${labels[curr] || curr}: ${rd.passengerName || 'Ø²Ø¨ÙˆÙ†'}`);
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
                tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</td></tr>';
            });
    } catch (err) {
        console.error('Load rides error:', err);
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger py-4">Ø®Ø·Ø£ ÙÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª</td></tr>';
    }
}

function renderRidesList(rides) {
    const tbody = document.getElementById('ridesTableBody');
    if (rides.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø­Ù„Ø§Øª</td></tr>';
        return;
    }
    const labels = { pending: 'Ù‚ÙŠØ¯ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±', accepted: 'Ù…Ù‚Ø¨ÙˆÙ„Ø©', in_progress: 'Ø¬Ø§Ø±ÙŠØ©', completed: 'Ù…ÙƒØªÙ…Ù„Ø©', cancelled: 'Ù…Ù„ØºØ§Ø©', no_drivers: 'Ø¨Ù„Ø§ Ø³Ø§Ø¦Ù‚' };
    const colors = { pending: 'warning', accepted: 'primary', in_progress: 'success', completed: 'purple', cancelled: 'danger', no_drivers: 'secondary' };
    const canCancel = ['pending', 'accepted', 'in_progress'];
    tbody.innerHTML = rides.map(r => {
        const created = r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleString('ar-MA') : '-';
        const fare = r.fare || 0;
        const comm = r.commissionAmount || Math.round(fare * commissionPercent / 100);
        const dist = r.realDistanceKm ? `${r.realDistanceKm} ÙƒÙ…` : '-';
        const cancelBtn = canCancel.includes(r.status)
            ? `<button class="btn-action btn-action-delete mt-1" onclick="cancelRide('${r.id}')">Ø¥Ù„ØºØ§Ø¡</button>` : '';
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
    if (!confirm('Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø¥Ù„ØºØ§Ø¡ Ù‡Ø°Ù‡ Ø§Ù„Ø±Ø­Ù„Ø©ØŸ')) return;
    if (!requireDb()) return;
    try {
        await db.collection('rides').doc(rideId).update({ status: 'cancelled' });
        if (currentPage === 'rides') loadRidesList();
    } catch (err) { alert('Ø®Ø·Ø£: ' + err.message); }
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
    if (allDrivers.length === 0) { alert('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø§Ø¦Ù‚ÙˆÙ† Ù„Ù„ØªØµØ¯ÙŠØ±'); return; }
    let csv = '\uFEFF' + 'Ø§Ù„Ø§Ø³Ù…,Ø§Ù„Ù‡Ø§ØªÙ,Ø§Ù„Ø±ØµÙŠØ¯,Ø§Ù„Ø­Ø§Ù„Ø©,Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª\n';
    allDrivers.forEach(d => {
        const status = d.disabled ? 'Ù…Ø¹Ø·Ù‘Ù„' : (d.isOnline ? 'Ù…ØªØ§Ø­' : 'ØºÙŠØ± Ù…ØªØ§Ø­');
        csv += `${d.name||''},${d.phone||''},${d.credit||0},${status},${d.totalRides||0}\n`;
    });
    downloadCSV(csv, 'khalily_drivers.csv');
};

window.exportRidesCSV = function () {
    if (allRides.length === 0) { alert('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø­Ù„Ø§Øª Ù„Ù„ØªØµØ¯ÙŠØ±'); return; }
    let csv = '\uFEFF' + 'Ø§Ù„Ø²Ø¨ÙˆÙ†,Ø§Ù„Ù‡Ø§ØªÙ,Ù†Ù‚Ø·Ø© Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚,Ø§Ù„ÙˆØ¬Ù‡Ø©,Ø§Ù„Ù…Ø³Ø§ÙØ©,Ø§Ù„Ø³Ø¹Ø±,Ø§Ù„Ø¹Ù…ÙˆÙ„Ø©,Ø§Ù„Ø­Ø§Ù„Ø©,Ø§Ù„ØªØ§Ø±ÙŠØ®\n';
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
        addNotifLog('system', `FCM: Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ù…ÙˆØ² Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù„Ù„Ø³Ø§Ø¦Ù‚ÙŠÙ†`);
        return;
    }
    addNotifLog('system', `FCM: ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± ${tokens.length} Ø³Ø§Ø¦Ù‚ Ø¨Ù†Ø¬Ø§Ø­`);
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
        container.innerHTML = '<div class="text-center text-muted py-4 small">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø¨Ø¹Ø¯</div>';
        return;
    }
    const badgeMap = {
        'new_ride': { cls: 'log-badge-warning', label: 'Ø±Ø­Ù„Ø© Ø¬Ø¯ÙŠØ¯Ø©' },
        'ride_accepted': { cls: 'log-badge-success', label: 'ØªÙ… Ø§Ù„Ù‚Ø¨ÙˆÙ„' },
        'ride_completed': { cls: 'log-badge-info', label: 'Ø§ÙƒØªÙ…Ù„Øª' },
        'ride_cancelled': { cls: 'log-badge-danger', label: 'Ù…Ù„ØºØ§Ø©' },
        'ride_in_progress': { cls: 'log-badge-success', label: 'Ø¬Ø§Ø±ÙŠØ©' },
        'dispatch': { cls: 'log-badge-info', label: 'Ø¥Ø±Ø³Ø§Ù„' },
        'system': { cls: 'log-badge-info', label: 'Ù†Ø¸Ø§Ù…' },
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
// INIT
// ============================================
function initDashboard() {
    initMap();
    loadCommission();
    loadStats();
    initRealtimeListeners();
    setInterval(loadStats, 60000);
    addNotifLog('system', 'ØªÙ… ØªØ´ØºÙŠÙ„ Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…');
}

initDashboard();
