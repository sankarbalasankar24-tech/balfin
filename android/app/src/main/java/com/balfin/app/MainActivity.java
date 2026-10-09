package com.balfin.app;

import android.content.Intent;
import android.content.SharedPreferences;
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
    // Capacitor requires custom plugins to be registered BEFORE
    // super.onCreate — the bridge is built during that call and plugins
    // registered after it never reach the WebView (no bubble, no prompts).
    registerPlugin(QuickAddTogglePlugin.class);
    registerPlugin(SecurityPlugin.class);
    super.onCreate(savedInstanceState);
    // Hand the WebView's Convex URL to the daily summary notifier and arm
    // the 21:00 exact alarm (idempotent — re-arms every launch).
    if (bridge != null && bridge.getWebView() != null) {
      bridge.getWebView().post(() -> {
        if (bridge == null || bridge.getWebView() == null) return;
        bridge.getWebView().evaluateJavascript(
            "(function(){try{return localStorage.getItem('balfin.convexUrl')||"+
            "localStorage.getItem('balfin.convexUrlSaved')||''}catch(e){return ''}})()",
            value -> {
              String url = value == null ? "" : value.replaceAll("^\\\"|\\\"$", "");
              if (!url.isEmpty()) {
                SharedPreferences.Editor ed = getSharedPreferences(
                    QuickAddTogglePlugin.PREFS, MODE_PRIVATE).edit();
                ed.putString(DailySummaryReceiver.KEY_CONVEX_URL, url);
                ed.apply();
              }
              DailySummaryReceiver.scheduleNext(this);
            });
      });
    }
    handleIntent(getIntent());
  }

  private boolean lockChecked = false;

  @Override
  public void onResume() {
    super.onResume();
    gateBiometric();
  }

  /** Biometric app lock: blur + prompt on every resume while enabled. */
  private void gateBiometric() {
    boolean enabled = getSharedPreferences(SecurityPlugin.PREFS, MODE_PRIVATE)
        .getBoolean(SecurityPlugin.KEY_LOCK, false);
    if (!enabled || bridge == null || bridge.getWebView() == null) return;
    bridge.getWebView().setAlpha(0f);
    lockChecked = false;
    androidx.fragment.app.FragmentActivity activity = this;
    androidx.core.content.ContextCompat.getMainExecutor(this).execute(() -> {
      androidx.biometric.BiometricManager bm = androidx.biometric.BiometricManager.from(this);
      int code = bm.canAuthenticate(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK);
      if (code != androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS) {
        bridge.getWebView().setAlpha(1f); // no biometrics enrolled — don't lock out
        lockChecked = true;
        return;
      }
      androidx.biometric.BiometricPrompt prompt = new androidx.biometric.BiometricPrompt(
          activity,
          androidx.core.content.ContextCompat.getMainExecutor(this),
          new androidx.biometric.BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(androidx.biometric.BiometricPrompt.AuthenticationResult result) {
              bridge.getWebView().animate().alpha(1f).setDuration(180).start();
              lockChecked = true;
            }

            @Override
            public void onAuthenticationError(int errCode, CharSequence errString) {
              // Restore WebView alpha so user can enter PIN or retry in the security gate
              if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().setAlpha(1f);
              }
              lockChecked = true;
            }
          });
      androidx.biometric.BiometricPrompt.PromptInfo info =
          new androidx.biometric.BiometricPrompt.PromptInfo.Builder()
              .setTitle("Unlock BalFin")
              .setSubtitle("Your financial data is private")
              .setAllowedAuthenticators(
                  androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK)
              .build();
      prompt.authenticate(info);
    });
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
