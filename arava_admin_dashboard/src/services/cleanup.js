/**
 * ARAVA Data Lifecycle Manager
 * Automatically cleans old data to stay within Firestore free tier limits.
 *
 * Runs every 24 hours via the cron job scheduled in server.js
 *
 * Cleanup rules:
 * 1. Delete ride requests older than 24 hours (completed/cancelled/no_drivers)
 * 2. Reset drivers who have been offline for more than 7 days
 * 3. Log current usage stats for monitoring
 */

const admin = require('firebase-admin');

const RIDE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const DRIVER_INACTIVE_DAYS = 7;
const BATCH_SIZE = 500; // Firestore batch limit

async function cleanupOldRides(db) {
    const cutoffTime = new Date(Date.now() - RIDE_MAX_AGE_MS);

    console.log(`[Cleanup] Deleting rides older than ${cutoffTime.toISOString()}`);

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
        const snapshot = await db.collection('rides')
            .where('status', 'in', ['completed', 'cancelled', 'no_drivers'])
            .where('createdAt', '<', cutoffTime)
            .limit(BATCH_SIZE)
            .get();

        if (snapshot.empty) {
            hasMore = false;
            break;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            totalDeleted++;
        });

        await batch.commit();
        console.log(`[Cleanup] Deleted batch of ${snapshot.size} rides`);

        // Small delay between batches to avoid rate limits
        await sleep(100);
    }

    console.log(`[Cleanup] Total rides deleted: ${totalDeleted}`);
    return totalDeleted;
}

async function cleanupPendingRidesOlderThan24h(db) {
    const cutoffTime = new Date(Date.now() - RIDE_MAX_AGE_MS);

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
        const snapshot = await db.collection('rides')
            .where('status', '==', 'pending')
            .where('createdAt', '<', cutoffTime)
            .limit(BATCH_SIZE)
            .get();

        if (snapshot.empty) {
            hasMore = false;
            break;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            totalDeleted++;
        });

        await batch.commit();
        await sleep(100);
    }

    console.log(`[Cleanup] Pending rides older than 24h deleted: ${totalDeleted}`);
    return totalDeleted;
}

async function cleanupInactiveDrivers(db) {
    const cutoffDate = new Date(Date.now() - DRIVER_INACTIVE_DAYS * 24 * 60 * 60 * 1000);

    console.log(`[Cleanup] Resetting drivers inactive since ${cutoffDate.toISOString()}`);

    let totalReset = 0;
    let hasMore = true;

    while (hasMore) {
        const snapshot = await db.collection('drivers')
            .where('isOnline', '==', false)
            .where('lastUpdated', '<', cutoffDate)
            .limit(BATCH_SIZE)
            .get();

        if (snapshot.empty) {
            hasMore = false;
            break;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                isOnline: false,
                currentRideId: null,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            });
            totalReset++;
        });

        await batch.commit();
        await sleep(100);
    }

    console.log(`[Cleanup] Inactive drivers cleaned: ${totalReset}`);
    return totalReset;
}

async function logUsageStats(db) {
    const driversSnap = await db.collection('drivers').count().get();
    const onlineDriversSnap = await db.collection('drivers')
        .where('isOnline', '==', true).count().get();
    const ridesSnap = await db.collection('rides').count().get();
    const activeRidesSnap = await db.collection('rides')
        .where('status', 'in', ['accepted', 'in_progress']).count().get();

    const stats = {
        timestamp: new Date().toISOString(),
        totalDrivers: driversSnap.data().count,
        onlineDrivers: onlineDriversSnap.data().count,
        totalRides: ridesSnap.data().count,
        activeRides: activeRidesSnap.data().count
    };

    // Save stats to a monitoring collection (limited to last 30 entries)
    await db.collection('system_stats').add({
        ...stats,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Trim old stats (keep only last 30)
    const oldStats = await db.collection('system_stats')
        .orderBy('createdAt', 'desc')
        .offset(30)
        .get();

    const trimBatch = db.batch();
    oldStats.forEach(doc => trimBatch.delete(doc.ref));
    await trimBatch.commit();

    console.log('[Stats]', JSON.stringify(stats, null, 2));
    return stats;
}

async function runCleanup() {
    console.log('========================================');
    console.log(`[ARAVA Cleanup] Starting at ${new Date().toISOString()}`);
    console.log('========================================');

    const db = admin.firestore();

    try {
        const ridesDeleted = await cleanupOldRides(db);
        const pendingDeleted = await cleanupPendingRidesOlderThan24h(db);
        const driversReset = await cleanupInactiveDrivers(db);
        const stats = await logUsageStats(db);

        console.log('========================================');
        console.log('[ARAVA Cleanup] Summary:');
        console.log(`  - Completed/cancelled rides deleted: ${ridesDeleted}`);
        console.log(`  - Pending rides expired: ${pendingDeleted}`);
        console.log(`  - Inactive drivers reset: ${driversReset}`);
        console.log(`  - Stats: ${JSON.stringify(stats)}`);
        console.log('========================================');

        return { ridesDeleted, pendingDeleted, driversReset, stats };
    } catch (error) {
        console.error('[ARAVA Cleanup] Error:', error);
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for use in server.js
module.exports = { runCleanup };

// Run directly if called from CLI
if (require.main === module) {
    // Initialize Firebase if running standalone
    try {
        const serviceAccount = require('../../docs_and_configs/firebase/serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        runCleanup().then(() => process.exit(0)).catch(() => process.exit(1));
    } catch (err) {
        console.error('Firebase service account not found. Run this from server.js context.');
        process.exit(1);
    }
}
