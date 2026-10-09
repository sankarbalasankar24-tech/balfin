package com.balfin.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

/**
 * Floating quick-add bubble: a mint circle hovering over any external app.
 * Default position is along the right lower margin.
 * Size is enlarged to 62dp with transparency adjustment support.
 * Drag to move; tap opens the full-screen transparent QuickAddActivity.
 */
public class QuickAddBubbleService extends Service {
  private static final String CHANNEL_ID = "balfin_quick_add";
  private static final int NOTIF_ID = 4712;

  private WindowManager wm;
  private View bubbleView;
  private boolean viewAdded = false;

  public static volatile boolean running = false;
  private static volatile View activeBubbleView = null;

  public static void updateBubbleAlpha(float alpha) {
    if (activeBubbleView != null) {
      activeBubbleView.post(() -> {
        try {
          activeBubbleView.setAlpha(Math.max(0.2f, Math.min(1.0f, alpha)));
        } catch (Exception ignored) {
        }
      });
    }
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    startForegroundCompat();
    running = true;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (Settings.canDrawOverlays(this)) {
      addBubble();
    }
    return START_STICKY;
  }

  private void addBubble() {
    if (viewAdded || bubbleView != null) return;
    wm = (WindowManager) getSystemService(WINDOW_SERVICE);

    int size = dp(62); // Enlarged comfortable touch target
    DisplayMetrics dm = getResources().getDisplayMetrics();
    int screenWidth = dm.widthPixels;
    int screenHeight = dm.heightPixels;

    // Default position: along the right lower margin
    int defaultX = Math.max(0, screenWidth - size - dp(18));
    int defaultY = Math.max(0, (int) (screenHeight * 0.72f));

    SharedPreferences sp = getSharedPreferences(QuickAddTogglePlugin.PREFS, MODE_PRIVATE);
    int posX = sp.getInt("bubble_x", defaultX);
    int posY = sp.getInt("bubble_y", defaultY);
    float opacity = sp.getFloat("bubble_opacity", 0.90f);

    ImageView bubble = new ImageView(this);
    bubble.setBackgroundResource(R.drawable.quick_add_bubble);
    bubble.setAlpha(Math.max(0.2f, Math.min(1.0f, opacity)));

    WindowManager.LayoutParams params = new WindowManager.LayoutParams(
        size, size,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        PixelFormat.TRANSLUCENT);

    params.gravity = Gravity.TOP | Gravity.START;
    params.x = Math.max(0, Math.min(screenWidth - size, posX));
    params.y = Math.max(0, Math.min(screenHeight - size, posY));

    final float[] downXY = new float[2];
    final boolean[] dragged = { false };

    bubble.setOnTouchListener((v, event) -> {
      switch (event.getActionMasked()) {
        case MotionEvent.ACTION_DOWN:
          downXY[0] = params.x;
          downXY[1] = params.y;
          dragged[0] = false;
          return true;

        case MotionEvent.ACTION_MOVE: {
          float dx = event.getRawX() - downXY[0] - size / 2f;
          float dy = event.getRawY() - downXY[1] - size / 2f;
          if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) {
            dragged[0] = true;
          }
          params.x = Math.max(0, Math.min(screenWidth - size, (int) (downXY[0] + dx)));
          params.y = Math.max(0, Math.min(screenHeight - size, (int) (downXY[1] + dy)));
          try {
            wm.updateViewLayout(bubble, params);
          } catch (Exception ignored) {
          }
          return true;
        }

        case MotionEvent.ACTION_UP:
          if (dragged[0]) {
            sp.edit().putInt("bubble_x", params.x).putInt("bubble_y", params.y).apply();
          } else {
            Intent i = new Intent(QuickAddBubbleService.this, QuickAddActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            try {
              startActivity(i);
            } catch (Exception ignored) {
            }
          }
          return true;

        default:
          return false;
      }
    });

    bubbleView = bubble;
    activeBubbleView = bubble;
    try {
      wm.addView(bubble, params);
      viewAdded = true;
    } catch (Exception e) {
      bubbleView = null;
      activeBubbleView = null;
    }
  }

  private void startForegroundCompat() {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel ch = new NotificationChannel(
          CHANNEL_ID, "Quick add", NotificationManager.IMPORTANCE_MIN);
      ch.setShowBadge(false);
      nm.createNotificationChannel(ch);
    }

    Notification n;
    if (Build.VERSION.SDK_INT >= 26) {
      n = new Notification.Builder(this, CHANNEL_ID)
          .setContentTitle("BalFin quick add ready")
          .setContentText("Tap the floating bubble anywhere to log an entry.")
          .setSmallIcon(android.R.drawable.ic_input_add)
          .setOngoing(true)
          .build();
    } else {
      n = new Notification.Builder(this)
          .setContentTitle("BalFin quick add ready")
          .setSmallIcon(android.R.drawable.ic_input_add)
          .setOngoing(true)
          .build();
    }

    if (Build.VERSION.SDK_INT >= 29) {
      try {
        startForeground(NOTIF_ID, n, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
      } catch (Throwable ignored) {
        startForeground(NOTIF_ID, n);
      }
    } else {
      startForeground(NOTIF_ID, n);
    }
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    running = false;
    activeBubbleView = null;
    if (bubbleView != null && wm != null) {
      try {
        wm.removeView(bubbleView);
      } catch (Exception ignored) {
      }
    }
    bubbleView = null;
    viewAdded = false;
  }

  private int dp(int v) {
    return Math.round(v * getResources().getDisplayMetrics().density);
  }
}
