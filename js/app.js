// ============================================
// ARAVA ADMIN DASHBOARD - app.js (Bootstrap 5)
// Two-click map: pickup + dropoff, auto-fare
// ============================================

let db = null;
let firebaseReady = false;
let commissionPercent = 10;

// ============================================
// AUTH CHECK
// ============================================
if (sessionStorage.getItem('ARAVA_admin_logged_in') !== 'true') {
    window.location.href = 'index.html';
}

// Also verify with Firebase Auth if available
try {
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user && sessionStorage.getItem('ARAVA_admin_logged_in') === 'true') {
            // Firebase session expired but local session exists — keep it for now
            console.warn('Firebase auth expired, using local session');
        }
    });
} catch (e) {}

document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('ARAVA_admin_logged_in');
    sessionStorage.removeItem('ARAVA_admin_name');
    sessionStorage.removeItem('ARAVA_admin_role');
    try { firebase.auth().signOut(); } catch (e) {}
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
} catch (e) {
    console.error("Firebase init failed:", e);
}
firebaseReady = true;

function requireDb(caller) {
    if (!firebaseReady || !db) {
        if (caller) showStatus(caller, 'خطأ: Firebase غير مُعد.', 'error');
        return false;
    }
    return true;
}

// ============================================
// CUSTOM MODAL (replace alert/confirm)
// ============================================
function ARAalert(message, type) {
    return new Promise(function (resolve) {
        var overlay = document.getElementById('araModalOverlay');
        if (!overlay) { console.log(message); resolve(); return; }
        var icon = document.getElementById('araModalIcon');
        var title = document.getElementById('araModalTitle');
        var msg = document.getElementById('araModalMessage');
        var btns = document.getElementById('araModalButtons');
        var types = { info: ['info', 'bi-info-circle'], warning: ['warning', 'bi-exclamation-triangle'], error: ['error', 'bi-x-circle'], success: ['success', 'bi-check-circle'] };
        var t = types[type] || types.info;
        icon.className = 'ara-modal-icon ' + t[0];
        icon.innerHTML = '<i class="bi ' + t[1] + '"></i>';
        title.textContent = type === 'error' ? 'خطأ' : type === 'success' ? 'تم بنجاح' : type === 'warning' ? 'تنبيه' : 'معلومات';
        msg.textContent = message;
        btns.innerHTML = '<button class="btn btn-ok" id="araModalOk">حسناً</button>';
        overlay.classList.add('show');
        document.getElementById('araModalOk').onclick = function () { overlay.classList.remove('show'); resolve(); };
        overlay.onclick = function (e) { if (e.target === overlay) { overlay.classList.remove('show'); resolve(); } };
    });
}

function ARAconfirm(message) {
    return new Promise(function (resolve) {
        var overlay = document.getElementById('araModalOverlay');
        if (!overlay) { resolve(confirm(message)); return; }
        var icon = document.getElementById('araModalIcon');
        var title = document.getElementById('araModalTitle');
        var msg = document.getElementById('araModalMessage');
        var btns = document.getElementById('araModalButtons');
        icon.className = 'ara-modal-icon question';
        icon.innerHTML = '<i class="bi bi-question-circle"></i>';
        title.textContent = 'تأكيد';
        msg.textContent = message;
        btns.innerHTML = '<button class="btn btn-cancel" id="araModalCancel">إلغاء</button><button class="btn btn-ok" id="araModalConfirm">تأكيد</button>';
        overlay.classList.add('show');
        document.getElementById('araModalConfirm').onclick = function () { overlay.classList.remove('show'); resolve(true); };
        document.getElementById('araModalCancel').onclick = function () { overlay.classList.remove('show'); resolve(false); };
        overlay.onclick = function (e) { if (e.target === overlay) { overlay.classList.remove('show'); resolve(false); } };
    });
}

// ============================================
// IMAGE TO BASE64 HELPERS
// ============================================
function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
        var MAX_W = 640, MAX_H = 640, QUALITY = 0.3, SIZE_LIMIT = 100 * 1024;
        if (file.size <= SIZE_LIMIT) {
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result); };
            reader.onerror = function () { reject(new Error('فشل قراءة الملف')); };
            reader.readAsDataURL(file);
            return;
        }
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
            var w = img.width, h = img.height;
            if (w > MAX_W || h > MAX_H) {
                var ratio = Math.min(MAX_W / w, MAX_H / h);
                w = Math.round(w * ratio); h = Math.round(h * ratio);
            }
            var canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(function (blob) {
                URL.revokeObjectURL(url);
                if (blob) {
                    var r = new FileReader();
                    r.onload = function (e) { resolve(e.target.result); };
                    r.readAsDataURL(blob);
                } else {
                    var r = new FileReader();
                    r.onload = function (e) { resolve(e.target.result); };
                    r.readAsDataURL(file);
                }
            }, 'image/jpeg', QUALITY);
        };
        img.onerror = function () {
            URL.revokeObjectURL(url);
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result); };
            reader.readAsDataURL(file);
        };
        img.src = url;
    });
}

function filesToBase64(files, maxCount) {
    maxCount = maxCount || 10;
    var results = [];
    var chain = Promise.resolve();
    var count = Math.min(files.length, maxCount);
    for (var i = 0; i < count; i++) {
        (function (file, idx) {
            chain = chain.then(function () {
                console.log('Converting image ' + (idx + 1) + '/' + count + ' name=' + file.name + ' size=' + file.size);
                return fileToBase64(file).then(function (b64) {
                    results.push(b64);
                    var kb = (b64.length / 1024).toFixed(0);
                    console.log('Image ' + (idx + 1) + ' OK: ' + kb + 'KB');
                }).catch(function (e) {
                    console.warn('Image ' + (idx + 1) + ' failed:', e ? e.message : 'unknown error');
                });
            });
        })(files[i], i);
    }
    return chain.then(function () { return results; });
}

function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) { console.log(message); return; }
    var toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-' + (type || 'info') + ' border-0';
    toast.role = 'alert';
    toast.innerHTML = '<div class="d-flex"><div class="toast-body">' + message + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';
    container.appendChild(toast);
    var bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    setTimeout(function () { toast.remove(); }, 5000);
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
let allCustomers = [];
let allRides = [];
let ridesListUnsubscribe = null;
let deliveriesUnsubscribe = null;
let driversInfoCache = {};
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

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19
    });
    const esriStreetsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri', maxZoom: 19
    });
    const esriImageryLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Imagery © Esri', maxZoom: 19
    });

    esriStreetsLayer.addTo(map);

    L.control.layers({
        'الشوارع (Esri)': esriStreetsLayer,
        'الخريطة العادية (OSM)': osmLayer,
        'الأقمار الصناعية (Esri)': esriImageryLayer
    }, null, { position: 'topright' }).addTo(map);

    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

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

let searchResultMarker = null;

function bindMapSearch() {
    const input = document.getElementById('mapSearchInput');
    const btn = document.getElementById('mapSearchBtn');
    const resultsBox = document.getElementById('mapSearchResults');
    if (!input || !btn || !resultsBox) return;

    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    async function doSearch() {
        const q = input.value.trim();
        if (!q) { resultsBox.innerHTML = ''; return; }
        try {
            const res = await fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) +
                '&format=json&limit=6&accept-language=ar');
            const data = await res.json();
            if (!data.length) { resultsBox.innerHTML = '<div class="map-search-empty">لا توجد نتائج</div>'; return; }
            resultsBox.innerHTML = data.map((r, i) =>
                '<div class="map-search-result" data-i="' + i + '">' + escapeHtml(r.display_name) + '</div>').join('');
            resultsBox.querySelectorAll('.map-search-result').forEach(el => {
                el.onclick = () => {
                    const r = data[parseInt(el.dataset.i)];
                    map.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 16);
                    if (searchResultMarker) map.removeLayer(searchResultMarker);
                    searchResultMarker = L.marker([parseFloat(r.lat), parseFloat(r.lon)]).addTo(map)
                        .bindPopup(escapeHtml(r.display_name)).openPopup();
                    resultsBox.innerHTML = '';
                    input.value = '';
                };
            });
        } catch (e) { console.error('Map search error:', e); }
    }

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.map-search')) resultsBox.innerHTML = '';
    });
}

document.getElementById('darkModeBtn').addEventListener('click', () => {
    document.body.classList.toggle('map-dark');
    const icon = document.querySelector('#darkModeBtn i');
    if (icon) icon.className = document.body.classList.contains('map-dark') ? 'bi bi-brightness-high' : 'bi bi-moon-stars';
});

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
    if (el) el.textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ============================================
// NAVIGATION
// ============================================
const pageTitles = {
    map: 'تتبع مباشر للسائقين',
    drivers: 'إدارة السائقين',
    customers: 'إدارة الزبائن',
    deliveries: 'التوصيلات',
    'unregistered-customers': 'الزبناء غير المسجلين',
    rides: 'سجل الرحلات',
    settings: 'الإعدادات',
    messages: 'الرسائل',
    announcements: 'الإعلانات',
    admins: 'إدارة المشرفين',
    promotions: 'العروض والنشاطات',
    products: 'المتجر والمنتجات',
    stores: 'المتاجر والنشاطات الذكية',
    ladies: 'متجر عرفه للسيدات'
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
    if (page !== 'deliveries' && deliveriesUnsubscribe) { deliveriesUnsubscribe(); deliveriesUnsubscribe = null; }
    if (page === 'drivers') loadDriversList();
    if (page === 'customers') loadCustomersList();
    if (page === 'deliveries') initDeliveriesListener();
    if (page === 'unregistered-customers') loadUnregisteredCustomers();
    if (page === 'rides') loadRidesList();
    if (page === 'settings') { loadCommission(); loadRidesCleanupSettings(); }
    if (page === 'admins') loadAdminsList();
    if (page === 'messages') { loadMsgRecipients(); loadSentMessages(); loadSentCustomerMessages(); }
    if (page === 'announcements') loadAnnouncements();
    if (page === 'promotions') loadPromotionsList();
    if (page === 'products') { loadProductsList(); loadCustomerProductsList(); }
    if (page === 'stores') loadStoresList();
    if (page === 'ladies') loadLadiesProducts();
}

document.querySelectorAll('.sidebar-link').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToPage(item.dataset.page);
    });
});

// Initial page load
navigateToPage('map');

// ============================================
// DISPATCH PANEL (Custom RTL-safe)
// ============================================
let dispatchPanelOpen = false;

window.toggleDispatchPanel = function () {
    dispatchPanelOpen = !dispatchPanelOpen;
    document.getElementById('dispatchPanel').classList.toggle('open', dispatchPanelOpen);
    document.getElementById('dispatchOverlay').classList.toggle('show', dispatchPanelOpen);
    document.getElementById('dispatchOverlay').classList.toggle('d-none', !dispatchPanelOpen);
    if (dispatchPanelOpen) {
        setTimeout(() => {
            const f = document.getElementById('passengerName');
            if (f) f.focus();
        }, 350);
    }
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

const dispatchFocusChain = ['passengerName', 'passengerPhone', 'pickupAddress', 'dropoffAddress'];
dispatchFocusChain.forEach((id, i) => {
    document.getElementById(id).addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const nextId = dispatchFocusChain[i + 1] || 'dispatchBtn';
        const next = document.getElementById(nextId);
        if (next) next.focus();
    });
});

document.getElementById('fareInput').addEventListener('input', (e) => {
    const v = normalizeDigits(e.target.value).replace(/[^\d.]/g, '');
    if (e.target.value !== v) e.target.value = v;
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
    const fare = parseNum(document.getElementById('fareInput').value) || BASE_FARE;

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
        ARAalert('يرجى إدخال نسبة صحيحة (0-100)', 'warning');
        return;
    }
    try {
        await db.collection('settings').doc('app_config').set({ commissionPercent: val }, { merge: true });
        commissionPercent = val;
        document.getElementById('currentCommission').textContent = `${val}%`;
        ARAalert('تم حفظ النسبة بنجاح', 'success');
    } catch (e) {
        ARAalert('خطأ: ' + e.message, 'error');
    }
};

// ============================================
// DAILY RIDES CLEANUP
// ============================================
async function getAppConfigData() {
    try {
        const doc = await db.collection('settings').doc('app_config').get();
        return doc.exists ? doc.data() : {};
    } catch (e) { return {}; }
}

async function deleteAllRides() {
    const snapshot = await db.collection('rides').get();
    const ids = snapshot.docs.map(d => d.id);
    for (let i = 0; i < ids.length; i += 500) {
        const batch = db.batch();
        ids.slice(i, i + 500).forEach(id => batch.delete(db.collection('rides').doc(id)));
        await batch.commit();
    }
    return ids.length;
}

async function loadRidesCleanupSettings() {
    if (!db) return;
    try {
        const cfg = await getAppConfigData();
        const cb = document.getElementById('ridesCleanupAuto');
        if (cb) cb.checked = cfg.ridesCleanupAuto !== false;
        const lastRunEl = document.getElementById('ridesCleanupLastRun');
        if (lastRunEl) {
            const t = cfg.ridesCleanupLastRun && cfg.ridesCleanupLastRun.toDate ? cfg.ridesCleanupLastRun.toDate() : null;
            lastRunEl.textContent = t ? t.toLocaleString('ar-MA') : 'لم يتم بعد';
        }
    } catch (e) { console.log('Cleanup settings load error'); }
}

