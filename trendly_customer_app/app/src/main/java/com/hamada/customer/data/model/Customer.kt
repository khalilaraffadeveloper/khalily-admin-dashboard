package com.trendly.customer.data.model

data class Customer(
    val customerId: String = "",
    val name: String = "",
    val phone: String = "",
    val whatsapp: String = "",
    val password: String = "",
    val lat: Double = 18.0735,
    val lng: Double = -15.9582,
    val geohash: String = "",
    val isOnline: Boolean = true,
    val credit: Double = 0.0,
    val totalRides: Int = 0,
    val fcmToken: String = "",
    val deviceId: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val lastUpdated: Long = System.currentTimeMillis()
)
