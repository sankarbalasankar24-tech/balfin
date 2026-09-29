package com.balfin.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Restores the persistent quick-add notification after a device reboot. */
public class QuickAddBootReceiver extends BroadcastReceiver {

  @Override
  public void onReceive(Context context, Intent intent) {
    String action = intent == null ? null : intent.getAction();
    if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
        && !"android.intent.action.QUICKBOOT_POWERON".equals(action)) {
      return;
    }
    boolean enabled = context
        .getSharedPreferences("balfin_prefs", Context.MODE_PRIVATE)
        .getBoolean("quick_add_enabled", true);
    if (!enabled) return;

    Intent svc = new Intent(context, QuickAddNotificationService.class);
    try {
      if (Build.VERSION.SDK_INT >= 26) {
        context.startForegroundService(svc);
      } else {
        context.startService(svc);
      }
    } catch (Exception ignored) {
      // FGS restrictions can reject background starts on some OEM builds
    }
  }
}
