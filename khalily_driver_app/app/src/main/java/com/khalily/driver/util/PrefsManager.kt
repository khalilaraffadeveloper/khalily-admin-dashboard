package com.khalily.driver.util

import android.content.Context
import android.content.SharedPreferences

object PrefsManager {
    private const val PREFS_NAME = "khalily_prefs"
    private const val KEY_DRIVER_ID = "driver_id"
    private const val KEY_DRIVER_NAME = "driver_name"
    private const val KEY_IS_ONLINE = "is_online"
    private const val KEY_AUTH_TOKEN = "auth_token"
    private const val KEY_PHONE = "phone"
    private const val KEY_LOGGED_IN = "logged_in"

    private fun prefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveDriverId(context: Context, id: String) {
        prefs(context).edit().putString(KEY_DRIVER_ID, id).apply()
    }

    fun getDriverId(context: Context): String? {
        return prefs(context).getString(KEY_DRIVER_ID, null)
    }

    fun saveDriverName(context: Context, name: String) {
        prefs(context).edit().putString(KEY_DRIVER_NAME, name).apply()
    }

    fun getDriverName(context: Context): String {
        return prefs(context).getString(KEY_DRIVER_NAME, "سائق") ?: "سائق"
    }

    fun setOnlineStatus(context: Context, isOnline: Boolean) {
        prefs(context).edit().putBoolean(KEY_IS_ONLINE, isOnline).apply()
    }

    fun isOnline(context: Context): Boolean {
        return prefs(context).getBoolean(KEY_IS_ONLINE, false)
    }

    fun saveAuthToken(context: Context, token: String) {
        prefs(context).edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(context: Context): String? {
        return prefs(context).getString(KEY_AUTH_TOKEN, null)
    }

    fun setPhone(context: Context, phone: String) {
        prefs(context).edit().putString(KEY_PHONE, phone).apply()
    }

    fun getPhone(context: Context): String {
        return prefs(context).getString(KEY_PHONE, "") ?: ""
    }

    fun setLoggedIn(context: Context, loggedIn: Boolean) {
        prefs(context).edit().putBoolean(KEY_LOGGED_IN, loggedIn).apply()
    }

    fun isLoggedIn(context: Context): Boolean {
        return prefs(context).getBoolean(KEY_LOGGED_IN, false)
    }

    fun markCancellationSeen(context: Context, rideId: String) {
        val seen = getSeenCancellations(context).toMutableSet()
        seen.add(rideId)
        prefs(context).edit().putStringSet("seen_cancellations", seen).apply()
    }

    fun getSeenCancellations(context: Context): Set<String> {
        return prefs(context).getStringSet("seen_cancellations", emptySet()) ?: emptySet()
    }

    fun clearSeenCancellations(context: Context) {
        prefs(context).edit().remove("seen_cancellations").apply()
    }

    fun markAutoCompleteSeen(context: Context, rideId: String) {
        val seen = getSeenAutoCompletes(context).toMutableSet()
        seen.add(rideId)
        prefs(context).edit().putStringSet("seen_autocompletes", seen).apply()
    }

    fun getSeenAutoCompletes(context: Context): Set<String> {
        return prefs(context).getStringSet("seen_autocompletes", emptySet()) ?: emptySet()
    }
}
