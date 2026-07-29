package com.ARAVA.customer.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.ARAVA.customer.util.PrefsManager

class CustomerBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            if (PrefsManager.isLoggedIn() && PrefsManager.isOnline()) {
                val serviceIntent = Intent(context, CustomerLocationService::class.java)
                context.startForegroundService(serviceIntent)
            }
        }
    }
}
