package com.balfin.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.database.ContentObserver;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;

/**
 * Volume double-tap quick-add: listens for volume changes through a global
 * ContentObserver (no special permission needed). Two volume-UP presses
 * within 900 ms while the screen is on — from any app — open the transparent
 * QuickAddActivity. Runs as a silent low-importance foreground service that
 * survives task removal and reboots (QuickAddBootReceiver).
 *
 * Limitation: presses that don't change any stream volume (e.g. volume-up at
 * maximum) produce no settings change, so the double-tap is best detected at
 * less-than-maximum volume.
 */
public class VolumeGestureService extends Service {

  private static final String CHANNEL_ID = "balfin_quick_add";
  private static final int NOTIF_ID = 4714;
  private static final long DOUBLE_PRESS_WINDOW_MS = 900;

  /** Set in onCreate/onDestroy so the plugin can report engine status. */
  public static volatile boolean running = false;

  private AudioManager audio;
  private ContentObserver observer;
  private final int[] lastVolumes = new int[] { -1, -1, -1, -1, -1, -1 };
  private long lastUpAt = 0;

  // Streams we watch, in the same order as lastVolumes.
  private static final int[] STREAMS = {
      AudioManager.STREAM_RING,
      AudioManager.STREAM_MUSIC,
      AudioManager.STREAM_NOTIFICATION,
      AudioManager.STREAM_SYSTEM,
      AudioManager.STREAM_ALARM,
      AudioManager.STREAM_VOICE_CALL,
  };

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    startForegroundCompat();
    running = true;

    audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    observer = new ContentObserver(new Handler(Looper.getMainLooper())) {
      @Override
      public void onChange(boolean selfChange) {
        handleVolumeChange();
      }
    };
    // descendants=true: any volume stream write under Settings.System notifies.
    getContentResolver().registerContentObserver(
        Settings.System.CONTENT_URI, true, observer);
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    return START_STICKY;
  }

  private void handleVolumeChange() {
    if (audio == null) return;
    long now = System.currentTimeMillis();

    // Only trigger while the screen is on — no pop-ups over a locked phone.
    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
    if (pm != null && !pm.isInteractive()) {
      snapshotVolumes();
      lastUpAt = 0;
      return;
    }

    boolean sawUp = false;
    for (int i = 0; i < STREAMS.length; i++) {
      int cur;
      try {
        cur = audio.getStreamVolume(STREAMS[i]);
      } catch (Exception e) {
        continue;
      }
      if (lastVolumes[i] >= 0 && cur > lastVolumes[i]) sawUp = true;
      lastVolumes[i] = cur;
    }

    if (!sawUp) return;

    if (now - lastUpAt <= DOUBLE_PRESS_WINDOW_MS) {
      lastUpAt = 0;
      Intent i = new Intent(this, QuickAddActivity.class);
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      try {
        startActivity(i);
      } catch (Exception ignored) {
      }
    } else {
      lastUpAt = now;
    }
  }

  private void snapshotVolumes() {
    for (int i = 0; i < STREAMS.length; i++) {
      try {
        lastVolumes[i] = audio.getStreamVolume(STREAMS[i]);
      } catch (Exception ignored) {
      }
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
          .setContentTitle("BalFin volume quick-add ready")
          .setContentText("Double-press volume-up anywhere to log an entry.")
          .setSmallIcon(android.R.drawable.ic_input_add)
          .setOngoing(true)
          .build();
    } else {
      n = new Notification.Builder(this)
          .setContentTitle("BalFin volume quick-add ready")
          .setSmallIcon(android.R.drawable.ic_input_add)
          .setOngoing(true)
          .build();
    }
    startForeground(NOTIF_ID, n);
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    running = false;
    if (observer != null) {
      try {
        getContentResolver().unregisterContentObserver(observer);
      } catch (Exception ignored) {
      }
    }
  }
}
