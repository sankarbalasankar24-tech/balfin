package com.balfin.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Re-applies the stored quick-add gesture after a device reboot so the
 * floating bubble comes back without opening the app, and re-arms the daily
 * summary alarm. Does nothing when the user chose "Off" in Manage.
 */
public class QuickAddBootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent == null || intent.getAction() == null ? "" : intent.getAction();
    if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
        && !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
      return;
    }
    String gesture = context
        .getSharedPreferences(QuickAddTogglePlugin.PREFS, Context.MODE_PRIVATE)
        .getString(QuickAddTogglePlugin.KEY_GESTURE, "bubble");
    if (!"none".equals(gesture)) {
      try {
        Intent bubble = new Intent(context, QuickAddBubbleService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(bubble);
        else context.startService(bubble);
      } catch (Exception ignored) {
        // Rare: FGS-from-boot restrictions on some OEM skins. The next app open
        // re-applies the gesture via QuickAddTogglePlugin.load().
      }
    }
    // Re-arm the nightly financial summary notification.
    DailySummaryReceiver.scheduleNext(context);
  }
}
