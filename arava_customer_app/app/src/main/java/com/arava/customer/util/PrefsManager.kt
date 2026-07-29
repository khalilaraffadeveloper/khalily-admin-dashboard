package com.ARAVA.customer.util

import android.content.Context
import android.content.SharedPreferences

object PrefsManager {
    private const val PREFS_NAME = "ARAVA_customer_prefs"

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveCustomerId(id: String) = prefs.edit().putString("customer_id", id).apply()
    fun getCustomerId(): String = prefs.getString("customer_id", "") ?: ""

    fun saveCustomerName(name: String) = prefs.edit().putString("customer_name", name).apply()
    fun getCustomerName(): String = prefs.getString("customer_name", "") ?: ""

    fun savePhone(phone: String) = prefs.edit().putString("phone", phone).apply()
    fun getPhone(): String = prefs.getString("phone", "") ?: ""

    fun saveWhatsapp(whatsapp: String) = prefs.edit().putString("whatsapp", whatsapp).apply()
    fun getWhatsapp(): String = prefs.getString("whatsapp", "") ?: ""

    fun setLoggedIn(loggedIn: Boolean) = prefs.edit().putBoolean("logged_in", loggedIn).apply()
    fun isLoggedIn(): Boolean = prefs.getBoolean("logged_in", false)

    fun setOnlineStatus(online: Boolean) = prefs.edit().putBoolean("is_online", online).apply()
    fun isOnline(): Boolean = prefs.getBoolean("is_online", true)

    fun saveAuthToken(token: String) = prefs.edit().putString("auth_token", token).apply()
    fun getAuthToken(): String = prefs.getString("auth_token", "") ?: ""

    fun clear() = prefs.edit().clear().apply()
}
