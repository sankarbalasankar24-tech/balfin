package com.balfin.app;

import android.content.Intent;
import android.net.Uri;
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
    handleIntent(getIntent());
  }

  // Forward balfin:// deep links to the WebView as a URL fragment,
  // e.g. balfin://quick-add -> /#/app/quick-add
  private void handleIntent(Intent intent) {
    if (intent == null) return;
    Uri data = intent.getData();
    if (data != null && "balfin".equals(data.getScheme())) {
      String host = data.getHost() == null ? "" : data.getHost();
      String path = data.getPath() == null ? "" : data.getPath();
      String route = "/" + host + path;
      String existing = bridge != null && bridge.getWebView() != null
          ? bridge.getWebView().getUrl() : null;
      if (existing != null && existing.contains("#")) {
        bridge.getWebView().loadUrl(existing.split("#")[0] + "#" + route);
      } else {
        getOnBackPressedDispatcher(); // no-op touch to ensure bridge ready
        if (bridge != null && bridge.getWebView() != null) {
          bridge.getWebView().loadUrl(
            "file:///android_asset/public/index.html#" + route
          );
        }
      }
    }
  }
}
