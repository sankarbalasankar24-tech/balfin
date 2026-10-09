package com.balfin.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge for the quick-add floating bubble. The JS layer calls setGesture
 * whenever the user changes their choice in Manage; native side starts or
 * stops the floating-bubble service accordingly (bubble-only by design).
 */
@CapacitorPlugin(name = "QuickAdd")
public class QuickAddTogglePlugin extends Plugin {

  public static final String PREFS = "balfin_prefs";
  public static final String KEY_GESTURE = "quick_add_gesture";

  @Override
  public void load() {
    super.load();
    // Re-apply the stored choice on every app launch. Older installs may
    // still hold "shake"/"volume" — normalize them to the bubble.
    String stored = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(KEY_GESTURE, "bubble");
    if (!"none".equals(stored)) stored = "bubble";
    applyGesture(stored);
  }

  @PluginMethod
  public void setGesture(PluginCall call) {
    String gesture = call.getString("gesture", "bubble");
    if (!"none".equals(gesture)) gesture = "bubble";
    getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().putString(KEY_GESTURE, gesture).apply();
    applyGesture(gesture);
    call.resolve();
  }

  private void applyGesture(String gesture) {
    Intent bubble = new Intent(getContext(), QuickAddBubbleService.class);

    if ("bubble".equals(gesture)) {
      try {
        if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(bubble);
        else getContext().startService(bubble);
      } catch (Exception ignored) {
      }
    } else {
      getContext().stopService(bubble);
    }
  }

  @PluginMethod
  public void getStatus(PluginCall call) {
    JSObject ret = new JSObject();
    Context ctx = getContext();
    ret.put("gesture", ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(KEY_GESTURE, "bubble"));
    ret.put("overlay", Settings.canDrawOverlays(ctx));
    ret.put("bubble", QuickAddBubbleService.running);
    ret.put("shake", false);
    ret.put("volume", false);
    PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
    ret.put("batteryOk", pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
    call.resolve(ret);
  }

  @PluginMethod
  public void restartServices(PluginCall call) {
    String gesture = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(KEY_GESTURE, "bubble");
    applyGesture(gesture);
    call.resolve();
  }

  @PluginMethod
  public void isIgnoringBatteryOptimizations(PluginCall call) {
    JSObject ret = new JSObject();
    PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
    ret.put("granted", pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
    call.resolve(ret);
  }

  @PluginMethod
  public void requestIgnoreBatteryOptimizations(PluginCall call) {
    Context ctx = getContext();
    PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
    if (pm != null && !pm.isIgnoringBatteryOptimizations(ctx.getPackageName())) {
      try {
        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
            Uri.parse("package:" + ctx.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(intent);
      } catch (Exception ignored) {
        // OEM without the intent — fall back to the general list.
        try {
          Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          ctx.startActivity(intent);
        } catch (Exception ignoredAgain) {
        }
      }
    }
    call.resolve();
  }

  @PluginMethod
  public void canDrawOverlays(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("granted", Settings.canDrawOverlays(getContext()));
    call.resolve(ret);
  }

  @PluginMethod
  public void requestOverlayPermission(PluginCall call) {
    if (!Settings.canDrawOverlays(getContext())) {
      Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:" + getContext().getPackageName()));
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(intent);
    }
    call.resolve();
  }
}
