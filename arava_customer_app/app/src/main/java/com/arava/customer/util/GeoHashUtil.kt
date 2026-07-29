package com.ARAVA.customer.util

object GeoHashUtil {
    private const val BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

    fun encode(lat: Double, lng: Double, precision: Int = 9): String {
        var minLat = -90.0
        var maxLat = 90.0
        var minLng = -180.0
        var maxLng = 180.0
        var isEven = true
        var bit = 0
        var ch = 0
        val geohash = StringBuilder()

        while (geohash.length < precision) {
            if (isEven) {
                val mid = (minLng + maxLng) / 2
                if (lng >= mid) {
                    ch = ch or (1 shl (4 - bit))
                    minLng = mid
                } else {
                    maxLng = mid
                }
            } else {
                val mid = (minLat + maxLat) / 2
                if (lat >= mid) {
                    ch = ch or (1 shl (4 - bit))
                    minLat = mid
                } else {
                    maxLat = mid
                }
            }
            isEven = !isEven
            if (bit < 4) {
                bit++
            } else {
                geohash.append(BASE32[ch])
                bit = 0
                ch = 0
            }
        }
        return geohash.toString()
    }
}
