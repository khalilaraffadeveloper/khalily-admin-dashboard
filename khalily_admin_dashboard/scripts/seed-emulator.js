#!/usr/bin/env node
const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({ projectId: 'demo-khalily' });
const db = admin.firestore();

const NOUAKCHOTT = { lat: 18.0735, lng: -15.9582 };

const TEST_DRIVERS = [
    {
        name: 'أحمد ولد محمد',
        phone: '2224567890',
        password: '123456',
        vehicleType: 'motorcycle',
        credit: 500,
        lat: NOUAKCHOTT.lat + 0.005,
        lng: NOUAKCHOTT.lng + 0.003,
        isOnline: true,
        disabled: false,
        rating: 4.8,
        totalRides: 120,
        fcmToken: '',
        currentRideId: null,
        geohash: ''
    },
    {
        name: 'عالي ولد براهيم',
        phone: '2224567891',
        password: '123456',
        vehicleType: 'motorcycle',
        credit: 300,
        lat: NOUAKCHOTT.lat - 0.003,
        lng: NOUAKCHOTT.lng + 0.005,
        isOnline: true,
        disabled: false,
        rating: 4.5,
        totalRides: 85,
        fcmToken: '',
        currentRideId: null,
        geohash: ''
    },
    {
        name: 'محمدن ولد سيدي',
        phone: '2224567892',
        password: '123456',
        vehicleType: 'motorcycle',
        credit: 0,
        lat: NOUAKCHOTT.lat + 0.008,
        lng: NOUAKCHOTT.lng - 0.002,
        isOnline: true,
        disabled: false,
        rating: 4.9,
        totalRides: 200,
        fcmToken: '',
        currentRideId: null,
        geohash: ''
    },
    {
        name: 'بوبكر ولد الحسن',
        phone: '2224567893',
        password: '123456',
        vehicleType: 'motorcycle',
        credit: 150,
        lat: NOUAKCHOTT.lat - 0.006,
        lng: NOUAKCHOTT.lng - 0.004,
        isOnline: false,
        disabled: false,
        rating: 4.2,
        totalRides: 50,
        fcmToken: '',
        currentRideId: null,
        geohash: ''
    },
    {
        name: 'إسماعيل ولد داوود',
        phone: '2224567894',
        password: '123456',
        vehicleType: 'motorcycle',
        credit: 100,
        lat: NOUAKCHOTT.lat + 0.001,
        lng: NOUAKCHOTT.lng + 0.008,
        isOnline: true,
        disabled: true,
        rating: 3.9,
        totalRides: 30,
        fcmToken: '',
        currentRideId: null,
        geohash: ''
    }
];

const TEST_RIDES = [
    {
        passengerName: 'فاطمة بنت أحمد',
        passengerPhone: '2229999001',
        pickupLat: NOUAKCHOTT.lat + 0.002,
        pickupLng: NOUAKCHOTT.lng + 0.001,
        pickupAddress: 'كارفور مدريد',
        dropoffAddress: 'تفرغ زينة',
        searchRadiusKm: 3,
        fare: 650,
        status: 'pending',
        assignedDriverId: null,
        notifiedDrivers: []
    },
    {
        passengerName: 'خديجة بنت علي',
        passengerPhone: '2229999002',
        pickupLat: NOUAKCHOTT.lat - 0.001,
        pickupLng: NOUAKCHOTT.lng + 0.003,
        pickupAddress: 'سونيك بانك',
        dropoffAddress: 'الدروج',
        searchRadiusKm: 2,
        fare: 500,
        status: 'pending',
        assignedDriverId: null,
        notifiedDrivers: []
    }
];

async function seed() {
    console.log('Seeding Firestore emulator...\n');

    for (const driver of TEST_DRIVERS) {
        const docRef = await db.collection('drivers').add({
            ...driver,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  + ${driver.name} (credit: ${driver.credit}) -> ${docRef.id}`);
    }

    for (const ride of TEST_RIDES) {
        const docRef = await db.collection('rides').add({
            ...ride,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`  + ${ride.passengerName} (${ride.status}) -> ${docRef.id}`);
    }

    console.log('\nDone!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
