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
 * Bridge for the gesture quick-add feature. The JS layer calls setGesture
 * whenever the user changes their choice in Manage; native side starts or
 * stops the floating-bubble and shake-detection services accordingly.
 */
@CapacitorPlugin(name = "QuickAdd")
public class QuickAddTogglePlugin extends Plugin {

  public static final String PREFS = "balfin_prefs";
  public static final String KEY_GESTURE = "quick_add_gesture";

  @Override
  public void load() {
    super.load();
    // Re-apply the stored choice on every app launch.
    applyGesture(getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(KEY_GESTURE, "bubble"));
  }

  @PluginMethod
  public void setGesture(PluginCall call) {
    String gesture = call.getString("gesture", "bubble");
    getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().putString(KEY_GESTURE, gesture).apply();
    applyGesture(gesture);
    call.resolve();
  }

  private void applyGesture(String gesture) {
    // shake needs the motion service; bubble needs a foreground service token.
    Intent shake = new Intent(getContext(), ShakeGestureService.class);
    Intent bubble = new Intent(getContext(), QuickAddBubbleService.class);
    Intent volume = new Intent(getContext(), VolumeGestureService.class);

    boolean wantShake = "shake".equals(gesture) || "both".equals(gesture);
    boolean wantBubble = "bubble".equals(gesture) || "both".equals(gesture);
    boolean wantVolume = "volume".equals(gesture) || "both".equals(gesture);

    if (wantShake) {
      try {
        if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(shake);
        else getContext().startService(shake);
      } catch (Exception ignored) {
      }
    } else {
      getContext().stopService(shake);
    }

    if (wantBubble) {
      try {
        if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(bubble);
        else getContext().startService(bubble);
      } catch (Exception ignored) {
      }
    } else {
      getContext().stopService(bubble);
    }

    if (wantVolume) {
      try {
        if (Build.VERSION.SDK_INT >= 26) getContext().startForegroundService(volume);
        else getContext().startService(volume);
      } catch (Exception ignored) {
      }
    } else {
      getContext().stopService(volume);
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
    ret.put("shake", ShakeGestureService.running);
    ret.put("volume", VolumeGestureService.running);
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
