package com.balfin.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

/**
 * Floating quick-add bubble: a small mint circle that hovers over any app.
 * Drag to move; a tap (little movement) opens the transparent QuickAddActivity
 * on top of whatever the user was doing. Runs as a silent low-importance
 * foreground service that is START_STICKY and survives task removal ("clean
 * all") and reboots (QuickAddBootReceiver re-applies the stored gesture).
 *
 * While the "Display over other apps" permission is missing the service stays
 * dormant; the Manage screen restarts it (setGesture) as soon as the user
 * grants access, and the bubble appears without needing an app restart.
 */
public class QuickAddBubbleService extends Service {

  private static final String CHANNEL_ID = "balfin_quick_add";
  private static final int NOTIF_ID = 4712;
  private WindowManager wm;
  private View bubbleView;
  private boolean viewAdded = false;

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    startForegroundCompat();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (Settings.canDrawOverlays(this)) {
      addBubble();
    }
    // START_STICKY: if the system or a task manager kills the service, Android
    // restarts it so the bubble stays available.
    return START_STICKY;
  }

  /** Adds the overlay view once; safe to call on every start. */
  private void addBubble() {
    if (viewAdded || bubbleView != null) return;

    wm = (WindowManager) getSystemService(WINDOW_SERVICE);

    int size = dp(52);
    ImageView bubble = new ImageView(this);
    bubble.setBackgroundResource(R.drawable.quick_add_bubble);

    WindowManager.LayoutParams params = new WindowManager.LayoutParams(
        size, size,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
            | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
        PixelFormat.TRANSLUCENT);
    params.gravity = Gravity.TOP | Gravity.START;
    params.x = dp(12);
    params.y = dp(320);

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
          if (Math.abs(dx) > dp(6) || Math.abs(dy) > dp(6)) dragged[0] = true;
          params.x = Math.max(0, (int) (downXY[0] + dx));
          params.y = Math.max(0, (int) (downXY[1] + dy));
          try {
            wm.updateViewLayout(bubble, params);
          } catch (Exception ignored) {
          }
          return true;
        }
        case MotionEvent.ACTION_UP:
          if (!dragged[0]) {
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
    try {
      wm.addView(bubble, params);
      viewAdded = true;
    } catch (Exception e) {
      bubbleView = null;
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
    startForeground(NOTIF_ID, n);
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
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
