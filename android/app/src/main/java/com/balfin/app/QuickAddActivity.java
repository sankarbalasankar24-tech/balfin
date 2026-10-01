package com.balfin.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;

/**
 * Transparent activity launched by the floating bubble / shake gesture.
 * Serves the app's own bundled assets on the same https://localhost origin as
 * the main app (so localStorage — Convex URL, theme, autosuggest memory — is
 * shared) and points the WebView straight at #/app/quick-add: the identical
 * shared quick-entry sheet (Convex write + Sheets sync + suggestions).
 * Dismiss returns the user to whatever they were doing.
 */
public class QuickAddActivity extends Activity {

  private WebView webView;
  private WebViewAssetLoader assetLoader;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Window w = getWindow();
    w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
    w.setDimAmount(0.5f);

    // Same origin + same asset root as Capacitor's local server
    // (https://localhost/index.html -> assets/public/index.html).
    assetLoader = new WebViewAssetLoader.Builder()
        .setDomain("localhost")
        .setHttpAllowed(false)
        .addPathHandler("/", path -> {
          try {
            InputStream is = getAssets().open("public" + path);
            String mime = URLConnection.guessContentTypeFromName(path);
            if (mime == null) mime = "application/octet-stream";
            return new WebResourceResponse(mime, null, is);
          } catch (IOException e) {
            return null;
          }
        })
        .build();

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(android.view.Gravity.BOTTOM);
    root.setOnClickListener(v -> finish()); // tap the scrim = dismiss

    webView = new WebView(this);
    WebSettings s = webView.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true); // shared localStorage with the main app
    webView.setBackgroundColor(Color.TRANSPARENT);
    webView.addJavascriptInterface(new Bridge(), "BalFinNative");
    webView.setWebViewClient(new AssetLoaderClient());

    LinearLayout card = new LinearLayout(this);
    card.setOrientation(LinearLayout.VERTICAL);
    card.setBackground(makeCardBg());
    int pad = dp(16);
    card.setPadding(pad, pad, pad, pad);

    TextView title = new TextView(this);
    title.setText("BalFin — Quick Entry");
    title.setTextSize(16);
    title.setTypeface(null, android.graphics.Typeface.BOLD);
    title.setTextColor(0xFFDAE2FD);
    card.addView(title);

    LinearLayout.LayoutParams webLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, dp(560));
    card.addView(webView, webLp);

    LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    int side = dp(6);
    cardLp.setMargins(side, dp(28), side, dp(6));
    root.addView(card, cardLp);
    setContentView(root);

    webView.loadUrl("https://localhost/index.html#/app/quick-add");
  }

  class AssetLoaderClient extends WebViewClient {
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
      return assetLoader.shouldInterceptRequest(request.getUrl());
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
      return false;
    }

    @Override
    public void onPageFinished(WebView view, String url) {
      // blend the page into the card (page background is the sheet itself)
      view.evaluateJavascript(
          "document.documentElement.style.background='transparent';" +
          "document.body.style.background='transparent';" +
          "var h=document.querySelector('header');if(h)h.style.display='none';" +
          "var n=document.querySelector('nav');if(n)n.style.display='none';" +
          "var f=document.querySelector('.fixed.bottom-24');if(f)f.style.display='none';",
          null);
    }
  }

  private android.graphics.drawable.GradientDrawable makeCardBg() {
    float r = dp(24);
    android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable();
    g.setColor(0xFF131B2E);
    g.setCornerRadii(new float[]{ r, r, r, r, 0, 0, 0, 0 });
    return g;
  }

  private int dp(int v) {
    return Math.round(v * getResources().getDisplayMetrics().density);
  }

  class Bridge {
    @JavascriptInterface
    public void close() {
      runOnUiThread(() -> finish());
    }
  }

  @Override
  public void onBackPressed() {
    finish();
  }

  @Override
  protected void onDestroy() {
    if (webView != null) {
      webView.loadUrl("about:blank");
      webView.destroy();
    }
    super.onDestroy();
  }

  @Override
  public void finish() {
    super.finish();
    overridePendingTransition(0, 0);
  }
}
