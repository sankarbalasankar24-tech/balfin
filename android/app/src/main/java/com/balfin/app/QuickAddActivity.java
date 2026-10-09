package com.balfin.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLConnection;

/**
 * Full-screen transparent overlay Activity launched by the floating bubble.
 * Fills the screen with transparent window so the web-rendered modal can display
 * cleanly edge-to-edge (just like the in-app modal in photo 2) without cramped 560dp limits.
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
    w.setDimAmount(0.6f);
    w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    w.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);

    assetLoader = new WebViewAssetLoader.Builder()
        .setDomain("localhost")
        .setHttpAllowed(false)
        .addPathHandler("/", path -> {
          try {
            String cleanPath = path.startsWith("/") ? path.substring(1) : path;
            InputStream is = getAssets().open("public/" + cleanPath);
            String mime = "application/octet-stream";
            if (path.endsWith(".html")) mime = "text/html";
            else if (path.endsWith(".js") || path.endsWith(".mjs")) mime = "application/javascript";
            else if (path.endsWith(".css")) mime = "text/css";
            else if (path.endsWith(".json")) mime = "application/json";
            else if (path.endsWith(".svg")) mime = "image/svg+xml";
            else if (path.endsWith(".png")) mime = "image/png";
            else {
              String guessed = URLConnection.guessContentTypeFromName(path);
              if (guessed != null) mime = guessed;
            }
            return new WebResourceResponse(mime, "utf-8", is);
          } catch (IOException e) {
            return null;
          }
        })
        .build();

    webView = new WebView(this);
    WebSettings s = webView.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    webView.setBackgroundColor(Color.TRANSPARENT);
    webView.addJavascriptInterface(new Bridge(), "BalFinNative");
    webView.setWebViewClient(new AssetLoaderClient());

    ViewGroup.LayoutParams lp = new ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
    );
    setContentView(webView, lp);

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
      view.evaluateJavascript(
          "document.documentElement.style.background='transparent';" +
          "document.body.style.background='transparent';" +
          "if(!window.__balfinCloseHook){window.__balfinCloseHook=1;" +
          "addEventListener('hashchange',function(){" +
          "if(location.hash.indexOf('quick-add')===-1&&window.BalFinNative)BalFinNative.close();});}",
          null);
    }
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