async function checkDailyRidesCleanup() {
    if (!db) return;
    try {
        const cfg = await getAppConfigData();
        if (cfg.ridesCleanupAuto === false) return;
        const lastRun = cfg.ridesCleanupLastRun && cfg.ridesCleanupLastRun.toDate ? cfg.ridesCleanupLastRun.toDate().getTime() : 0;
        const DAY = 24 * 60 * 60 * 1000;
        if (!lastRun) {
            await db.collection('settings').doc('app_config').set(
                { ridesCleanupLastRun: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            return;
        }
        if (Date.now() - lastRun >= DAY) {
            const count = await deleteAllRides();
            await db.collection('settings').doc('app_config').set(
                { ridesCleanupLastRun: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            addNotifLog('system', `🧹 بدأ يوم جديد: تم مسح سجل الرحلات (${count} رحلة)`);
            if (currentPage === 'rides') loadRidesList();
            loadRidesCleanupSettings();
        }
    } catch (e) {
        console.error('Daily rides cleanup error:', e);
    }
}

document.getElementById('ridesCleanupAuto')?.addEventListener('change', async (e) => {
    if (!requireDb()) return;
    const val = e.target.checked;
    try {
        await db.collection('settings').doc('app_config').set({ ridesCleanupAuto: val }, { merge: true });
        if (val) {
            await db.collection('settings').doc('app_config').set(
                { ridesCleanupLastRun: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            loadRidesCleanupSettings();
        }
        ARAalert(val ? 'تم تفعيل المسح التلقائي يوميًا' : 'تم إيقاف المسح التلقائي', 'success');
    } catch (err) {
        ARAalert('خطأ: ' + err.message, 'error');
        e.target.checked = !val;
    }
});

window.clearRidesNow = async function () {
    if (sessionStorage.getItem('ARAVA_admin_role') !== 'admin') {
        ARAalert('هذا الإجراء متاح فقط لصلاحية مدير عام', 'warning');
        return;
    }
    if (!(await ARAconfirm('سيتم حذف سجل الرحلات بالكامل الآن. هل أنت متأكد؟'))) return;
    if (!(await ARAconfirm('تأكيد نهائي: سيبدأ يوم جديد بسجل فارغ. متابعة؟'))) return;
    if (!requireDb()) return;
    try {
        const count = await deleteAllRides();
        await db.collection('settings').doc('app_config').set(
            { ridesCleanupLastRun: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        addNotifLog('system', `🧹 تم مسح سجل الرحلات يدويًا (${count} رحلة)`);
        if (currentPage === 'rides') loadRidesList();
        loadRidesCleanupSettings();
        ARAalert(`تم مسح سجل الرحلات (${count} رحلة)`, 'success');
    } catch (err) {
        ARAalert('خطأ: ' + err.message, 'error');
    }
};

const ARABIC_DIGIT_MAP = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' };
function normalizeDigits(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[٠-٩۰-۹]/g, ch => ARABIC_DIGIT_MAP[ch] || ch);
}
function parseNum(str) {
    const cleaned = normalizeDigits(str).replace(/[^\d.\-]/g, '');
    if (cleaned === '') return NaN;
    const v = parseFloat(cleaned);
    return isNaN(v) ? NaN : v;
}

// ============================================
// DRIVER SEARCH
// ============================================
let lastSearchedDriverId = null;

window.searchDriverByPhone = async function () {
    if (!requireDb()) return;
    const phone = document.getElementById('searchDriverPhone').value.trim();
    if (!phone) { ARAalert('أدخل رقم الهاتف', 'warning'); return; }
    const resultEl = document.getElementById('searchDriverResult');
    resultEl.innerHTML = '<div class="text-muted"><i class="bi bi-hourglass-split"></i> جاري البحث...</div>';

    try {
        const snapshot = await db.collection('drivers').where('phone', '==', phone).get();
        if (snapshot.empty) {
            lastSearchedDriverId = null;
            resultEl.innerHTML = '<div class="alert alert-danger py-2">لم يتم العثور على سائق</div>';
            return;
        }
        const doc = snapshot.docs[0];
        lastSearchedDriverId = doc.id;
        renderDriverSearchResult(doc.id, doc.data());
    } catch (e) {
        resultEl.innerHTML = `<div class="alert alert-danger py-2">${e.message}</div>`;
    }
};

function renderDriverSearchResult(id, d) {
    const resultEl = document.getElementById('searchDriverResult');
    if (!resultEl) return;
    const safeName = (d.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const disabled = !!d.disabled;
    resultEl.innerHTML = `
        <div class="bg-light rounded-3 p-3">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                    <p class="fw-bold mb-1">${d.name || '-'}</p>
                    <p class="text-muted small mb-1">الهاتف: <span dir="ltr">${d.phone || '-'}</span> | الرصيد: <strong class="text-gold">${d.credit || 0} MRU</strong></p>
                </div>
                <span class="badge ${disabled ? 'bg-danger' : 'bg-success'}">${disabled ? 'معطّل' : 'مفعّل'}</span>
            </div>
            <div class="d-flex gap-1 flex-wrap mt-2">
                <button class="btn-action btn-action-edit" onclick="openEditModal('${id}','${safeName}','${d.phone||''}','${disabled?"disabled":"active"}')">تعديل</button>
                <button class="btn-action btn-action-credit" onclick="openCreditModal('${id}','${safeName}',${d.credit||0})">شحن</button>
                <button class="btn-action btn-action-edit" style="background:#fff3cd;border-color:#ffc107;color:#856404" onclick="openEditCreditModal('${id}','${safeName}',${d.credit||0})">تعديل الرصيد</button>
                <button class="btn-action btn-action-toggle" onclick="toggleDriverStatus('${id}',${disabled})">${disabled ? 'تفعيل' : 'تعطيل'}</button>
                <button class="btn-action btn-action-delete" onclick="openDeleteModal('${id}','${safeName}')">حذف</button>
            </div>
            <div class="input-group input-group-sm mt-2" style="max-width:280px">
                <input type="text" class="form-control" id="quickCreditAmount" placeholder="المبلغ (MRU)" inputmode="numeric">
                <button class="btn btn-success text-white fw-bold" onclick="quickAddCredit('${id}')">شحن سريع</button>
            </div>
        </div>`;
}

window.quickAddCredit = async function (driverId) {
    const amount = parseNum(document.getElementById('quickCreditAmount').value);
    if (!amount || amount <= 0) { ARAalert('أدخل مبلغ صحيح', 'warning'); return; }
    try {
        await db.collection('drivers').doc(driverId).update({
            credit: firebase.firestore.FieldValue.increment(amount)
        });
        ARAalert(`تم شحن ${amount} MRU بنجاح`, 'success');
        refreshDriverSearchResult();
        if (currentPage === 'drivers') loadDriversList();
    } catch (e) {
        ARAalert('خطأ: ' + e.message, 'error');
    }
};

window.refreshDriverSearchResult = async function () {
    if (!lastSearchedDriverId) return;
    const resultEl = document.getElementById('searchDriverResult');
    if (!resultEl) return;
    try {
        const snap = await db.collection('drivers').doc(lastSearchedDriverId).get();
        if (snap.exists) {
            renderDriverSearchResult(snap.id, snap.data());
        } else {
            lastSearchedDriverId = null;
            resultEl.innerHTML = '<div class="alert alert-warning py-2">تم حذف هذا السائق من قاعدة البيانات</div>';
        }
    } catch (e) { console.error('Search refresh error:', e); }
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
    const credit = parseNum(document.getElementById('newDriverCredit').value) || 0;

    if (!name) { showStatus(statusEl, 'أدخل اسم السائق', 'error'); return; }
    if (!phone) { showStatus(statusEl, 'أدخل رقم الهاتف', 'error'); return; }
    if (!password) { showStatus(statusEl, 'أدخل كلمة السر', 'error'); return; }

    const btn = document.getElementById('registerDriverBtn');
    btn.disabled = true; btn.textContent = 'جاري التسجيل...';
    try {
        const dup = await db.collection('drivers').where('phone', '==', phone).get();
        if (!dup.empty) {
            const existing = dup.docs[0].data().name || 'سائق آخر';
            showStatus(statusEl, 'رقم الهاتف ' + phone + ' مسجل بالفعل للسائق: ' + existing, 'error');
            btn.disabled = false; btn.textContent = 'تسجيل السائق';
            return;
        }
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
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري تحميل السائقين...</div></td></tr>';
    try {
        const snapshot = await db.collection('drivers').get();
        allDrivers = [];
        snapshot.forEach(doc => allDrivers.push({ id: doc.id, ...doc.data() }));
        renderDriversList(allDrivers);
    } catch (err) {
        console.error('Load drivers error:', err);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

function renderDriversList(drivers) {
    const tbody = document.getElementById('driversTableBody');
    document.getElementById('totalDriversCount').textContent = drivers.length;
    if (drivers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">لا يوجد سائقون</td></tr>';
        return;
    }
    tbody.innerHTML = drivers.map(d => {
        const status = d.disabled ? 'disabled' : (d.isOnline ? 'online' : 'offline');
        const label = d.disabled ? 'معطّل' : (d.isOnline ? 'متاح' : 'غير متاح');
        const badgeClass = `badge bg-${status === 'online' ? 'success' : status === 'disabled' ? 'danger' : 'secondary'}`;
        const safeName = (d.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<tr>
            <td><strong>${d.name || '-'}</strong></td>
            <td><span dir="ltr">${d.phone || '-'}</span></td>
            <td><span class="text-muted">${d.password ? '••••' : '-'}</span> <button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="openPasswordModal('${d.id}','${safeName}')"><i class="bi bi-key"></i></button></td>
            <td><strong>${d.credit || 0}</strong> MRU</td>
            <td><span class="${badgeClass}">${label}</span></td>
            <td>
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn-action btn-action-edit" onclick="openEditModal('${d.id}','${safeName}','${d.phone||''}','${d.disabled?"disabled":"active"}')">تعديل</button>
                    <button class="btn-action btn-action-credit" onclick="openCreditModal('${d.id}','${safeName}',${d.credit||0})">شحن</button>
                    <button class="btn-action btn-action-edit" style="background:#fff3cd;border-color:#ffc107;color:#856404" onclick="openEditCreditModal('${d.id}','${safeName}',${d.credit||0})">تعديل الرصيد</button>
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
// UNREGISTERED CUSTOMERS
// ============================================
let allUnregisteredCustomers = [];

async function loadUnregisteredCustomers() {
    if (!requireDb()) return;
    const tbody = document.getElementById('unregCustomersTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري تحميل البيانات...</div></td></tr>';
    try {
        const [ridesSnap, custSnap] = await Promise.all([
            db.collection('rides').orderBy('createdAt', 'desc').limit(500).get(),
            db.collection('customers').get()
        ]);
        const registered = new Set();
        custSnap.forEach(c => {
            const cc = c.data();
            if (cc.phone) registered.add(normalizeDigits(cc.phone).replace(/[^\d]/g, ''));
        });
        const agg = {};
        ridesSnap.forEach(doc => {
            const r = doc.data();
            const phone = normalizeDigits(r.passengerPhone || '').replace(/[^\d]/g, '');
            if (!phone || registered.has(phone)) return;
            if (!agg[phone]) agg[phone] = { name: r.passengerName || 'زبون', phone, rides: 0, total: 0, last: null };
            agg[phone].rides++;
            const fare = parseNum(r.fare);
            agg[phone].total += (isNaN(fare) ? 0 : fare);
            const t = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : null;
            if (t && (!agg[phone].last || t > agg[phone].last)) {
                agg[phone].last = t;
                agg[phone].name = r.passengerName || agg[phone].name;
            }
        });
        allUnregisteredCustomers = Object.values(agg).sort((a, b) => b.rides - a.rides);
        renderUnregisteredCustomers(allUnregisteredCustomers);
    } catch (err) {
        console.error('Load unregistered customers error:', err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

function renderUnregisteredCustomers(list) {
    const tbody = document.getElementById('unregCustomersTableBody');
    document.getElementById('totalUnregCustomersCount').textContent = list.length;
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">لا يوجد زبناء غير مسجلين</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(c => `<tr>
        <td><strong>${c.name || '-'}</strong></td>
        <td><span dir="ltr">${c.phone}</span></td>
        <td>${c.rides}</td>
        <td><strong>${c.total || 0}</strong> MRU</td>
        <td><small>${c.last ? c.last.toLocaleString('ar-MA') : '-'}</small></td>
    </tr>`).join('');
}

document.getElementById('searchUnregCustomers').addEventListener('input', () => {
    const q = document.getElementById('searchUnregCustomers').value.trim();
    renderUnregisteredCustomers(allUnregisteredCustomers.filter(c => {
        return !q || (c.name || '').includes(q) || c.phone.includes(q) ||
            (c.name || '').localeCompare(q, 'ar', { sensitivity: 'base' }) === 0;
    }));
});

window.exportUnregisteredCustomersCSV = function () {
    if (!allUnregisteredCustomers.length) { ARAalert('لا توجد بيانات للتصدير', 'warning'); return; }
    const rows = [['الاسم', 'الهاتف', 'عدد الرحلات', 'إجمالي المبالغ', 'آخر رحلة']];
    allUnregisteredCustomers.forEach(c => {
        rows.push([c.name || '', c.phone, c.rides, c.total || 0, c.last ? c.last.toLocaleString('ar-MA') : '']);
    });
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'unregistered_customers.csv';
    a.click();
};

// ============================================
// CUSTOMERS LIST
// ============================================
async function loadCustomersList() {
    if (!requireDb()) return;
    const tbody = document.getElementById('customersTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري تحميل الزبائن...</div></td></tr>';
    try {
        const snapshot = await db.collection('customers').get();
        allCustomers = [];
        snapshot.forEach(doc => allCustomers.push({ id: doc.id, ...doc.data() }));
        renderCustomersList(allCustomers);
    } catch (err) {
        console.error('Load customers error:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

function renderCustomersList(customers) {
    const tbody = document.getElementById('customersTableBody');
    document.getElementById('totalCustomersCount').textContent = customers.length;
    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">لا يوجد زبائن</td></tr>';
        return;
    }
    tbody.innerHTML = customers.map(c => {
        const status = c.isOnline ? 'online' : 'offline';
        const label = c.isOnline ? 'متصل' : 'غير متصل';
        const badgeClass = `badge bg-${status === 'online' ? 'success' : 'secondary'}`;
        const safeName = (c.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<tr>
            <td><strong>${c.name || '-'}</strong></td>
            <td><span dir="ltr">${c.phone || '-'}</span></td>
            <td><span dir="ltr">${c.whatsapp || '-'}</span></td>
            <td><span class="text-muted">${c.password ? '••••' : '-'}</span> <button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="openCustomerPasswordModal('${c.id}','${safeName}')"><i class="bi bi-key"></i></button></td>
            <td><strong>${c.credit || 0}</strong> MRU</td>
            <td><span class="${badgeClass}">${label}</span></td>
            <td>${c.totalRides || 0}</td>
            <td>
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn-action btn-action-edit" onclick="openEditCustomerModal('${c.id}','${safeName}','${c.phone||''}','${c.whatsapp||''}')">تعديل</button>
                    <button class="btn-action btn-action-credit" onclick="openCustomerCreditModal('${c.id}','${safeName}',${c.credit||0})">شحن</button>
                    <button class="btn-action btn-action-edit" style="background:#fff3cd;border-color:#ffc107;color:#856404" onclick="openEditCustomerCreditModal('${c.id}','${safeName}',${c.credit||0})">تعديل الرصيد</button>
                    <button class="btn-action btn-action-delete" onclick="openDeleteCustomerModal('${c.id}','${safeName}')">حذف</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('searchCustomers').addEventListener('input', filterCustomers);
document.getElementById('filterCustomerStatus').addEventListener('change', filterCustomers);

function filterCustomers() {
    const query = document.getElementById('searchCustomers').value;
    const statusFilter = document.getElementById('filterCustomerStatus').value;
    renderCustomersList(allCustomers.filter(c => {
        const name = (c.name || '');
        const phone = (c.phone || '');
        const matchQ = !query || name.includes(query) || phone.includes(query) ||
            name.localeCompare(query, 'ar', { sensitivity: 'base' }) === 0;
        let matchS = true;
        if (statusFilter === 'online') matchS = c.isOnline;
        else if (statusFilter === 'offline') matchS = !c.isOnline;
        return matchQ && matchS;
    }));
}

// Register customer
document.getElementById('registerCustomerBtn').addEventListener('click', async () => {
    const statusEl = 'registerCustomerStatus';
    if (!requireDb(statusEl)) return;
    const name = document.getElementById('newCustomerName').value.trim();
    const phone = document.getElementById('newCustomerPhone').value.trim();
    const whatsapp = document.getElementById('newCustomerWhatsapp').value.trim();
    const password = document.getElementById('newCustomerPassword').value.trim();
    const credit = parseNum(document.getElementById('newCustomerCredit').value) || 0;

    if (!name) { showStatus(statusEl, 'أدخل اسم الزبون', 'error'); return; }
    if (!phone) { showStatus(statusEl, 'أدخل رقم الهاتف', 'error'); return; }
    if (!password) { showStatus(statusEl, 'أدخل كلمة السر', 'error'); return; }

    const btn = document.getElementById('registerCustomerBtn');
    btn.disabled = true; btn.textContent = 'جاري التسجيل...';
    try {
        await db.collection('customers').add({
            name, phone, whatsapp, password, credit,
            lat: 18.0735, lng: -15.9582, geohash: '',
            isOnline: false, totalRides: 0, fcmToken: '', deviceId: '',
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showStatus(statusEl, 'تم التسجيل بنجاح!', 'success');
        document.getElementById('newCustomerName').value = '';
        document.getElementById('newCustomerPhone').value = '';
        document.getElementById('newCustomerWhatsapp').value = '';
        document.getElementById('newCustomerPassword').value = '';
        document.getElementById('newCustomerCredit').value = '0';
        loadCustomersList();
    } catch (err) {
        showStatus(statusEl, 'خطأ: ' + err.message, 'error');
    }
    btn.disabled = false; btn.textContent = 'تسجيل الزبون';
});

// ============================================
// BOOTSTRAP MODALS
// ============================================
const editModal = new bootstrap.Modal(document.getElementById('editDriverModal'));
const creditModal = new bootstrap.Modal(document.getElementById('creditModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
const editCreditModal = new bootstrap.Modal(document.getElementById('editCreditModal'));

// Customer modals
const editCustomerModal = new bootstrap.Modal(document.getElementById('editCustomerModal'));
const customerCreditModal = new bootstrap.Modal(document.getElementById('customerCreditModal'));
const deleteCustomerModal = new bootstrap.Modal(document.getElementById('deleteCustomerModal'));
const customerPasswordModal = new bootstrap.Modal(document.getElementById('customerPasswordModal'));
const editCustomerCreditModal = new bootstrap.Modal(document.getElementById('editCustomerCreditModal'));
const editAdminModal = new bootstrap.Modal(document.getElementById('editAdminModal'));

window.openPasswordModal = function(id, name) {
    document.getElementById('passwordDriverId').value = id;
    document.getElementById('passwordDriverName').textContent = name;
    document.getElementById('newPasswordValue').value = '';
    passwordModal.show();
};

document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('passwordDriverId').value;
    const newPass = document.getElementById('newPasswordValue').value.trim();
    if (!newPass) { ARAalert('أدخل كلمة السر الجديدة', 'warning'); return; }
    try {
        await db.collection('drivers').doc(id).update({ password: newPass });
        passwordModal.hide();
        loadDriversList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
});

window.openEditCreditModal = function(id, name, current) {
    document.getElementById('editCreditDriverId').value = id;
    document.getElementById('editCreditDriverName').textContent = name;
    document.getElementById('editCreditCurrent').textContent = current;
    document.getElementById('editCreditNewValue').value = current;
    editCreditModal.show();
};

document.getElementById('confirmEditCreditBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('editCreditDriverId').value;
    const newVal = parseNum(document.getElementById('editCreditNewValue').value);
    if (newVal === null || newVal === undefined || isNaN(newVal) || newVal < 0) {
        ARAalert('أدخل رصيد صحيح', 'warning'); return;
    }
    try {
        await db.collection('drivers').doc(id).update({ credit: newVal });
        editCreditModal.hide();
        loadDriversList();
        refreshDriverSearchResult();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
});

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
        const dup = await db.collection('drivers').where('phone', '==', phone).get();
        const dupDoc = dup.docs.find(d => d.id !== id);
        if (dupDoc) {
            const existing = dupDoc.data().name || 'سائق آخر';
            ARAalert('رقم الهاتف ' + phone + ' مسجل بالفعل للسائق: ' + existing, 'error');
            return;
        }
        await db.collection('drivers').doc(id).update({ name, phone, disabled: status === 'disabled' });
        editModal.hide();
        loadDriversList();
        refreshDriverSearchResult();
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
    const amount = parseNum(document.getElementById('creditAmount').value);
    if (!amount || amount <= 0) return;
    try {
        await db.collection('drivers').doc(id).update({ credit: firebase.firestore.FieldValue.increment(amount) });
        creditModal.hide();
        loadDriversList();
        refreshDriverSearchResult();
    } catch (err) { console.error('Credit error:', err); }
});

window.toggleDriverStatus = async function(id, currentlyDisabled) {
    if (!requireDb()) return;
    try {
        await db.collection('drivers').doc(id).update({ disabled: !currentlyDisabled, isOnline: false });
        loadDriversList();
        refreshDriverSearchResult();
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
        refreshDriverSearchResult();
    } catch (err) { console.error('Delete error:', err); }
});

window.openCustomerPasswordModal = function(id, name) {
    document.getElementById('customerPasswordId').value = id;
    document.getElementById('customerPasswordName').textContent = name;
    document.getElementById('newCustomerPasswordValue').value = '';
    customerPasswordModal.show();
};

document.getElementById('saveCustomerPasswordBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('customerPasswordId').value;
    const newPass = document.getElementById('newCustomerPasswordValue').value.trim();
    if (!newPass) { ARAalert('أدخل كلمة السر الجديدة', 'warning'); return; }
    try {
        await db.collection('customers').doc(id).update({ password: newPass });
        customerPasswordModal.hide();
        loadCustomersList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
});

window.openEditCustomerCreditModal = function(id, name, current) {
    document.getElementById('editCustomerCreditId').value = id;
    document.getElementById('editCustomerCreditName').textContent = name;
    document.getElementById('editCustomerCreditCurrent').textContent = current;
    document.getElementById('editCustomerCreditNewValue').value = current;
    editCustomerCreditModal.show();
};

document.getElementById('confirmEditCustomerCreditBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('editCustomerCreditId').value;
    const newVal = parseNum(document.getElementById('editCustomerCreditNewValue').value);
    if (newVal === null || newVal === undefined || isNaN(newVal) || newVal < 0) {
        ARAalert('أدخل رصيد صحيح', 'warning'); return;
    }
    try {
        await db.collection('customers').doc(id).update({ credit: newVal });
        editCustomerCreditModal.hide();
        loadCustomersList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
});

window.openEditCustomerModal = function(id, name, phone, whatsapp) {
    document.getElementById('editCustomerId').value = id;
    document.getElementById('editCustomerName').value = name;
    document.getElementById('editCustomerPhone').value = phone;
    document.getElementById('editCustomerWhatsapp').value = whatsapp;
    editCustomerModal.show();
};

document.getElementById('saveEditCustomerBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('editCustomerId').value;
    const name = document.getElementById('editCustomerName').value.trim();
    const phone = document.getElementById('editCustomerPhone').value.trim();
    const whatsapp = document.getElementById('editCustomerWhatsapp').value.trim();
    if (!name) return;
    try {
        await db.collection('customers').doc(id).update({ name, phone, whatsapp });
        editCustomerModal.hide();
        loadCustomersList();
    } catch (err) { console.error('Edit customer error:', err); }
});

window.openCustomerCreditModal = function(id, name, current) {
    document.getElementById('customerCreditId').value = id;
    document.getElementById('customerCreditName').textContent = name;
    document.getElementById('customerCreditCurrent').textContent = current;
    document.getElementById('customerCreditAmount').value = '';
    customerCreditModal.show();
};

document.getElementById('confirmCustomerCreditBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('customerCreditId').value;
    const amount = parseFloat(document.getElementById('customerCreditAmount').value);
    if (!amount || amount <= 0) return;
    try {
        await db.collection('customers').doc(id).update({ credit: firebase.firestore.FieldValue.increment(amount) });
        customerCreditModal.hide();
        loadCustomersList();
    } catch (err) { console.error('Customer credit error:', err); }
});

window.openDeleteCustomerModal = function(id, name) {
    document.getElementById('deleteCustomerId').value = id;
    document.getElementById('deleteCustomerName').textContent = name;
    deleteCustomerModal.show();
};

document.getElementById('confirmDeleteCustomerBtn').addEventListener('click', async () => {
    if (!requireDb()) return;
    const id = document.getElementById('deleteCustomerId').value;
    try {
        await db.collection('customers').doc(id).delete();
        deleteCustomerModal.hide();
        loadCustomersList();
    } catch (err) { console.error('Delete customer error:', err); }
});

// Export customers CSV
window.exportCustomersCSV = function () {
    if (allCustomers.length === 0) { ARAalert('لا يوجد زبائن للتصدير', 'info'); return; }
    let csv = '\uFEFF' + 'الاسم,الهاتف,الواتساب,الرصيد,الحالة,الرحلات\n';
    allCustomers.forEach(c => {
        const status = c.isOnline ? 'متصل' : 'غير متصل';
        csv += `${c.name||''},${c.phone||''},${c.whatsapp||''},${c.credit||0},${status},${c.totalRides||0}\n`;
    });
    downloadCSV(csv, 'ARAVA_customers.csv');
};

// ============================================
// RIDES LIST
// ============================================
async function loadRidesList() {
    if (!requireDb()) return;
    if (ridesListUnsubscribe) { ridesListUnsubscribe(); ridesListUnsubscribe = null; }
    const tbody = document.getElementById('ridesTableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري تحميل الرحلات...</div></td></tr>';
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
                enrichRidesWithDrivers(allRides, () => {
                    const currentFilter = document.getElementById('filterRideStatus')?.value || 'all';
                    if (currentFilter === 'all') renderRidesList(allRides);
                    else renderRidesList(allRides.filter(r => r.status === currentFilter));
                });
            }, err => {
                console.error('Rides listener error:', err);
                tbody.innerHTML = '<tr><td colspan="12" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
            });
    } catch (err) {
        console.error('Load rides error:', err);
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

async function enrichRidesWithDrivers(rides, done) {
    const ids = [...new Set(rides.map(r => r.assignedDriverId).filter(Boolean))];
    const missing = ids.filter(id => !driversInfoCache[id]);
    for (let i = 0; i < missing.length; i += 10) {
        const chunk = missing.slice(i, i + 10);
        try {
            const snap = await db.collection('drivers').where('__name__', 'in', chunk).get();
            snap.forEach(d => {
                const dd = d.data();
                driversInfoCache[d.id] = { name: dd.name || 'سائق', phone: dd.phone || '-' };
            });
        } catch (e) { console.error('Driver lookup error:', e); }
    }
    if (done) done();
}

function renderRidesList(rides) {
    const tbody = document.getElementById('ridesTableBody');
    if (rides.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center text-muted py-4">لا توجد رحلات</td></tr>';
        return;
    }
    const labels = { pending: 'قيد الانتظار', accepted: 'مقبولة', in_progress: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة', no_drivers: 'بلا سائق' };
    const colors = { pending: 'warning', accepted: 'primary', in_progress: 'success', completed: 'purple', cancelled: 'danger', no_drivers: 'secondary' };
    const canCancel = ['pending', 'accepted', 'in_progress'];
    const canRelaunch = ['cancelled', 'no_drivers'];
    tbody.innerHTML = rides.map(r => {
        const created = r.createdAt?.toDate ? fmtDate(r.createdAt.toDate()) : '-';
        const fare = r.fare || 0;
        const comm = r.commissionAmount || Math.round(fare * commissionPercent / 100);
        const commPct = r.commissionPercent || commissionPercent;
        const dist = r.realDistanceKm ? `${r.realDistanceKm} كم` : '-';
        const driver = r.assignedDriverId ? (driversInfoCache[r.assignedDriverId] || null) : null;
        const driverName = driver ? driver.name : (r.assignedDriverId ? '...' : '-');
        const driverPhone = driver ? driver.phone : '-';
        const actionBtn = canCancel.includes(r.status)
            ? `<button class="btn-action btn-action-delete mt-1" onclick="cancelRide('${r.id}')">إلغاء</button>`
            : canRelaunch.includes(r.status)
                ? `<button class="btn-action btn-action-edit mt-1" onclick="reLaunchRide('${r.id}')"><i class="bi bi-arrow-repeat me-1"></i>إعادة إطلاق</button>`
                : '';
        return `<tr>
            <td><strong>${r.passengerName || '-'}</strong></td>
            <td class="d-none d-md-table-cell"><small dir="ltr">${r.passengerPhone || '-'}</small></td>
            <td class="d-none d-md-table-cell">${r.pickupAddress || '-'}</td>
            <td class="d-none d-md-table-cell">${r.dropoffAddress || '-'}</td>
            <td><small>${dist}</small></td>
            <td><strong>${fare}</strong> MRU</td>
            <td><strong class="text-danger">${comm}</strong> MRU <small class="text-muted">(${commPct}%)</small></td>
            <td><strong>${driverName}</strong></td>
            <td class="d-none d-lg-table-cell"><small dir="ltr">${driverPhone}</small></td>
            <td><span class="badge bg-${colors[r.status] || 'secondary'}">${labels[r.status] || r.status}</span></td>
            <td class="d-none d-lg-table-cell"><small>${created}</small></td>
            <td>${actionBtn}</td>
        </tr>`;
    }).join('');
}

window.cancelRide = async function (rideId) {
    if (!(await ARAconfirm('هل أنت متأكد من إلغاء هذه الرحلة؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('rides').doc(rideId).update({ status: 'cancelled' });
        if (currentPage === 'rides') loadRidesList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.reLaunchRide = async function (rideId) {
    if (!requireDb()) return;
    if (!(await ARAconfirm('سيتم إطلاق نفس الرحلة مرة أخرى بنفس المعلومات وتنبيه السائقين القريبين. متابعة؟'))) return;
    try {
        const snap = await db.collection('rides').doc(rideId).get();
        if (!snap.exists) { ARAalert('الرحلة غير موجودة', 'error'); return; }
        const r = snap.data();
        if (r.status !== 'cancelled' && r.status !== 'no_drivers') {
            ARAalert('يمكن إعادة إطلاق الرحلات الملغاة فقط', 'warning');
            return;
        }
        const radius = r.searchRadiusKm || 3;
        const lat = r.pickupLat || 0;
        const lng = r.pickupLng || 0;
        const rideData = {
            passengerName: r.passengerName || '',
            passengerPhone: r.passengerPhone || '',
            pickupLat: lat,
            pickupLng: lng,
            dropoffLat: r.dropoffLat || 0,
            dropoffLng: r.dropoffLng || 0,
            pickupAddress: r.pickupAddress || '',
            dropoffAddress: r.dropoffAddress || '',
            notes: r.notes || '',
            realDistanceKm: r.realDistanceKm || 0,
            searchRadiusKm: radius,
            fare: r.fare || BASE_FARE,
            commissionPercent: r.commissionPercent || commissionPercent,
            status: 'pending',
            reLaunchedFrom: rideId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        const docRef = await db.collection('rides').add(rideData);
        const nearby = await findNearbyDrivers(lat, lng, radius);
        if (nearby.length === 0) {
            await db.collection('rides').doc(docRef.id).update({ status: 'no_drivers' });
            addNotifLog('dispatch', `فشل إعادة الإطلاق: لا يوجد سائقون في نطاق ${radius} كم`);
            ARAalert('لا يوجد سائقون متاحون في النطاق. الرحلة جديدة الآن كرحلة بلا سائق.', 'error');
        } else {
            const nearbyIds = nearby.map(d => d.id);
            const tokens = nearby.filter(d => d.fcmToken).map(d => d.fcmToken);
            await db.collection('rides').doc(docRef.id).update({
                notifiedDrivers: nearbyIds,
                notificationSentAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (tokens.length > 0) {
                sendFCMNotifications(tokens, docRef.id, rideData.passengerName, rideData.fare, lat, lng, rideData.pickupAddress, rideData.dropoffAddress, radius, {
                    notes: rideData.notes || '',
                    deliveryId: r.deliveryId || ''
                });
            }
            addNotifLog('dispatch', `إعادة إطلاق رحلة ${rideData.passengerName}: ${rideData.pickupAddress} → ${rideData.dropoffAddress} | ${rideData.realDistanceKm} كم | ${rideData.fare} MRU | تنبيه ${nearby.length} سائق`);
            ARAalert(`تمت إعادة الإطلاق! تم تنبيه ${nearby.length} سائق`, 'success');
        }
        if (currentPage === 'rides') loadRidesList();
    } catch (err) {
        ARAalert('خطأ: ' + err.message, 'error');
    }
};

document.getElementById('filterRideStatus').addEventListener('change', () => {
    const s = document.getElementById('filterRideStatus').value;
    renderRidesList(s === 'all' ? allRides : allRides.filter(r => r.status === s));
});

// ============================================
// HELPERS (Latin digits + dates)
// ============================================
function fmtDate(d) {
    try {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + mi;
    } catch (e) { return '-'; }
}

function fmtNum(n) {
    if (n == null) return '';
    return String(n).replace(/[٠-٩۰-۹]/g, function (ch) {
        return String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(ch) % 10);
    });
}

// ============================================
// DELIVERIES (from Customer App)
// ============================================
const deliveryStatusLabels = { new: 'جديد', price_sent: 'سعر مرسل', accepted: 'نشط (مقبول)', launched: 'في الطريق', in_progress: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة' };
const deliveryStatusColors = { new: 'warning', price_sent: 'info', accepted: 'primary', launched: 'success', in_progress: 'success', completed: 'purple', cancelled: 'danger' };
let allDeliveries = [];
let seenDeliveryIds = new Set();
let deliveriesFirstSnapshot = true;

function initDeliveriesListener() {
    if (!requireDb()) return;
    if (deliveriesUnsubscribe) { deliveriesUnsubscribe(); deliveriesUnsubscribe = null; }
    const tbody = document.getElementById('deliveriesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري تحميل التوصيلات...</div></td></tr>';
    try {
        deliveriesUnsubscribe = db.collection('delivery_requests').orderBy('createdAt', 'desc').limit(150)
            .onSnapshot(snap => {
                allDeliveries = [];
                const newRequests = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    allDeliveries.push({ id: doc.id, ...data });
                    if (data.status === 'new' && !seenDeliveryIds.has(doc.id)) {
                        seenDeliveryIds.add(doc.id);
                        newRequests.push({ id: doc.id, ...data });
                    }
                });
                if (!deliveriesFirstSnapshot && newRequests.length > 0) {
                    newRequests.forEach(r => {
                        playNotificationSound();
                        addNotifLog('delivery_new', `🚚 طلب توصيل جديد من ${r.customerName || r.customerPhone || 'زبون'} — المستلم: ${r.receiverDistrict || r.receiverPhone || '-'} — الحي: ${r.senderDistrict || '-'}`);
                        ARAalert(
                            `طلب توصيل جديد!\nمن: ${r.customerName || r.customerPhone || 'زبون'}\nالمستلم: ${r.receiverDistrict || r.receiverPhone || '-'}\nالحي: ${r.senderDistrict || '-'}`,
                            'info'
                        );
                    });
                }
                deliveriesFirstSnapshot = false;
                const s = document.getElementById('filterDeliveryStatus')?.value || 'all';
                loadDeliveriesList(s);
            }, err => {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
            });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

function loadDeliveriesList(forceFilter) {
    const s = forceFilter || document.getElementById('filterDeliveryStatus')?.value || 'all';
    renderDeliveriesList(s === 'all' ? allDeliveries : allDeliveries.filter(d => d.status === s));
}

function renderDeliveriesList(deliveries) {
    const tbody = document.getElementById('deliveriesTableBody');
    if (!tbody) return;
    if (deliveries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">لا توجد توصيلات</td></tr>';
        return;
    }
    const q = (document.getElementById('searchDeliveries')?.value || '').trim();
    const filtered = q ? deliveries.filter(d => (d.customerPhone || '').includes(q) || (d.receiverPhone || '').includes(q) || (d.customerName || '').includes(q)) : deliveries;
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">لا توجد نتائج</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(d => {
        const created = d.createdAt?.toDate ? fmtDate(d.createdAt.toDate()) : '-';
        const price = d.pendingPrice != null ? d.pendingPrice : (d.fare != null ? d.fare : '-');
        const safeName = (d.customerName || d.customerPhone || '').replace(/'/g, '');
        const safeRecv = (d.receiverPhone || '').replace(/'/g, '');
        let actions = '';
        if (d.status === 'new') {
            actions += `<button class="btn-action btn-action-credit" onclick="openDeliveryPriceModal('${d.id}','${safeName}','${safeRecv}')">إرسال السعر</button> `;
        }
        if (d.status === 'new' || d.status === 'price_sent') {
            actions += `<button class="btn-action btn-action-edit" onclick="setDeliveryStatus('${d.id}','accepted')">قبول (نشط)</button> `;
        }
        if (d.status === 'accepted' || d.status === 'launched' || d.status === 'in_progress') {
            actions += `<button class="btn-action btn-action-credit" onclick="setDeliveryStatus('${d.id}','completed')">مكتملة</button> `;
        }
        if (d.status === 'accepted') {
            actions += `<button class="btn-action btn-action-send" onclick="dispatchDeliveryToDrivers('${d.id}')">إرسال للسائقين</button> `;
        }
        if (d.status !== 'completed' && d.status !== 'cancelled') {
            actions += `<button class="btn-action btn-action-toggle" onclick="setDeliveryStatus('${d.id}','cancelled')">إلغاء</button> `;
        }
        actions += `<button class="btn-action btn-action-delete" onclick="deleteDelivery('${d.id}')"><i class="bi bi-trash"></i></button>`;
        return `<tr>
            <td><strong>${d.customerName || '-'}</strong><br><small class="text-muted">${fmtNum(d.customerPhone || '')}</small></td>
            <td><strong>${fmtNum(d.receiverPhone || '-')}</strong></td>
            <td class="d-none d-md-table-cell">${d.senderDistrict || fmtNum(d.senderPhone || '-')}</td>
            <td class="d-none d-md-table-cell">${d.receiverDistrict || '-'}</td>
            <td><strong class="text-gold">${price} MRU</strong></td>
            <td><span class="badge bg-${deliveryStatusColors[d.status] || 'secondary'}">${deliveryStatusLabels[d.status] || d.status}</span></td>
            <td class="d-none d-lg-table-cell"><small>${created}</small></td>
            <td>${actions}</td>
        </tr>`;
    }).join('');
}

window.openDeliveryPriceModal = function (id, customer, receiver) {
    document.getElementById('deliveryPriceId').value = id;
    document.getElementById('deliveryPriceCustomer').textContent = customer;
    document.getElementById('deliveryPriceReceiver').textContent = receiver;
    document.getElementById('deliveryPriceValue').value = '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('deliveryPriceModal')).show();
};

document.getElementById('confirmDeliveryPriceBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('deliveryPriceId').value;
    const val = parseFloat(document.getElementById('deliveryPriceValue').value);
    if (!id || !val || val <= 0) { ARAalert('أدخل سعراً صحيحاً', 'warning'); return; }
    if (!requireDb()) return;
    try {
        await db.collection('delivery_requests').doc(id).update({ status: 'price_sent', pendingPrice: val });
        bootstrap.Modal.getInstance(document.getElementById('deliveryPriceModal'))?.hide();
        addNotifLog('delivery_price', `💰 أُرسل سعر التوصيلة: ${val} MRU`);
        ARAalert('تم إرسال السعر للزبون بنجاح', 'success');
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
});

window.setDeliveryStatus = async function (id, status) {
    if (!(await ARAconfirm('تحديث حالة التوصيلة إلى "' + (deliveryStatusLabels[status] || status) + '"؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('delivery_requests').doc(id).update({ status });
        if (status === 'accepted') addNotifLog('delivery_accepted', '✅ توصيل نشط (مقبول): ' + id);
        else if (status === 'completed') addNotifLog('delivery_completed', '🏁 اكتمل التوصيل: ' + id);
        else if (status === 'cancelled') addNotifLog('delivery_cancelled', '❌ أُلغيت التوصيلة: ' + id);
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.deleteDelivery = async function (id) {
    if (!(await ARAconfirm('حذف هذه التوصيلة نهائياً؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('delivery_requests').doc(id).delete();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

// إرسال توصيلة من لوحة التحكم إلى سائقي التوصيل كرحلة برقمي المرسل والمستلم
window.dispatchDeliveryToDrivers = async function (id) {
    const d = allDeliveries.find(x => x.id === id);
    if (!d) return;
    if (!(await ARAconfirm('إرسال هذه التوصيلة إلى سائقي التوصيل؟ سيتم تنبيه السائقين المتاحين.'))) return;
    if (!requireDb()) return;
    const price = d.pendingPrice != null ? d.pendingPrice : (d.fare != null ? d.fare : 0);
    if (!price || price <= 0) { ARAalert('أدخل سعراً أولاً عبر زر "إرسال السعر"', 'warning'); return; }
    if (!d.senderLat && !d.senderLng) { ARAalert('لا توجد إحداثيات لنقطة الانطلاق على هذه التوصيلة', 'warning'); return; }

    const lat = d.senderLat, lng = d.senderLng;
    let radius = 20;
    try {
        const cfg = await db.collection('settings').doc('app_config').get();
        if (cfg.exists) {
            radius = cfg.data().deliveryRadiusKm || cfg.data().searchRadiusKm || 20;
        }
    } catch (e) {}

    const rideData = {
        type: 'delivery',
        deliveryId: id,
        passengerName: d.customerName || 'طلب توصيل',
        passengerPhone: d.customerPhone || '',
        senderPhone: d.senderPhone || '',
        receiverPhone: d.receiverPhone || '',
        senderName: d.customerName || 'المرسل',
        receiverName: '',
        senderDistrict: d.senderDistrict || '',
        receiverDistrict: d.receiverDistrict || '',
        notes: d.notes || '',
        pickupLat: lat,
        pickupLng: lng,
        dropoffLat: lat,
        dropoffLng: lng,
        pickupAddress: d.pickupAddress || d.senderDistrict || 'نقطة الانطلاق',
        dropoffAddress: d.dropoffAddress || d.receiverDistrict || 'نقطة الوصول',
        realDistanceKm: 0,
        searchRadiusKm: radius,
        fare: price,
        commissionPercent,
        deliveryPhase: 'at_sender',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await db.collection('rides').add(rideData);
        const nearby = await findNearbyDrivers(lat, lng, radius);
        if (nearby.length === 0) {
            await db.collection('rides').doc(docRef.id).update({ status: 'no_drivers' });
            await db.collection('delivery_requests').doc(id).update({ status: 'accepted', rideId: docRef.id });
            addNotifLog('delivery_dispatch', 'لا يوجد سائقون متاحون: ' + id);
            ARAalert('لا يوجد سائقون متاحون في النطاق حالياً', 'warning');
        } else {
            const nearbyIds = nearby.map(x => x.id);
            const tokens = nearby.filter(x => x.fcmToken).map(x => x.fcmToken);
            await db.collection('rides').doc(docRef.id).update({
                notifiedDrivers: nearbyIds,
                notificationSentAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (tokens.length > 0) {
                sendFCMNotifications(tokens, docRef.id, 'طلب توصيل', price, lat, lng, d.pickupAddress || d.senderDistrict || '', d.dropoffAddress || d.receiverDistrict || '', radius, {
                    senderPhone: d.senderPhone || '',
                    receiverPhone: d.receiverPhone || '',
                    senderDistrict: d.senderDistrict || '',
                    receiverDistrict: d.receiverDistrict || '',
                    pickupAddress: d.pickupAddress || d.senderDistrict || '',
                    dropoffAddress: d.dropoffAddress || d.receiverDistrict || '',
                    notes: d.notes || '',
                    deliveryId: id,
                    deliveryPhase: 'at_sender'
                });
            }
            await db.collection('delivery_requests').doc(id).update({ status: 'accepted', rideId: docRef.id });
            addNotifLog('delivery_dispatch', `تم إرسال التوصيلة ${id} إلى ${nearby.length} سائق | ${price} MRU`);
            ARAalert(`تم الإرسال! ${nearby.length} سائق تم تنبيههم`, 'success');
        }
    } catch (err) {
        ARAalert('خطأ: ' + err.message, 'error');
    }
};

window.exportDeliveriesCSV = function () {
    const rows = [['الزبون', 'هاتف الزبون', 'المستلم', 'الانطلاق', 'الوجهة', 'السعر', 'الحالة']];
    allDeliveries.forEach(d => {
        rows.push([d.customerName || '', d.customerPhone || '', d.receiverPhone || '', d.senderDistrict || '', d.receiverDistrict || '', d.pendingPrice != null ? d.pendingPrice : (d.fare != null ? d.fare : ''), deliveryStatusLabels[d.status] || d.status]);
    });
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deliveries.csv';
    a.click();
};

document.getElementById('searchDeliveries')?.addEventListener('input', () => loadDeliveriesList());

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
        let cancelledComm = 0;
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
            } else if (r.status === 'cancelled' && (r.cancelledBy === 'driver' || r.cancelledBy === 'driver_cancel')) {
                if (r.commissionAmount) {
                    totalComm += r.commissionAmount;
                    cancelledComm += r.commissionAmount;
                }
            }
            if (r.status === 'accepted' || r.status === 'in_progress') activeCount++;
        });
        document.getElementById('statTotalRides').textContent = totalRidesCount;
        document.getElementById('statTotalComm').innerHTML = `${totalComm} <small>MRU</small>${cancelledComm > 0 ? `<br><small class="d-block" style="font-size:10px;color:#e53935;">منها ${cancelledComm} MRU من رحلات ألغاها السائق</small>` : ''}`;
        document.getElementById('statActiveRides').textContent = activeCount;

        const custSnap = await db.collection('customers').get();
        document.getElementById('statTotalCustomers').textContent = custSnap.size;
    } catch (e) {
        console.error('Stats load error:', e);
    }
}

// ============================================
// EXPORT CSV
// ============================================
window.exportDriversCSV = function () {
    if (allDrivers.length === 0) { ARAalert('لا يوجد سائقون للتصدير', 'info'); return; }
    let csv = '\uFEFF' + 'الاسم,الهاتف,الرصيد,الحالة,المجموعات\n';
    allDrivers.forEach(d => {
        const status = d.disabled ? 'معطّل' : (d.isOnline ? 'متاح' : 'غير متاح');
        csv += `${d.name||''},${d.phone||''},${d.credit||0},${status},${d.totalRides||0}\n`;
    });
    downloadCSV(csv, 'ARAVA_drivers.csv');
};

window.exportRidesCSV = function () {
    if (allRides.length === 0) { ARAalert('لا توجد رحلات للتصدير', 'info'); return; }
    let csv = '\uFEFF' + 'الزبون,هاتف الزبون,نقطة الانطلاق,الوجهة,المسافة,السعر,العمولة,اسم السائق,هاتف السائق,الحالة,التاريخ\n';
    allRides.forEach(r => {
        const created = r.createdAt?.toDate ? fmtDate(r.createdAt.toDate()) : '';
        const fare = r.fare || 0;
        const comm = r.commissionAmount || Math.round(fare * commissionPercent / 100);
        const driver = r.assignedDriverId ? (driversInfoCache[r.assignedDriverId] || null) : null;
        const driverName = driver ? driver.name : '';
        const driverPhone = driver ? driver.phone : '';
        csv += `${r.passengerName||''},${r.passengerPhone||''},${r.pickupAddress||''},${r.dropoffAddress||''},${r.realDistanceKm||''},${fare},${comm},${driverName},${driverPhone},${r.status||''},${created}\n`;
    });
    downloadCSV(csv, 'ARAVA_rides.csv');
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
async function sendFCMNotifications(tokens, rideId, passengerName, fare, lat, lng, pickup, dropoff, radius, extra) {
    console.log(`FCM: ${tokens.length} tokens, ride ${rideId}`);
    if (tokens.length === 0) {
        addNotifLog('system', `FCM: لا توجد رموز إشعارات للسائقين`);
        return;
    }
    const data = Object.assign({
        type: 'ride_request',
        rideId,
        passengerName,
        passengerPhone: '',
        pickupLat: String(lat || ''),
        pickupLng: String(lng || ''),
        pickupAddress: pickup || '',
        dropoffLat: String(lat || ''),
        dropoffLng: String(lng || ''),
        dropoffAddress: dropoff || '',
        distanceKm: String(radius || 0),
        fare: String(fare || 0),
        estimatedFare: String(fare || 0)
    }, extra || {});
    try {
        const res = await fetch('/api/send-fcm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokens,
                title: 'طلب رحلة جديد!',
                body: `سعر: ${fare || 0} MRU`,
                data
            })
        });
        const json = await res.json();
        if (json.success) {
            addNotifLog('system', `FCM: تم إرسال إشعار ${json.successCount} سائق بنجاح`);
        } else {
            addNotifLog('system', `FCM: فشل الإرسال (${json.error || 'unknown'})`);
        }
    } catch (e) {
        addNotifLog('system', `FCM: تعذر الوصول للخادم — الطلب سيصل للسائقين المفتوحين فقط (${e.message})`);
    }
}

// ============================================
// NOTIFICATION LOG
// ============================================
let notifLog = [];

function addNotifLog(type, message) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
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
        'delivery_dispatch': { cls: 'log-badge-warning', label: 'توصيل' },
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

window.confirmResetAllData = async function () {
    if (sessionStorage.getItem('ARAVA_admin_role') !== 'admin') {
        ARAalert('هذا الإجراء متاح فقط لصلاحية مدير عام', 'warning');
        return;
    }
    if (!(await ARAconfirm('⚠️ تحذير! سيتم حذف جميع الرحلات والسائقين والزبائن والرسائل بشكل نهائي. هل أنت متأكد؟'))) return;
    if (!(await ARAconfirm('❌ تأكيد نهائي: لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟'))) return;
    const status = document.getElementById('resetStatus');
    status.innerHTML = '<span class="text-danger"><i class="bi bi-hourglass-split me-1"></i>جاري مسح البيانات...</span>';
    requireDb('resetStatus');
    const collections = ['rides', 'customers', 'drivers', 'messages'];
    let completed = 0;
    collections.forEach(async (col) => {
        try {
            const snapshot = await db.collection(col).get();
            const ids = snapshot.docs.map(d => d.id);
            for (let i = 0; i < ids.length; i += 500) {
                const batch = db.batch();
                const chunk = ids.slice(i, i + 500);
                chunk.forEach(id => batch.delete(db.collection(col).doc(id)));
                await batch.commit();
            }
            completed++;
            if (completed === collections.length) {
                status.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>تم مسح جميع البيانات بنجاح!</span>';
                setTimeout(() => location.reload(), 2000);
            }
        } catch (e) {
            status.innerHTML = `<span class="text-danger">خطأ في ${col}: ${e.message}</span>`;
        }
    });
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
        if (file.size > 500000) { ARAalert('الصورة كبيرة جداً. الحد الأقصى 500KB', 'warning'); e.target.value = ''; return; }
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
        if (file.size > 500000) { ARAalert('الملف الصوتي كبير جداً. الحد الأقصى 500KB', 'warning'); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('msgAudioPreview').innerHTML =
                `<audio controls src="${ev.target.result}" style="width:100%;"></audio>`;
        };
        reader.readAsDataURL(file);
    });
}
initMsgTypeSwitch();

let msgSelectAllChecked = false;

function syncMsgSelectAllCheckbox() {
    const sel = document.getElementById('msgRecipients');
    const cb = document.getElementById('msgSelectAll');
    if (!sel || !cb) return;
    const all = sel.options.length > 0 && Array.from(sel.options).every(o => o.selected);
    cb.checked = all;
    msgSelectAllChecked = all;
}

document.getElementById('msgSelectAll')?.addEventListener('change', (e) => {
    msgSelectAllChecked = e.target.checked;
    const sel = document.getElementById('msgRecipients');
    Array.from(sel.options).forEach(o => { o.selected = msgSelectAllChecked; });
});

document.getElementById('msgRecipients')?.addEventListener('change', () => {
    syncMsgSelectAllCheckbox();
});

async function loadMsgRecipients() {
    if (!requireDb()) return;
    const sel = document.getElementById('msgRecipients');
    if (!sel) return;
    const typeSel = document.getElementById('msgRecipientType');
    const type = typeSel ? typeSel.value : 'drivers';
    sel.innerHTML = '';
    if (type === 'customers') {
        sel.innerHTML = '<option value="all">جميع الزبائن</option>';
        try {
            const snap = await db.collection('customers').get();
            snap.forEach(doc => {
                const c = doc.data();
                sel.innerHTML += `<option value="${c.phone || doc.id}">${c.name || 'زبون'} (${fmtNum(c.phone || '')})</option>`;
            });
        } catch (e) { console.log('Customers recipients load error'); }
    } else {
        sel.innerHTML = '<option value="all">جميع السائقين</option>';
        try {
            const snap = await db.collection('drivers').get();
            snap.forEach(doc => {
                const d = doc.data();
                sel.innerHTML += `<option value="${doc.id}">${d.name || 'سائق'} (${fmtNum(d.phone || '')})</option>`;
            });
        } catch (e) { console.log('Recipients load error'); }
    }
    if (msgSelectAllChecked) {
        Array.from(sel.options).forEach(o => { o.selected = true; });
    }
}

document.getElementById('msgRecipientType')?.addEventListener('change', loadMsgRecipients);

document.getElementById('sendMsgBtn')?.addEventListener('click', async () => {
    if (!requireDb('msgSendStatus')) return;
    const type = document.getElementById('msgType').value;
    const recipientsSel = document.getElementById('msgRecipients');
    const recipientIds = Array.from(recipientsSel.selectedOptions).map(o => o.value);
    const typeSel = document.getElementById('msgRecipientType');
    const recipientKind = typeSel ? typeSel.value : 'drivers';
    const senderName = sessionStorage.getItem('ARAVA_admin_name') || 'المدير';
    const msg = { type, sentBy: senderName, readBy: [], timestamp: firebase.firestore.FieldValue.serverTimestamp(), recipientKind };

    if (recipientIds.includes('all') || msgSelectAllChecked) {
        if (recipientKind === 'customers') {
            const snap = await db.collection('customers').get();
            msg.recipients = snap.docs.map(d => (d.data().phone || d.id));
            msg.recipientLabel = 'جميع الزبائن';
        } else {
            const snap = await db.collection('drivers').get();
            msg.recipients = snap.docs.map(d => d.id);
            msg.recipientLabel = 'جميع السائقين';
        }
    } else {
        msg.recipients = recipientIds;
        msg.recipientLabel = recipientKind === 'customers' ? `${recipientIds.length} زبون` : `${recipientIds.length} سائق`;
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
        showStatus('msgSendStatus', 'جاري ضغط الصورة وإرسالها...', '');
        const b64 = await fileToBase64(fileInput.files[0]);
        if (!b64) { showStatus('msgSendStatus', 'فشل قراءة الصورة', 'error'); return; }
        msg.content = b64;
        await sendMsgToFirestore(msg);
        return;
    } else if (type === 'audio') {
        const fileInput = document.getElementById('msgAudioFile');
        if (!fileInput.files[0]) { showStatus('msgSendStatus', 'اختر ملف صوتي', 'error'); return; }
        if (fileInput.files[0].size > 600 * 1024) {
            showStatus('msgSendStatus', 'الملف الصوتي كبير جداً (الحد 600KB) - مستندات Firestore محدودة بحجم 1MB', 'error');
            return;
        }
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
        if (typeof msg.content === 'string' && msg.content.length > 900 * 1024) {
            showStatus('msgSendStatus', 'الرسالة كبيرة جداً (أكثر من 900KB) - اختر صورة/مقطع أصغر أو قلّل عدد الصور', 'error');
            return;
        }
        if (msg.recipientKind === 'customers') {
            const custMsg = { type: msg.type, content: msg.content, recipients: msg.recipients, sentBy: msg.sentBy, readBy: [], timestamp: firebase.firestore.FieldValue.serverTimestamp() };
            await db.collection('customer_messages').add(custMsg);
            showStatus('msgSendStatus', `تم إرسال الرسالة لـ ${msg.recipientLabel} بنجاح!`, 'success');
            document.getElementById('msgText').value = '';
            document.getElementById('msgImageFile').value = '';
            document.getElementById('msgAudioFile').value = '';
            document.getElementById('msgImagePreview').innerHTML = '';
            document.getElementById('msgAudioPreview').innerHTML = '';
            loadSentCustomerMessages();
        } else {
            await db.collection('messages').add(msg);
            showStatus('msgSendStatus', `تم إرسال الرسالة لـ ${msg.recipientLabel} بنجاح!`, 'success');
            document.getElementById('msgText').value = '';
            document.getElementById('msgImageFile').value = '';
            document.getElementById('msgAudioFile').value = '';
            document.getElementById('msgImagePreview').innerHTML = '';
            document.getElementById('msgAudioPreview').innerHTML = '';
            loadSentMessages();
        }
    } catch (err) {
        showStatus('msgSendStatus', 'خطأ: ' + err.message, 'error');
    }
}

async function loadSentMessages() {
    if (!requireDb()) return;
    const container = document.getElementById('msgListContainer');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><div class="ARAVA-spinner"></div></div>';

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
            const time = m.timestamp?.toDate ? fmtDate(m.timestamp.toDate()) : '';
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

async function loadSentCustomerMessages() {
    if (!requireDb()) return;
    const container = document.getElementById('msgListContainerCustomers');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><div class="ARAVA-spinner"></div></div>';

    try {
        const snap = await db.collection('customer_messages').orderBy('timestamp', 'desc').limit(50).get();
        document.getElementById('msgCountCustomers').textContent = snap.size;

        if (snap.empty) {
            container.innerHTML = '<div class="text-center text-muted py-4 small">لا توجد رسائل للزبائن بعد</div>';
            return;
        }

        const typeIcons = { text: 'bi-chat-left-text-fill', image: 'bi-image-fill', audio: 'bi-mic-fill' };
        const typeLabels = { text: 'نص', image: 'صورة', audio: 'صوت' };

        container.innerHTML = snap.docs.map(doc => {
            const m = doc.data();
            const time = m.timestamp?.toDate ? fmtDate(m.timestamp.toDate()) : '';
            const readCount = (m.readBy || []).length;
            const totalCount = (m.recipients || []).length;
            const allRead = totalCount > 0 && readCount >= totalCount;

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
                    <span class="badge bg-warning text-dark"><i class="bi ${typeIcons[m.type] || 'bi-envelope'}"></i> ${typeLabels[m.type] || m.type}</span>
                    <small class="text-muted">${time}</small>
                </div>
                <div class="mb-1">${contentPreview}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted"><i class="bi bi-people"></i> ${totalCount} زبون | <i class="bi bi-eye"></i> ${readCount}/${totalCount} قراءة</small>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteSentCustomerMsg('${doc.id}')"><i class="bi bi-trash"></i></button>
                </div>
                ${allRead ? '<div class="mt-1"><span class="badge bg-success">تمت القراءة من الجميع</span></div>' : ''}
            </div>`;
        }).join('');
    } catch (err) {
        container.innerHTML = '<div class="text-center text-danger py-4">خطأ في تحميل الرسائل</div>';
    }
}

window.deleteSentCustomerMsg = async function (id) {
    if (!(await ARAconfirm('هل تريد حذف هذه الرسالة؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('customer_messages').doc(id).delete();
        loadSentCustomerMessages();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.deleteSentMsg = async function(id) {
    if (!(await ARAconfirm('هل تريد حذف هذه الرسالة؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('messages').doc(id).delete();
        loadSentMessages();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.clearOldMessages = async function() {
    if (!(await ARAconfirm('حذف جميع الرسائل القديمة؟'))) return;
    if (!requireDb()) return;
    try {
        const snap = await db.collection('messages').get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        loadSentMessages();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

// ============================================
// ANNOUNCEMENTS (BROADCAST TO ALL DRIVERS)
// ============================================
window.sendAnnouncement = async function () {
    if (!requireDb('annSendStatus')) return;
    const title = document.getElementById('annTitle').value.trim();
    const content = document.getElementById('annContent').value.trim();
    if (!title && !content) { showStatus('annSendStatus', 'اكتب عنوان الإعلان أو نصه', 'error'); return; }
    if (!content) { showStatus('annSendStatus', 'اكتب نص الإعلان', 'error'); return; }

    const senderName = sessionStorage.getItem('ARAVA_admin_name') || 'المدير';
    try {
        await db.collection('announcements').add({
            title: title || 'إعلان من الإدارة',
            content: content,
            sentBy: senderName,
            readBy: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showStatus('annSendStatus', 'تم إرسال الإعلان لجميع السائقين بنجاح!', 'success');
        document.getElementById('annTitle').value = '';
        document.getElementById('annContent').value = '';
        loadAnnouncements();
    } catch (err) {
        showStatus('annSendStatus', 'خطأ: ' + err.message, 'error');
    }
};

async function loadAnnouncements() {
    if (!requireDb()) return;
    const container = document.getElementById('annListContainer');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><div class="ARAVA-spinner"></div></div>';

    try {
        const snap = await db.collection('announcements').orderBy('timestamp', 'desc').limit(50).get();
        document.getElementById('annCount').textContent = snap.size;

        if (snap.empty) {
            container.innerHTML = '<div class="text-center text-muted py-4 small">لا توجد إعلانات بعد</div>';
            return;
        }

        container.innerHTML = snap.docs.map(doc => {
            const a = doc.data();
            const time = a.timestamp?.toDate ? new Date(a.timestamp.toDate()).toLocaleString('ar-MA') : '';
            const readCount = (a.readBy || []).length;
            const totalDrivers = 0;
            return `<div class="log-entry p-3 border-bottom">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <span class="badge bg-warning text-dark"><i class="bi bi-bullhorn-fill me-1"></i>${a.title || 'إعلان'}</span>
                    <small class="text-muted">${time}</small>
                </div>
                <div class="mb-1">${a.content || ''}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted"><i class="bi bi-person"></i> ${a.sentBy || 'المدير'} | <i class="bi bi-eye"></i> ${readCount} قراءة</small>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement('${doc.id}')"><i class="bi bi-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        container.innerHTML = '<div class="text-center text-danger py-4">خطأ في تحميل الإعلانات</div>';
    }
}

window.deleteAnnouncement = async function (id) {
    if (!(await ARAconfirm('هل تريد حذف هذا الإعلان؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('announcements').doc(id).delete();
        loadAnnouncements();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.clearOldAnnouncements = async function () {
    if (!(await ARAconfirm('حذف جميع الإعلانات القديمة؟'))) return;
    if (!requireDb()) return;
    try {
        const snap = await db.collection('announcements').get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        loadAnnouncements();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

// ============================================
// ADMINS MANAGEMENT
// ============================================
async function loadAdminsList() {
    if (!requireDb()) return;
    const tbody = document.getElementById('adminsTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري تحميل المشرفين...</div></td></tr>';
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
        tbody.innerHTML = admins.map(a => {
            const safeName = (a.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<tr>
            <td><strong>${a.name || '-'}</strong></td>
            <td>${a.username || '-'}</td>
            <td><span class="badge ${roleBadge[a.role] || 'bg-secondary'}">${roleLabels[a.role] || a.role}</span></td>
            <td>
                <div class="d-flex gap-1 flex-wrap">
                    <button class="btn-action btn-action-edit" onclick="openEditAdminModal('${a.id}','${safeName}','${a.username||''}','${a.role||'supervisor'}')">تعديل</button>
                    <button class="btn-action btn-action-delete" onclick="deleteAdmin('${a.id}','${safeName}')">حذف</button>
                </div>
            </td>
        </tr>`;
        }).join('');
    } catch (err) {
        console.error('Load admins error:', err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">خطأ في تحميل البيانات</td></tr>';
    }
}

let editingAdminData = null;

window.openEditAdminModal = function (id, name, username, role) {
    editingAdminData = null;
    document.getElementById('editAdminId').value = id;
    document.getElementById('editAdminUsername').value = username || '';
    document.getElementById('editAdminName').value = name || '';
    document.getElementById('editAdminRole').value = role || 'supervisor';
    document.getElementById('editAdminPassword').value = '';
    document.getElementById('editAdminStatus').textContent = '';
    editAdminModal.show();
    db.collection('admins').doc(id).get().then(snap => {
        if (snap.exists) editingAdminData = { id: snap.id, ...snap.data() };
    }).catch(() => {});
};

document.getElementById('saveEditAdminBtn').addEventListener('click', async () => {
    if (!requireDb('editAdminStatus')) return;
    const id = document.getElementById('editAdminId').value;
    const name = document.getElementById('editAdminName').value.trim();
    const role = document.getElementById('editAdminRole').value;
    const newPass = document.getElementById('editAdminPassword').value;
    const statusEl = document.getElementById('editAdminStatus');
    if (!name) { statusEl.textContent = 'أدخل الاسم الكامل'; statusEl.className = 'fw-semibold text-danger'; return; }
    if (newPass && newPass.length < 6) { statusEl.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'; statusEl.className = 'fw-semibold text-danger'; return; }

    try {
        const target = editingAdminData || (await db.collection('admins').doc(id).get()).data();

        if (target.role === 'admin' && role !== 'admin') {
            const snapshot = await db.collection('admins').get();
            const admins = [];
            snapshot.forEach(doc => admins.push({ id: doc.id, ...doc.data() }));
            const otherAdmins = admins.filter(a => a.id !== id && a.role === 'admin');
            if (otherAdmins.length === 0) {
                statusEl.textContent = 'لا يمكن تغيير دور آخر مشرف بصلاحية مدير عام. يجب أن يبقى مشرف واحد على الأقل.';
                statusEl.className = 'fw-semibold text-danger';
                return;
            }
        }

        await db.collection('admins').doc(id).update({ name, role });
        let passwordMsg = '';
        if (newPass) {
            if (target.authUid) {
                const currentUser = firebase.auth().currentUser;
                if (currentUser && currentUser.uid === target.authUid) {
                    try {
                        await currentUser.updatePassword(newPass);
                        await db.collection('admins').doc(id).update({ password: newPass });
                        passwordMsg = ' وتحديث كلمة المرور';
                    } catch (e) {
                        passwordMsg = ' (فشل تحديث كلمة مرور المصادقة)';
                    }
                } else {
                    passwordMsg = ' (كلمة المرور لم تتغير: مرتبطة بحساب بريد إلكتروني، غيّرها من حسابه الخاص)';
                }
            } else {
                await db.collection('admins').doc(id).update({ password: newPass });
                passwordMsg = ' وتحديث كلمة المرور';
            }
        }
        statusEl.className = 'fw-semibold text-success';
        statusEl.textContent = `تم حفظ تعديلات المشرف بنجاح${passwordMsg}`;
        setTimeout(() => { editAdminModal.hide(); }, 900);
        loadAdminsList();
    } catch (err) {
        statusEl.className = 'fw-semibold text-danger';
        statusEl.textContent = 'خطأ: ' + err.message;
    }
});

window.addAdmin = async function () {
    if (!requireDb('addAdminStatus')) return;
    const username = document.getElementById('newAdminUsername').value.trim();
    const name = document.getElementById('newAdminName').value.trim();
    const password = document.getElementById('newAdminPassword').value.trim();
    const role = document.getElementById('newAdminRole').value;

    if (!username) { showStatus('addAdminStatus', 'أدخل اسم المستخدم', 'error'); return; }
    if (!name) { showStatus('addAdminStatus', 'أدخل الاسم الكامل', 'error'); return; }
    if (!password) { showStatus('addAdminStatus', 'أدخل كلمة المرور', 'error'); return; }
    if (password.length < 6) { showStatus('addAdminStatus', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return; }

    try {
        const existing = await db.collection('admins').where('username', '==', username).get();
        if (!existing.empty) {
            showStatus('addAdminStatus', 'اسم المستخدم مستخدم بالفعل', 'error');
            return;
        }

        // Create Firebase Auth account
        let authUid = '';
        try {
            const email = `${username}@khalily.app`;
            const userCred = await firebase.auth().createUserWithEmailAndPassword(email, password);
            authUid = userCred.user.uid;
        } catch (authErr) {
            showStatus('addAdminStatus', 'فشل إنشاء حساب المصادقة: ' + authErr.message, 'error');
            return;
        }

        await db.collection('admins').add({
            username, name, password, role,
            authUid: authUid,
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
    if (!(await ARAconfirm(`هل أنت متأكد من حذف المشرف "${name}"؟`))) return;
    if (!requireDb()) return;

    // Prevent deleting the last admin
    try {
        const snapshot = await db.collection('admins').get();
        const admins = [];
        snapshot.forEach(doc => admins.push({ id: doc.id, ...doc.data() }));

        const targetDoc = admins.find(a => a.id === id);
        if (targetDoc && targetDoc.role === 'admin') {
            const otherAdmins = admins.filter(a => a.id !== id && a.role === 'admin');
            if (otherAdmins.length === 0) {
                ARAalert('لا يمكن حذف آخر مشرف بصلاحية مدير عام. يجب أن يبقى مشرف واحد على الأقل بصلاحية كاملة.', 'warning');
                return;
            }
        }
    } catch (err) {
        console.error('Error checking admins before delete:', err);
    }

    try {
        await db.collection('admins').doc(id).delete();
        loadAdminsList();
    } catch (err) {
        ARAalert('خطأ: ' + err.message, 'error');
    }
};

// ============================================
// ROLE-BASED VISIBILITY
// ============================================
function applyRoleVisibility() {
    const role = sessionStorage.getItem('ARAVA_admin_role') || 'admin';
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = role === 'admin' ? '' : 'none';
    });
}

// ============================================
// PROMOTIONS MANAGEMENT
// ============================================
let promoImageFiles = [];

document.getElementById('promoImages')?.addEventListener('change', function(e) {
    promoImageFiles = Array.from(e.target.files);
    const preview = document.getElementById('promoImagesPreview');
    preview.innerHTML = promoImageFiles.map((f, i) =>
        `<div class="position-relative" style="width:100px;height:100px;">
            <img src="${URL.createObjectURL(f)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">
            <button class="btn btn-sm btn-danger position-absolute top-0 end-0" style="padding:0 4px;font-size:10px;" onclick="removePromoImage(${i})">&times;</button>
        </div>`
    ).join('');
});

window.removePromoImage = function(idx) {
    promoImageFiles.splice(idx, 1);
    const dt = new DataTransfer();
    promoImageFiles.forEach(f => dt.items.add(f));
    document.getElementById('promoImages').files = dt.files;
    const preview = document.getElementById('promoImagesPreview');
    preview.innerHTML = promoImageFiles.map((f, i) =>
        `<div class="position-relative" style="width:100px;height:100px;">
            <img src="${URL.createObjectURL(f)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">
            <button class="btn btn-sm btn-danger position-absolute top-0 end-0" style="padding:0 4px;font-size:10px;" onclick="removePromoImage(${i})">&times;</button>
        </div>`
    ).join('');
};

window.addPromotion = async function() {
    if (!requireDb('addPromoStatus')) return;
    const title = document.getElementById('promoTitle').value.trim();
    const type = document.getElementById('promoType').value;
    const description = document.getElementById('promoDescription').value.trim();
    const videoUrl = document.getElementById('promoVideo').value.trim();

    if (!title) { showStatus('addPromoStatus', 'أدخل عنوان العرض', 'error'); return; }

    const btn = document.getElementById('btnAddPromotion');
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>جاري الحفظ...';

    try {
        const images = [];
        const urlText = document.getElementById('promoImageUrls')?.value.trim();
        if (urlText) {
            urlText.split('\n').map(u => u.trim()).filter(u => u).forEach(u => images.push(u));
        }
        if (promoImageFiles.length > 0) {
            showStatus('addPromoStatus', 'جاري معالجة ' + promoImageFiles.length + ' صور...', '');
            try {
                const base64Images = await filesToBase64(promoImageFiles, 10);
                base64Images.forEach(function (u) { images.push(u); });
                if (base64Images.length > 0) {
                    showToast('تم رفع ' + base64Images.length + ' صورة', 'success');
                } else {
                    showToast('لم يتم تحويل أي صورة', 'warning');
                }
            } catch (convErr) {
                console.warn('Image conversion failed:', convErr.message);
                showToast('فشل معالجة الصور، جرب صوراً أصغر', 'warning');
            }
        }

        if (promoImageFiles.length > 0 && images.length === 0) {
            showStatus('addPromoStatus', 'فشل رفع الصور. جرب صوراً أصغر أو استخدم رابط مباشر.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة العرض';
            return;
        }

        var promoSize = images.reduce(function (s, u) { return s + (u ? u.length : 0); }, 0);
        if (promoSize > 850 * 1024) {
            showStatus('addPromoStatus', 'الصور كبيرة جداً (' + Math.round(promoSize / 1024) + 'KB) - مستند Firestore محدود بـ 1MB. اختر صوراً أصغر.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة العرض';
            return;
        }

        await db.collection('promotions').add({
            title, type, description, videoUrl, images,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showStatus('addPromoStatus', 'تم إضافة العرض بنجاح!', 'success');
        document.getElementById('promoTitle').value = '';
        document.getElementById('promoDescription').value = '';
        document.getElementById('promoVideo').value = '';
        document.getElementById('promoImages').value = '';
        document.getElementById('promoImagesPreview').innerHTML = '';
        if (document.getElementById('promoImageUrls')) document.getElementById('promoImageUrls').value = '';
        promoImageFiles = [];
        loadPromotionsList();
    } catch (err) {
        showStatus('addPromoStatus', 'خطأ: ' + err.message, 'error');
    }
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة العرض';
};

async function loadPromotionsList() {
    if (!requireDb()) return;
    const list = document.getElementById('promotionsList');
    list.innerHTML = '<div class="col-12 text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري التحميل...</div></div>';
    try {
        const snap = await db.collection('promotions').orderBy('createdAt', 'desc').get();
        document.getElementById('promoCount').textContent = snap.size;
        if (snap.empty) {
            list.innerHTML = '<div class="col-12 text-center text-muted py-4">لا توجد عروض</div>';
            return;
        }
        const typeLabels = { promotion: 'عرض', activity: 'نشاط', offer: 'تخفيض' };
        const typeColors = { promotion: 'bg-primary', activity: 'bg-success', offer: 'bg-danger' };
        list.innerHTML = snap.docs.map(doc => {
            const p = doc.data();
            const time = p.createdAt?.toDate ? fmtDate(p.createdAt.toDate()) : '';
            const imgHtml = p.images && p.images.length > 0
                ? `<div class="d-flex gap-2 mb-2 flex-wrap">${p.images.map(u => `<img src="${u}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;" onerror="this.src='data:image/svg+xml,%253Csvg%2520xmlns%253D%2522http://www.w3.org/2000/svg%2522%2520width%253D%252280%2522%2520height%253D%252280%2522%253E%253Crect%2520fill%253D%2522%2523f0f0f0%2522%2520width%253D%252280%2522%2520height%253D%252280%2522%252F%253E%253Ctext%2520x%253D%252250%2525%2522%2520y%253D%252250%2525%2522%2520text-anchor%253D%2522middle%2522%2520fill%253D%2522%2523999%2522%2520font-size%253D%252230%2522%253E%25E2%259D%258C%253C%252Ftext%253E%253C%252Fsvg%253E'">`).join('')}</div>`
                : '';
            const videoHtml = p.videoUrl ? `<a href="${p.videoUrl}" target="_blank" class="btn btn-sm btn-outline-danger"><i class="bi bi-play-circle"></i> فيديو</a>` : '';
            return `<div class="col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h6 class="fw-bold mb-1">${p.title}</h6>
                            <div class="d-flex gap-1 align-items-center">
                                <span class="badge ${typeColors[p.type] || 'bg-secondary'}">${typeLabels[p.type] || p.type}</span>
                                <span class="badge bg-info">${p.images ? p.images.length : 0} صور</span>
                            </div>
                        </div>
                        ${imgHtml}
                        <p class="small text-muted mb-1">${p.description || ''}</p>
                        <div class="d-flex gap-2 align-items-center">
                            ${videoHtml}
                            <button class="btn btn-sm btn-outline-danger" onclick="deletePromotion('${doc.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                        <small class="text-muted">${time}</small>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = '<div class="col-12 text-center text-danger py-4">خطأ في التحميل</div>';
    }
}

window.deletePromotion = async function(id) {
    if (!(await ARAconfirm('حذف هذا العرض؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('promotions').doc(id).delete();
        loadPromotionsList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

// ============================================
// PRODUCTS MANAGEMENT
// ============================================
let prodImageFiles = [];

document.getElementById('prodImages')?.addEventListener('change', function(e) {
    prodImageFiles = Array.from(e.target.files);
    const preview = document.getElementById('prodImagesPreview');
    preview.innerHTML = prodImageFiles.map((f, i) =>
        `<div class="position-relative" style="width:100px;height:100px;">
            <img src="${URL.createObjectURL(f)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">
            <button class="btn btn-sm btn-danger position-absolute top-0 end-0" style="padding:0 4px;font-size:10px;" onclick="removeProdImage(${i})">&times;</button>
        </div>`
    ).join('');
});

window.removeProdImage = function(idx) {
    prodImageFiles.splice(idx, 1);
    const dt = new DataTransfer();
    prodImageFiles.forEach(f => dt.items.add(f));
    document.getElementById('prodImages').files = dt.files;
    const preview = document.getElementById('prodImagesPreview');
    preview.innerHTML = prodImageFiles.map((f, i) =>
        `<div class="position-relative" style="width:100px;height:100px;">
            <img src="${URL.createObjectURL(f)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">
            <button class="btn btn-sm btn-danger position-absolute top-0 end-0" style="padding:0 4px;font-size:10px;" onclick="removeProdImage(${i})">&times;</button>
        </div>`
    ).join('');
};

window.addProduct = async function() {
    if (!requireDb('addProductStatus')) return;
    const name = document.getElementById('prodName').value.trim();
    const type = document.getElementById('prodType').value;
    const price = parseFloat(document.getElementById('prodPrice').value) || 0;
    const phone = document.getElementById('prodPhone').value.trim();
    const description = document.getElementById('prodDescription').value.trim();
    const videoUrl = document.getElementById('prodVideo').value.trim();

    if (!name) { showStatus('addProductStatus', 'أدخل اسم المنتج', 'error'); return; }
    if (!phone) { showStatus('addProductStatus', 'أدخل رقم هاتف البائع', 'error'); return; }

    const btn = document.getElementById('btnAddProduct');
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>جاري الحفظ...';

    try {
        const images = [];
        const urlText = document.getElementById('prodImageUrls')?.value.trim();
        if (urlText) {
            urlText.split('\n').map(u => u.trim()).filter(u => u).forEach(u => images.push(u));
        }
        if (prodImageFiles.length > 0) {
            try {
                const base64Images = await filesToBase64(prodImageFiles, 10);
                base64Images.forEach(function (u) { images.push(u); });
                if (base64Images.length > 0) {
                    showToast('تم رفع ' + base64Images.length + ' صورة', 'success');
                } else {
                    showToast('لم يتم تحويل أي صورة', 'warning');
                }
            } catch (convErr) {
                console.warn('Image conversion failed:', convErr.message);
                showToast('فشل معالجة بعض الصور، جرب صوراً أصغر', 'warning');
            }
        }

        if (prodImageFiles.length > 0 && images.length === 0) {
            showStatus('addProductStatus', 'فشل رفع الصور. جرب صوراً أصغر أو استخدم رابط مباشر.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة المنتج';
            return;
        }

        var prodSize = images.reduce(function (s, u) { return s + (u ? u.length : 0); }, 0);
        if (prodSize > 850 * 1024) {
            showStatus('addProductStatus', 'الصور كبيرة جداً (' + Math.round(prodSize / 1024) + 'KB) - مستند Firestore محدود بـ 1MB. اختر صوراً أصغر.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة المنتج';
            return;
        }

        await db.collection('products').add({
            name, type, price, phone, description, videoUrl, images,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const alsoCustomer = document.getElementById('prodAlsoCustomer')?.checked;
        if (alsoCustomer) {
            await db.collection('customer_products').add({
                name, type, price, phone, description, videoUrl, images,
                active: true,
                ownerPhone: phone,
                views: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('تمت الإضافة أيضاً إلى متجر الزبائن', 'success');
        }

        showStatus('addProductStatus', 'تم إضافة المنتج بنجاح!', 'success');
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodPhone').value = '';
        document.getElementById('prodDescription').value = '';
        document.getElementById('prodVideo').value = '';
        document.getElementById('prodImages').value = '';
        document.getElementById('prodImagesPreview').innerHTML = '';
        if (document.getElementById('prodImageUrls')) document.getElementById('prodImageUrls').value = '';
        prodImageFiles = [];
        loadProductsList();
    } catch (err) {
        showStatus('addProductStatus', 'خطأ: ' + err.message, 'error');
    }
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة المنتج';
};

async function loadProductsList() {
    if (!requireDb()) return;
    const list = document.getElementById('productsList');
    list.innerHTML = '<div class="col-12 text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري التحميل...</div></div>';
    try {
        const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
        document.getElementById('productCount').textContent = snap.size;
        if (snap.empty) {
            list.innerHTML = '<div class="col-12 text-center text-muted py-4">لا توجد منتجات</div>';
            return;
        }
        const typeLabels = { car: 'سيارة', motorcycle: 'دراجة نارية', other: 'أخرى' };
        const typeIcons = { car: 'bi-car-front-fill', motorcycle: 'bi-bicycle', other: 'bi-box-seam' };
        list.innerHTML = snap.docs.map(doc => {
            const p = doc.data();
            const time = p.createdAt?.toDate ? fmtDate(p.createdAt.toDate()) : '';
            const imgHtml = p.images && p.images.length > 0
                ? `<img src="${p.images[0]}" style="width:100%;height:160px;object-fit:cover;border-radius:10px;" class="mb-2" onerror="this.src='data:image/svg+xml,%253Csvg%2520xmlns%253D%2522http://www.w3.org/2000/svg%2522%2520width%253D%2522200%2522%2520height%253D%2522200%2522%253E%253Crect%2520fill%253D%2522%2523f0f0f0%2522%2520width%253D%2522200%2522%2520height%253D%2522200%2522%252F%253E%253Ctext%2520x%253D%252250%2525%2522%2520y%253D%252250%2525%2522%2520text-anchor%253D%2522middle%2522%2520fill%253D%2522%2523999%2522%2520font-size%253D%252240%2522%253E%25F0%259F%2596%25BC%253C%252Ftext%253E%253C%252Fsvg%253E'">`
                : `<div class="mb-2" style="width:100%;height:160px;background:#f0f0f0;border-radius:10px;display:flex;align-items:center;justify-content:center;"><i class="${typeIcons[p.type] || 'bi-box'} fs-1 text-muted"></i></div>`;
            const moreImages = p.images && p.images.length > 1
                ? `<div class="d-flex gap-1 mb-2">${p.images.slice(1, 5).map(u => `<img src="${u}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'">`).join('')}</div>`
                : '';
            const videoHtml = p.videoUrl ? `<a href="${p.videoUrl}" target="_blank" class="btn btn-sm btn-outline-danger"><i class="bi bi-play-circle"></i> فيديو</a>` : '';
            return `<div class="col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body">
                        <div class="d-flex gap-1 align-items-center mb-1">
                            <span class="badge ${p.type === 'car' ? 'bg-warning text-dark' : 'bg-info'}"><i class="${typeIcons[p.type]}"></i> ${typeLabels[p.type] || p.type}</span>
                            <span class="badge bg-info">${p.images ? p.images.length : 0} صور</span>
                        </div>
                        ${imgHtml}
                        ${moreImages}
                        <h6 class="fw-bold mb-1">${p.name}</h6>
                        <p class="small text-muted mb-1">${p.description || ''}</p>
                        <h5 class="text-gold fw-bold mb-2">${p.price || 0} MRU</h5>
                        <div class="d-flex gap-2 flex-wrap">
                            <button onclick="callPhone('${p.phone||''}')" class="btn btn-sm btn-success"><i class="bi bi-telephone-fill"></i> اتصال</button>
                            <button onclick="openWhatsApp('222${(p.phone||'').replace(/^0+/, '')}','${encodeURIComponent(p.name||'')}')" class="btn btn-sm btn-success" style="background:#25D366;border-color:#25D366;"><i class="bi bi-whatsapp"></i> واتساب</button>
                            ${videoHtml}
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct('${doc.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                        <small class="text-muted d-block mt-2">${time}</small>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = '<div class="col-12 text-center text-danger py-4">خطأ في التحميل</div>';
    }
}

window.deleteProduct = async function(id) {
    if (!(await ARAconfirm('حذف هذا المنتج؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('products').doc(id).delete();
        loadProductsList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

function callPhone(phone) {
    if (!phone) return;
    window.location.href = 'tel:' + phone;
}

function openWhatsApp(phone, name) {
    if (!phone) return;
    var text = 'مرحباً بخصوص ' + decodeURIComponent(name);
    var intentUrl = 'intent://send?phone=' + phone + '&text=' + encodeURIComponent(text) + '#Intent;scheme=smsto;package=com.whatsapp;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.whatsapp;end';
    window.location.href = intentUrl;
}

// ============================================
// INIT
// ============================================
function initDashboard() {
    initMap();
    bindMapSearch();
    loadCommission();
    loadRidesCleanupSettings();
    loadStats();
    initRealtimeListeners();
    applyRoleVisibility();
    checkDailyRidesCleanup();
    setInterval(loadStats, 60000);
    addNotifLog('system', 'تم تشغيل لوحة التحكم');
}

initDashboard();

// ============================================
// STORES (SMART PROMOTIONS) MANAGEMENT
// ============================================
let storeImageFile = null;

document.getElementById('storeImage')?.addEventListener('change', function(e) {
    storeImageFile = e.target.files[0] || null;
    const preview = document.getElementById('storeImagePreview');
    if (preview) {
        if (storeImageFile) {
            preview.classList.remove('d-none');
            preview.querySelector('img').src = URL.createObjectURL(storeImageFile);
        } else {
            preview.classList.add('d-none');
        }
    }
});

document.getElementById('storeImageUrl')?.addEventListener('input', function(e) {
    const preview = document.getElementById('storeImagePreview');
    if (preview) {
        const url = e.target.value.trim();
        if (url) {
            preview.classList.remove('d-none');
            preview.querySelector('img').src = url;
        } else if (!storeImageFile) {
            preview.classList.add('d-none');
        }
    }
});

window.addStore = async function() {
    if (!requireDb('addStoreStatus')) return;
    const name = document.getElementById('storeName').value.trim();
    const phone = document.getElementById('storePhone').value.trim();
    const district = document.getElementById('storeDistrict').value.trim();
    if (!name) { showStatus('addStoreStatus', 'أدخل اسم المتجر', 'error'); return; }
    if (!phone) { showStatus('addStoreStatus', 'أدخل رقم الهاتف', 'error'); return; }

    const btn = document.getElementById('btnAddStore');
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>جاري الحفظ...';

    try {
        const images = [];
        const urlText = document.getElementById('storeImageUrl')?.value.trim();
        if (urlText) images.push(urlText);
        if (storeImageFile) {
            try {
                const b64 = await fileToBase64(storeImageFile);
                if (b64) images.push(b64);
            } catch (convErr) { console.warn('Image conversion failed:', convErr.message); }
        }
        const active = document.getElementById('storeActive').checked;
        await db.collection('stores_promotion').add({
            name, phone, district,
            images,
            active,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showStatus('addStoreStatus', 'تم إضافة المتجر بنجاح!', 'success');
        document.getElementById('storeName').value = '';
        document.getElementById('storePhone').value = '';
        document.getElementById('storeDistrict').value = '';
        document.getElementById('storeImage').value = '';
        document.getElementById('storeImageUrl').value = '';
        storeImageFile = null;
        loadStoresList();
    } catch (err) {
        showStatus('addStoreStatus', 'خطأ: ' + err.message, 'error');
    }
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة المتجر';
};

async function loadStoresList() {
    if (!requireDb()) return;
    const list = document.getElementById('storesList');
    list.innerHTML = '<div class="col-12 text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري التحميل...</div></div>';
    try {
        const snap = await db.collection('stores_promotion').orderBy('createdAt', 'desc').get();
        document.getElementById('storeCount').textContent = snap.size;
        if (snap.empty) {
            list.innerHTML = '<div class="col-12 text-center text-muted py-4">لا توجد متاجر</div>';
            return;
        }
        list.innerHTML = snap.docs.map(doc => {
            const s = doc.data();
            const active = s.active !== false;
            const imgHtml = s.images && s.images.length > 0
                ? `<img src="${s.images[0]}" style="width:100%;height:140px;object-fit:cover;border-radius:10px;" class="mb-2" onerror="this.src='data:image/svg+xml,%253Csvg%2520xmlns%253D%2522http://www.w3.org/2000/svg%2522%2520width%253D%2522200%2522%2520height%253D%2522200%2522%253E%253Crect%2520fill%253D%2522%2523f0f0f0%2522%2520width%253D%2522200%2522%2520height%253D%2522200%2522%252F%253E%253Ctext%2520x%253D%252250%2525%2522%2520y%253D%252250%2525%2522%2520text-anchor%253D%2522middle%2522%2520fill%253D%2522%2523999%2522%2520font-size%253D%252240%2522%253E%25F0%259F%259B%258D%253C%252Ftext%253E%253C%252Fsvg%253E'">`
                : `<div class="mb-2" style="width:100%;height:140px;background:#f0f0f0;border-radius:10px;display:flex;align-items:center;justify-content:center;"><i class="bi bi-shop-window fs-1 text-muted"></i></div>`;
            return `<div class="col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <h6 class="fw-bold mb-1">${s.name}</h6>
                            <span class="badge ${active ? 'bg-success' : 'bg-secondary'}">${active ? 'ظاهر' : 'مخفي'}</span>
                        </div>
                        ${imgHtml}
                        ${s.district ? `<p class="small text-muted mb-1"><i class="bi bi-geo-alt me-1"></i>${s.district}</p>` : ''}
                        <div class="d-flex gap-2 flex-wrap">
                            <button onclick="callPhone('${s.phone || ''}')" class="btn btn-sm btn-success"><i class="bi bi-telephone-fill"></i> اتصال</button>
                            <button onclick="openWhatsApp('${s.phone || ''}','${encodeURIComponent(s.name || '')}')" class="btn btn-sm btn-success" style="background:#25D366;border-color:#25D366;"><i class="bi bi-whatsapp"></i> واتساب</button>
                            <button class="btn btn-sm ${active ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleStore('${doc.id}', ${active})"><i class="bi ${active ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteStore('${doc.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = '<div class="col-12 text-center text-danger py-4">خطأ في التحميل</div>';
    }
}

window.toggleStore = async function(id, currentActive) {
    if (!requireDb()) return;
    try {
        await db.collection('stores_promotion').doc(id).update({ active: !currentActive });
        loadStoresList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.deleteStore = async function(id) {
    if (!(await ARAconfirm('حذف هذا المتجر؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('stores_promotion').doc(id).delete();
        loadStoresList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

// ============================================
// LADIES' STORE PRODUCTS MANAGEMENT
// ============================================
let ladiesImageFiles = [];

document.getElementById('ladiesImages')?.addEventListener('change', function(e) {
    ladiesImageFiles = Array.from(e.target.files);
    const preview = document.getElementById('ladiesImagesPreview');
    preview.innerHTML = ladiesImageFiles.map((f, i) =>
        `<div class="position-relative" style="width:100px;height:100px;">
            <img src="${URL.createObjectURL(f)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">
            <button class="btn btn-sm btn-danger position-absolute top-0 end-0" style="padding:0 4px;font-size:10px;" onclick="removeLadiesImage(${i})">&times;</button>
        </div>`
    ).join('');
});

window.removeLadiesImage = function(idx) {
    ladiesImageFiles.splice(idx, 1);
    const dt = new DataTransfer();
    ladiesImageFiles.forEach(f => dt.items.add(f));
    document.getElementById('ladiesImages').files = dt.files;
    const preview = document.getElementById('ladiesImagesPreview');
    preview.innerHTML = ladiesImageFiles.map((f, i) =>
        `<div class="position-relative" style="width:100px;height:100px;">
            <img src="${URL.createObjectURL(f)}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;">
            <button class="btn btn-sm btn-danger position-absolute top-0 end-0" style="padding:0 4px;font-size:10px;" onclick="removeLadiesImage(${i})">&times;</button>
        </div>`
    ).join('');
};

window.addLadiesProduct = async function() {
    if (!requireDb('addLadiesStatus')) return;
    const name = document.getElementById('ladiesName').value.trim();
    const price = parseFloat(document.getElementById('ladiesPrice').value) || 0;
    const phone = document.getElementById('ladiesPhone').value.trim();
    const description = document.getElementById('ladiesDescription').value.trim();
    if (!name) { showStatus('addLadiesStatus', 'أدخل اسم المنتج', 'error'); return; }

    const btn = document.getElementById('btnAddLadiesProduct');
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>جاري الحفظ...';

    try {
        const images = [];
        const urlText = document.getElementById('ladiesImageUrls')?.value.trim();
        if (urlText) {
            urlText.split('\n').map(u => u.trim()).filter(u => u).forEach(u => images.push(u));
        }
        if (ladiesImageFiles.length > 0) {
            try {
                const base64Images = await filesToBase64(ladiesImageFiles, 10);
                base64Images.forEach(function (u) { images.push(u); });
            } catch (convErr) {
                console.warn('Image conversion failed:', convErr.message);
            }
        }
        if (ladiesImageFiles.length > 0 && images.length === 0) {
            showStatus('addLadiesStatus', 'فشل رفع الصور. جرب صوراً أصغر أو استخدم رابط مباشر.', 'error');
            btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة المنتج';
            return;
        }

        await db.collection('ladies_products').add({
            name, price, phone, description, images,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showStatus('addLadiesStatus', 'تم إضافة المنتج بنجاح!', 'success');
        document.getElementById('ladiesName').value = '';
        document.getElementById('ladiesPrice').value = '';
        document.getElementById('ladiesPhone').value = '';
        document.getElementById('ladiesDescription').value = '';
        document.getElementById('ladiesImages').value = '';
        document.getElementById('ladiesImageUrls').value = '';
        document.getElementById('ladiesImagesPreview').innerHTML = '';
        ladiesImageFiles = [];
        loadLadiesProducts();
    } catch (err) {
        showStatus('addLadiesStatus', 'خطأ: ' + err.message, 'error');
    }
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>إضافة المنتج';
};

async function loadLadiesProducts() {
    if (!requireDb()) return;
    const list = document.getElementById('ladiesList');
    list.innerHTML = '<div class="col-12 text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري التحميل...</div></div>';
    try {
        const snap = await db.collection('ladies_products').orderBy('createdAt', 'desc').get();
        document.getElementById('ladiesCount').textContent = snap.size;
        if (snap.empty) {
            list.innerHTML = '<div class="col-12 text-center text-muted py-4">لا توجد منتجات</div>';
            return;
        }
        list.innerHTML = snap.docs.map(doc => {
            const p = doc.data();
            const time = p.createdAt?.toDate ? fmtDate(p.createdAt.toDate()) : '';
            const imgHtml = p.images && p.images.length > 0
                ? `<img src="${p.images[0]}" style="width:100%;height:160px;object-fit:cover;border-radius:10px;" class="mb-2" onerror="this.src='data:image/svg+xml,%253Csvg%2520xmlns%253D%2522http://www.w3.org/2000/svg%2522%2520width%253D%2522200%2522%2520height%253D%2522200%2522%253E%253Crect%2520fill%253D%2522%2523f0f0f0%2522%2520width%253D%2522200%2522%2520height%253D%2522200%2522%252F%253E%253Ctext%2520x%253D%252250%2525%2522%2520y%253D%252250%2525%2522%2520text-anchor%253D%2522middle%2522%2520fill%253D%2522%2523999%2522%2520font-size%253D%252240%2522%253E%25F0%259F%2591%2597%253C%252Ftext%253E%253C%252Fsvg%253E'">`
                : `<div class="mb-2" style="width:100%;height:160px;background:#f0f0f0;border-radius:10px;display:flex;align-items:center;justify-content:center;"><i class="bi bi-gem fs-1 text-muted"></i></div>`;
            return `<div class="col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-body">
                        <h6 class="fw-bold mb-1">${p.name}</h6>
                        ${imgHtml}
                        <p class="small text-muted mb-1">${p.description || ''}</p>
                        <h5 class="text-gold fw-bold mb-2">${p.price || 0} MRU</h5>
                        <div class="d-flex gap-2 flex-wrap">
                            <button onclick="callPhone('${p.phone || ''}')" class="btn btn-sm btn-success"><i class="bi bi-telephone-fill"></i> اتصال</button>
                            <button class="btn btn-sm btn-outline-warning" onclick="toggleLadiesProduct('${doc.id}')"><i class="bi bi-eye-slash"></i> إخفاء</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteLadiesProduct('${doc.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                        <small class="text-muted d-block mt-2">${time}</small>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = '<div class="col-12 text-center text-danger py-4">خطأ في التحميل</div>';
    }
}

window.toggleLadiesProduct = async function(id) {
    if (!requireDb()) return;
    try {
        const snap = await db.collection('ladies_products').doc(id).get();
        if (snap.exists) {
            const active = snap.data().active !== false;
            await db.collection('ladies_products').doc(id).update({ active: !active });
            loadLadiesProducts();
        }
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.deleteLadiesProduct = async function(id) {
    if (!(await ARAconfirm('حذف هذا المنتج؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('ladies_products').doc(id).delete();
        loadLadiesProducts();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

// ============================================
// CUSTOMER PRODUCTS (UPLOADED FROM APP) MANAGEMENT
// ============================================
async function loadCustomerProductsList() {
    if (!requireDb()) return;
    const list = document.getElementById('customerProductsList');
    if (!list) return;
    list.innerHTML = '<div class="col-12 text-center py-4"><div class="ARAVA-spinner"></div><div class="mt-2 text-muted small">جاري التحميل...</div></div>';
    try {
        let snap;
        try {
            snap = await db.collection('customer_products').orderBy('createdAt', 'desc').get();
        } catch (orderErr) {
            console.warn('customer_products orderBy createdAt failed:', orderErr.message);
            snap = await db.collection('customer_products').get();
        }
        document.getElementById('customerProductCount').textContent = snap.size;
        if (snap.empty) {
            list.innerHTML = '<div class="col-12 text-center text-muted py-4">لا توجد منتجات من الزبائن بعد — عندما يرفع الزبون منتجاً من تطبيق الزبون سيظهر هنا فوراً</div>';
            return;
        }
        const docs = snap.docs.slice().sort((a, b) => {
            const ta = a.data().createdAt && a.data().createdAt.toMillis ? a.data().createdAt.toMillis() : 0;
            const tb = b.data().createdAt && b.data().createdAt.toMillis ? b.data().createdAt.toMillis() : 0;
            return tb - ta;
        });
        list.innerHTML = docs.map(doc => {
            const p = doc.data();
            const active = p.active !== false;
            const time = p.createdAt?.toDate ? fmtDate(p.createdAt.toDate()) : '';
            const imgHtml = p.images && p.images.length > 0
                ? `<img src="${p.images[0]}" style="width:100%;height:160px;object-fit:cover;border-radius:10px;" class="mb-2" onerror="this.onerror=null;this.style.display='none';">`
                : `<div class="mb-2" style="width:100%;height:160px;background:#f0f0f0;border-radius:10px;display:flex;align-items:center;justify-content:center;"><i class="bi bi-box fs-1 text-muted"></i></div>`;
            return `<div class="col-md-4 col-sm-6">
                <div class="card border-0 shadow-sm h-100 ${active ? '' : 'opacity-75'}">
                    <div class="card-body">
                        <div class="d-flex gap-1 align-items-center mb-1">
                            <span class="badge ${active ? 'bg-success' : 'bg-secondary'}">${active ? 'ظاهر في التطبيق' : 'مخفي'}</span>
                            <span class="badge bg-info">${p.views || 0} مشاهدة</span>
                        </div>
                        ${imgHtml}
                        <h6 class="fw-bold mb-1">${p.name}</h6>
                        <p class="small text-muted mb-1">${p.description || ''}</p>
                        <h5 class="text-gold fw-bold mb-2">${p.price || 0} MRU</h5>
                        ${p.monthlyPrice ? `<div class="badge bg-warning text-dark mb-2">عرض شهري: ${p.monthlyPrice} MRU</div>` : ''}
                        <div class="d-flex gap-2 flex-wrap">
                            <button onclick="callPhone('${p.phone||''}')" class="btn btn-sm btn-success"><i class="bi bi-telephone-fill"></i> اتصال</button>
                            <button class="btn btn-sm ${active ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleCustomerProduct('${doc.id}', ${active})"><i class="bi ${active ? 'bi-eye-slash' : 'bi-eye'}"></i> ${active ? 'إخفاء' : 'إظهار'}</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomerProduct('${doc.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                        <small class="text-muted d-block mt-2">${time}</small>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        list.innerHTML = `<div class="col-12 text-center text-danger py-4">خطأ في التحميل: ${err.message || err}</div>`;
    }
}

window.toggleCustomerProduct = async function(id, currentActive) {
    if (!requireDb()) return;
    try {
        await db.collection('customer_products').doc(id).update({ active: !currentActive });
        loadCustomerProductsList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};

window.deleteCustomerProduct = async function(id) {
    if (!(await ARAconfirm('حذف هذا المنتج؟'))) return;
    if (!requireDb()) return;
    try {
        await db.collection('customer_products').doc(id).delete();
        loadCustomerProductsList();
    } catch (err) { ARAalert('خطأ: ' + err.message, 'error'); }
};
