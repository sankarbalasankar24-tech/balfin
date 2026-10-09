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

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Bridge for the quick-add floating bubble and native HTTP sync.
 * Handles bubble lifecycle, opacity settings, overlay permissions,
 * and direct native HTTP requests to Google Sheets without browser CORS limitations.
 */
@CapacitorPlugin(name = "QuickAdd")
public class QuickAddTogglePlugin extends Plugin {
  public static final String PREFS = "balfin_prefs";
  public static final String KEY_GESTURE = "quick_add_gesture";
  public static final String KEY_OPACITY = "bubble_opacity";

  @Override
  public void load() {
    super.load();
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
  public void setBubbleOpacity(PluginCall call) {
    Double opVal = call.getDouble("opacity", 0.90);
    float opacity = (float) Math.max(0.2, Math.min(1.0, opVal != null ? opVal : 0.90));
    getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().putFloat(KEY_OPACITY, opacity).apply();
    QuickAddBubbleService.updateBubbleAlpha(opacity);
    call.resolve();
  }

  @PluginMethod
  public void getBubbleOpacity(PluginCall call) {
    float opacity = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getFloat(KEY_OPACITY, 0.90f);
    JSObject ret = new JSObject();
    ret.put("opacity", opacity);
    call.resolve(ret);
  }

  @PluginMethod
  public void getStatus(PluginCall call) {
    JSObject ret = new JSObject();
    Context ctx = getContext();
    ret.put("gesture", ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(KEY_GESTURE, "bubble"));
    ret.put("opacity", ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getFloat(KEY_OPACITY, 0.90f));
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

  /**
   * Native HTTP POST for Google Apps Script Web App sync.
   * Completely bypasses browser WebView CORS restrictions and automatically
   * follows Google Apps Script 302 redirects to script.googleusercontent.com.
   */
  @PluginMethod
  public void postJson(PluginCall call) {
    String urlStr = call.getString("url");
    String data = call.getString("data");
    if (urlStr == null || urlStr.isEmpty()) {
      call.reject("Missing URL parameter");
      return;
    }

    new Thread(() -> {
      HttpURLConnection conn = null;
      try {
        URL url = new URL(urlStr);
        conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(20000);
        conn.setReadTimeout(20000);
        conn.setInstanceFollowRedirects(true);
        conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        conn.setRequestProperty("User-Agent", "BalFin-Android-App");
        conn.setDoOutput(true);

        if (data != null) {
          try (OutputStream os = conn.getOutputStream()) {
            byte[] input = data.getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
          }
        }

        int code = conn.getResponseCode();

        // Follow 302 / 307 / 308 redirects from script.google.com to script.googleusercontent.com if needed
        if (code == HttpURLConnection.HTTP_MOVED_TEMP || code == HttpURLConnection.HTTP_MOVED_PERM || code == 307 || code == 308) {
          String redirectUrl = conn.getHeaderField("Location");
          if (redirectUrl != null && !redirectUrl.isEmpty()) {
            conn.disconnect();
            URL nextUrl = new URL(redirectUrl);
            conn = (HttpURLConnection) nextUrl.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(20000);
            code = conn.getResponseCode();
          }
        }

        JSObject ret = new JSObject();
        ret.put("status", code);
        ret.put("ok", code >= 200 && code < 400);
        call.resolve(ret);
      } catch (Exception e) {
        call.reject("Sync network error: " + e.getMessage());
      } finally {
        if (conn != null) {
          conn.disconnect();
        }
      }
    }).start();
  }
}
