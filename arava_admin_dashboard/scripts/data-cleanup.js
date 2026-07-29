/**
 * ARAVA - Data Lifecycle Manager
 *
 * Cleans up old data to stay within Firestore free tier limits.
 *
 * Schedule: Run every 24 hours via cron or manual execution
 * Command: node scripts/data-cleanup.js
 *
 * What it cleans:
 * 1. Ride requests older than 24 hours
 * 2. Drivers offline for more than 7 days
 * 3. Completed/cancelled rides older than 7 days
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
try {
    const serviceAccount = require(
        path.join(__dirname, '../../docs_and_configs/firebase/serviceAccountKey.json')
    );
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (err) {
    console.error('ERROR: serviceAccountKey.json not found!');
    console.error('Place it in docs_and_configs/firebase/');
    process.exit(1);
}

const db = admin.firestore();

const CONFIG = {
    RIDE_DELETE_AFTER_HOURS: 24,
    INACTIVE_DRIVER_DELETE_AFTER_DAYS: 7,
    BATCH_SIZE: 500,
    LOG_CLEANUP: true
};

async function cleanupOldRides() {
    console.log('\n--- Cleaning up old rides ---');
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - CONFIG.RIDE_DELETE_AFTER_HOURS);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

    let totalDeleted = 0;

    // Delete completed rides older than cutoff
    const completedQuery = db.collection('rides')
        .where('status', 'in', ['completed', 'cancelled', 'no_drivers'])
        .where('createdAt', '<', cutoffTimestamp)
        .limit(CONFIG.BATCH_SIZE);

    let batch = db.batch();
    let count = 0;

    const snapshot = await completedQuery.get();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
        totalDeleted++;

        if (count >= CONFIG.BATCH_SIZE) {
            batch.commit();
            batch = db.batch();
            count = 0;
        }
    });

    if (count > 0) {
        await batch.commit();
    }

    // Also clean old pending rides (stuck for more than 1 hour)
    const stuckCutoff = new Date();
    stuckCutoff.setHours(stuckCutoff.getHours() - 1);
    const stuckTimestamp = admin.firestore.Timestamp.fromDate(stuckCutoff);

    const stuckQuery = db.collection('rides')
        .where('status', '==', 'pending')
        .where('createdAt', '<', stuckTimestamp)
        .limit(CONFIG.BATCH_SIZE);

    const stuckSnapshot = await stuckQuery.get();
    batch = db.batch();
    count = 0;

    stuckSnapshot.forEach(doc => {
        batch.update(doc.ref, { status: 'expired' });
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }

    console.log(`Deleted ${totalDeleted} old ride records`);
    console.log(`Marked ${count} stuck pending rides as expired`);
    return totalDeleted;
}

async function cleanupInactiveDrivers() {
    console.log('\n--- Cleaning up inactive drivers ---');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CONFIG.INACTIVE_DRIVER_DELETE_AFTER_DAYS);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

    const snapshot = await db.collection('drivers')
        .where('isOnline', '==', false)
        .where('lastUpdated', '<', cutoffTimestamp)
        .limit(CONFIG.BATCH_SIZE)
        .get();

    let totalDeleted = 0;
    let batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        batch.delete(doc.ref);
        count++;
        totalDeleted++;

        if (count >= CONFIG.BATCH_SIZE) {
            batch.commit();
            batch = db.batch();
            count = 0;
        }
    });

    if (count > 0) {
        await batch.commit();
    }

    console.log(`Deleted ${totalDeleted} inactive driver records`);
    return totalDeleted;
}

async function getCollectionStats() {
    console.log('\n--- Collection Statistics ---');

    const driversSnapshot = await db.collection('drivers').count().get();
    const onlineDrivers = await db.collection('drivers')
        .where('isOnline', '==', true).count().get();
    const ridesSnapshot = await db.collection('rides').count().get();
    const pendingRides = await db.collection('rides')
        .where('status', '==', 'pending').count().get();

    console.log(`Drivers: ${driversSnapshot.data().count} total (${onlineDrivers.data().count} online)`);
    console.log(`Rides: ${ridesSnapshot.data().count} total (${pendingRides.data().count} pending)`);
}

async function runCleanup() {
    console.log('=== ARAVA Data Cleanup Started ===');
    console.log(`Time: ${new Date().toISOString()}`);

    try {
        await getCollectionStats();
        const ridesDeleted = await cleanupOldRides();
        const driversDeleted = await cleanupInactiveDrivers();
        await getCollectionStats();

        console.log('\n=== Cleanup Complete ===');
        console.log(`Total: ${ridesDeleted} rides, ${driversDeleted} drivers cleaned`);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run if called directly
if (require.main === module) {
    runCleanup();
}

module.exports = { runCleanup, cleanupOldRides, cleanupInactiveDrivers };
