package com.arava.driver.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.arava.driver.util.PrefsManager

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            if (PrefsManager.isOnline(context)) {
                val serviceIntent = Intent(context, DriverLocationService::class.java)
                context.startForegroundService(serviceIntent)
            }
        }
    }
}
