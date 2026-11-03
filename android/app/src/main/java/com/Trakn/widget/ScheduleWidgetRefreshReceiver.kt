package com.Trakn.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.reactnativeandroidwidget.RNWidgetProvider

/** Recompute dates after a clock/date change, without opening the app. */
class ScheduleWidgetRefreshReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action !in setOf(Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED,
                Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_BOOT_COMPLETED)) return
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, RNWidgetProvider::class.java))
        if (ids.isNotEmpty()) RNWidgetProvider().onUpdate(context, manager, ids)
    }
}
