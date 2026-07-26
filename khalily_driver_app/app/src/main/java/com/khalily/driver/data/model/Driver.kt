package com.khalily.driver.data.model

data class Driver(
    val driverId: String = "",
    val name: String = "",
    val phone: String = "",
    val lat: Double = 18.0735,
    val lng: Double = -15.9582,
    val geohash: String = "",
    val isOnline: Boolean = false,
    val currentRideId: String? = null,
    val vehicleType: String = "motorcycle",
    val rating: Double = 5.0,
    val totalRides: Int = 0,
    val credit: Double = 0.0,
    val fcmToken: String = "",
    val lastUpdated: Long = System.currentTimeMillis()
)
