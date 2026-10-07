package com.balfin.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;

/**
 * Shake-to-quick-add: listens to the accelerometer in a minimal foreground
 * service (so it keeps working after the app is swiped away). A sustained
 * strong shake opens the transparent QuickAddActivity.
 */
public class ShakeGestureService extends Service implements SensorEventListener {

  private static final String CHANNEL_ID = "balfin_quick_add";
  private static final int NOTIF_ID = 4713;

  // shake tuning: force threshold, gap between shakes, shakes to trigger
  // (relaxed so lighter shakes register on phones with stiff sensors)
  private static final float SHAKE_THRESHOLD_GRAVITY = 2.4f;
  private static final int SHAKE_SLOP_MS = 350;
  private static final int SHAKE_COUNT_TO_TRIGGER = 2;
  private static final long SHAKE_WINDOW_MS = 1500;

  /** Set in onCreate/onDestroy so the plugin can report engine status. */
  public static volatile boolean running = false;

  private SensorManager sensorManager;
  private Sensor accelerometer;
  private long lastShakeAt = 0;
  private float lastX = 0, lastY = 0, lastZ = 0;
  private int shakeCount = 0;
  private long firstShakeAt = 0;

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    startForegroundCompat();
    running = true;
    sensorManager = (SensorManager) getSystemService(SENSOR_SERVICE);
    if (sensorManager != null) {
      accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
      if (accelerometer != null) {
        // Sensor delay ~60ms sampling; wakes the CPU only while shaking.
        sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
      }
    }
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    return START_STICKY;
  }

  @Override
  public void onSensorChanged(SensorEvent event) {
    if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;
    float x = event.values[0];
    float y = event.values[1];
    float z = event.values[2];

    float gX = x / SensorManager.GRAVITY_EARTH;
    float gY = y / SensorManager.GRAVITY_EARTH;
    float gZ = z / SensorManager.GRAVITY_EARTH;
    float gForce = (float) Math.sqrt(gX * gX + gY * gY + gZ * gZ);

    if (gForce < SHAKE_THRESHOLD_GRAVITY) return;

    long now = System.currentTimeMillis();
    if (now - lastShakeAt < SHAKE_SLOP_MS) return;
    lastShakeAt = now;

    if (now - firstShakeAt > SHAKE_WINDOW_MS) {
      shakeCount = 0;
      firstShakeAt = now;
    }
    shakeCount++;
    if (shakeCount >= SHAKE_COUNT_TO_TRIGGER) {
      shakeCount = 0;
      Intent i = new Intent(this, QuickAddActivity.class);
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      try {
        startActivity(i);
      } catch (Exception ignored) {
      }
    }
  }

  @Override
  public void onAccuracyChanged(Sensor sensor, int accuracy) {
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    running = false;
    if (sensorManager != null) sensorManager.unregisterListener(this);
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
          .setContentTitle("BalFin shake quick-add ready")
          .setSmallIcon(android.R.drawable.ic_input_add)
          .setOngoing(true)
          .build();
    } else {
      n = new Notification.Builder(this)
          .setContentTitle("BalFin shake quick-add ready")
          .setSmallIcon(android.R.drawable.ic_input_add)
          .setOngoing(true)
          .build();
    }
    startForeground(NOTIF_ID, n);
  }
}
