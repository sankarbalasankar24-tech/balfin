package com.balfin.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Re-applies the stored quick-add gesture after a device reboot so the
 * floating bubble / shake detector come back without opening the app.
 * Does nothing when the user chose "Off" in Manage.
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
    if ("none".equals(gesture)) return;

    boolean wantShake = "shake".equals(gesture) || "both".equals(gesture);
    boolean wantBubble = "bubble".equals(gesture) || "both".equals(gesture);
    boolean wantVolume = "volume".equals(gesture) || "both".equals(gesture);
    try {
      if (wantShake) {
        Intent shake = new Intent(context, ShakeGestureService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(shake);
        else context.startService(shake);
      }
      if (wantBubble) {
        Intent bubble = new Intent(context, QuickAddBubbleService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(bubble);
        else context.startService(bubble);
      }
      if (wantVolume) {
        Intent volume = new Intent(context, VolumeGestureService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(volume);
        else context.startService(volume);
      }
    } catch (Exception ignored) {
      // Rare: FGS-from-boot restrictions on some OEM skins. The next app open
      // re-applies the gesture via QuickAddTogglePlugin.load().
    }
  }
}
