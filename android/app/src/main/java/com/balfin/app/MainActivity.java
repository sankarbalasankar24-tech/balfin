package com.balfin.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    handleIntent(intent);
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(QuickAddTogglePlugin.class);
    maybeStartQuickAddService();
    handleIntent(getIntent());
  }

  // Restore the persistent quick-add notification on app launch (it also
  // survives reboots via QuickAddBootReceiver). Default: enabled.
  private void maybeStartQuickAddService() {
    boolean enabled = getSharedPreferences("balfin_prefs", MODE_PRIVATE)
        .getBoolean("quick_add_enabled", true);
    if (!enabled) return;
    try {
      Intent svc = new Intent(this, QuickAddNotificationService.class);
      if (Build.VERSION.SDK_INT >= 26) {
        startForegroundService(svc);
      } else {
        startService(svc);
      }
    } catch (Exception ignored) {
    }
    // Android 13+ needs the runtime notification permission.
    if (Build.VERSION.SDK_INT >= 33
        && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
    }
  }

  // Forward balfin:// deep links to the WebView as a URL fragment,
  // e.g. balfin://quick-add?kind=expense -> /#/app/quick-add?kind=expense
  private void handleIntent(Intent intent) {
    if (intent == null) return;
    Uri data = intent.getData();
    if (data != null && "balfin".equals(data.getScheme())) {
      String host = data.getHost() == null ? "" : data.getHost();
      String path = data.getPath() == null ? "" : data.getPath();
      String route = "/" + host + path;
      String existing = bridge != null && bridge.getWebView() != null
          ? bridge.getWebView().getUrl() : null;
      // Reuse the current origin so localStorage (theme, deployment URL)
      // stays intact — never fall back to file://.
      String base = existing != null
          ? existing.split("#")[0]
          : "https://localhost/index.html";
      if (bridge != null && bridge.getWebView() != null) {
        bridge.getWebView().loadUrl(base + "#" + route);
      }
    }
  }
}
