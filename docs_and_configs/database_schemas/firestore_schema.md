# ARAVA - Firestore Database Schema

## Collections Structure

### 1. `drivers` collection
```
drivers/{driverId}
├── driverId: string          (same as document ID)
├── name: string              (driver full name)
├── phone: string             (phone number)
├── lat: number               (current latitude - default: 18.0735 Nouakchott)
├── lng: number               (current longitude - default: -15.9582 Nouakchott)
├── geohash: string           (geohash precision 9)
├── isOnline: boolean         (available for rides)
├── currentRideId: string?    (active ride ID or null)
├── vehicleType: string       (always "motorcycle")
├── credit: number            (driver balance in MRU - أوقية)
├── rating: number            (1-5 stars)
├── totalRides: number        (lifetime ride count)
├── fcmToken: string          (Firebase Cloud Messaging token)
├── lastUpdated: timestamp    (last GPS update)
└── createdAt: timestamp      (registration date)
```

### 2. `rides` collection
```
rides/{rideId}
├── rideId: string            (same as document ID)
├── passengerName: string     (customer name)
├── passengerPhone: string    (customer phone - hidden from driver before accept)
├── pickupLat: number         (pickup latitude)
├── pickupLng: number         (pickup longitude)
├── pickupAddress: string     (pickup address text)
├── dropoffLat: number        (destination latitude)
├── dropoffLng: number        (destination longitude)
├── dropoffAddress: string    (destination address text)
├── fare: number              (price in MRU - أوقية)
├── status: string            (pending | accepted | in_progress | completed | cancelled | no_drivers | expired)
├── assignedDriverId: string? (assigned driver ID)
├── searchRadiusKm: number    (dispatch radius)
├── distanceKm: number        (calculated trip distance)
├── notifiedDrivers: string[] (list of notified driver IDs)
├── notificationSentAt: timestamp
├── acceptedAt: timestamp
├── startedAt: timestamp
├── completedAt: timestamp
├── geohash: string           (pickup geohash for queries)
└── createdAt: timestamp      (ride creation time)
```

## Business Rules

1. **Credit Check**: Driver can only accept rides if `credit > 0`
2. **Race Condition**: Firestore Transaction ensures one driver per ride
3. **Phone Privacy**: `passengerPhone` is NOT sent in FCM notification, only in ride document
4. **Fare Calculation**: 200 MRU base + 150 MRU per km

## Data Protection

- Driver locations: Only last known position (no history)
- Completed rides: Auto-delete after 24 hours
- Inactive drivers (>7 days offline): Cleanup script removes
- Geohash precision 9 (~5m accuracy) for efficient queries

## Free Tier Limits (Firestore)
- Storage: 1 GB | Reads: 50,000/day | Writes: 20,000/day
- Estimated daily usage (10 drivers): ~30,000 reads
