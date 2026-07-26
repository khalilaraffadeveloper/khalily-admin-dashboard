package com.khalily.driver.data.model

data class RideRequest(
    val rideId: String = "",
    val passengerName: String = "",
    val passengerPhone: String = "",
    val pickupLat: Double = 0.0,
    val pickupLng: Double = 0.0,
    val pickupAddress: String = "",
    val dropoffLat: Double = 0.0,
    val dropoffLng: Double = 0.0,
    val dropoffAddress: String = "",
    val status: String = "pending",
    val assignedDriverId: String? = null,
    val distanceKm: Double = 0.0,
    val estimatedFare: Double = 0.0,
    val fare: Double = 0.0,
    val createdAt: Long = System.currentTimeMillis(),
    val acceptedAt: Long = 0L,
    val geohash: String = ""
)
