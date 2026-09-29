package com.balfin.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QuickAdd")
public class QuickAddTogglePlugin extends Plugin {

  @PluginMethod
  public void setEnabled(PluginCall call) {
    Boolean enabled = call.getBoolean("enabled");
    if (enabled == null) {
      call.reject("enabled is required");
      return;
    }
    getContext()
        .getSharedPreferences("balfin_prefs", Context.MODE_PRIVATE)
        .edit()
        .putBoolean("quick_add_enabled", enabled)
        .apply();

    Intent i = new Intent(getContext(), QuickAddNotificationService.class);
    try {
      if (enabled) {
        if (Build.VERSION.SDK_INT >= 26) {
          getContext().startForegroundService(i);
        } else {
          getContext().startService(i);
        }
      } else {
        i.setAction(QuickAddNotificationService.ACTION_STOP);
        getContext().startService(i);
      }
      call.resolve();
    } catch (Exception e) {
      call.reject("failed: " + e.getMessage());
    }
  }
}
