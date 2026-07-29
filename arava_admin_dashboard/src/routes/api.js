const express = require("express");
const router = express.Router();
const { serverTimestamp } = require("firebase/firestore");
const { db } = require("../config/firebase");

// GET /api/drivers - list all online drivers
router.get("/drivers", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Firestore not connected" });
    }
    const snapshot = await db
      .collection("drivers")
      .where("isOnline", "==", true)
      .get();

    const drivers = [];
    snapshot.forEach((doc) => {
      drivers.push({ id: doc.id, ...doc.data() });
    });

    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dispatch-ride - send ride request to nearby drivers
router.post("/dispatch-ride", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Firestore not connected" });
    }

    const { passengerName, pickupLat, pickupLng, pickupAddress, radiusKm } = req.body;

    if (!pickupLat || !pickupLng) {
      return res.status(400).json({ error: "pickupLat and pickupLng are required" });
    }

    // Create ride request document
    const rideRequest = {
      passengerName: passengerName || "Guest",
      pickupLat,
      pickupLng,
      pickupAddress: pickupAddress || "",
      radiusKm: radiusKm || 3,
      status: "pending",
      createdAt: serverTimestamp(),
    };

    const docRef = await db.collection("ride_requests").add(rideRequest);

    // Find nearby online drivers using geohash prefix matching
    const nearbyDrivers = await findNearbyDrivers(pickupLat, pickupLng, radiusKm);

    // Send FCM to each nearby driver
    const messaging = require("firebase-admin").messaging();
    const tokens = [];

    for (const driver of nearbyDrivers) {
      if (driver.fcmToken) {
        tokens.push(driver.fcmToken);
      }
    }

    if (tokens.length > 0) {
      const message = {
        tokens,
        notification: {
          title: "New Ride Request!",
          body: `${passengerName} needs a ride nearby!`,
        },
        data: {
          type: "ride_request",
          requestId: docRef.id,
          passengerName: passengerName || "Guest",
          pickupLat: String(pickupLat),
          pickupLng: String(pickupLng),
          pickupAddress: pickupAddress || "",
          distanceKm: "0",
          estimatedFare: "",
        },
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`FCM sent: ${response.successCount} success, ${response.failureCount} failed`);
    }

    res.json({
      success: true,
      requestId: docRef.id,
      driversNotified: tokens.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ride-requests - list recent ride requests
router.get("/ride-requests", async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: "Firestore not connected" });
    }
    const snapshot = await db
      .collection("ride_requests")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: find nearby drivers using simple distance calculation
async function findNearbyDrivers(lat, lng, radiusKm) {
  const snapshot = await db
    .collection("drivers")
    .where("isOnline", "==", true)
    .get();

  const nearby = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.lat && data.lng) {
      const distance = haversineDistance(lat, lng, data.lat, data.lng);
      if (distance <= radiusKm) {
        nearby.push({ id: doc.id, ...data, distanceKm: distance });
      }
    }
  });

  return nearby;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = router;
