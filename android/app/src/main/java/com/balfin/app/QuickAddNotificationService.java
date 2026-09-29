package com.balfin.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;

/**
 * Keeps a persistent, silent notification in the tray with two quick-add
 * actions (expense / income). Tapping an action deep-links into BalFin and
 * opens the entry sheet pre-filled with that kind — the fastest reliable
 * "quick add without hunting for the app" flow on modern Android.
 */
public class QuickAddNotificationService extends Service {

  static final String CHANNEL_ID = "balfin_quick_add";
  static final String ACTION_STOP = "com.balfin.app.QUICK_ADD_STOP";
  private static final int NOTIFICATION_ID = 4711;

  @Override
  public void onCreate() {
    super.onCreate();
    Notification n = buildNotification();
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
    } else {
      startForeground(NOTIFICATION_ID, n);
    }
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && ACTION_STOP.equals(intent.getAction())) {
      stopSelf();
      return START_NOT_STICKY;
    }
    return START_STICKY;
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  private Notification buildNotification() {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        "Quick add",
        NotificationManager.IMPORTANCE_LOW);
    channel.setDescription("Persistent quick-add controls for BalFin");
    channel.setShowBadge(false);
    nm.createNotificationChannel(channel);

    Intent expense = new Intent(Intent.ACTION_VIEW,
        Uri.parse("balfin://quick-add?kind=expense"), this, MainActivity.class);
    PendingIntent pExpense = PendingIntent.getActivity(
        this, 2001, expense,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Intent income = new Intent(Intent.ACTION_VIEW,
        Uri.parse("balfin://quick-add?kind=income"), this, MainActivity.class);
    PendingIntent pIncome = PendingIntent.getActivity(
        this, 2002, income,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Intent open = new Intent(Intent.ACTION_VIEW,
        Uri.parse("balfin://open"), this, MainActivity.class);
    PendingIntent pOpen = PendingIntent.getActivity(
        this, 2003, open,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Notification.Builder builder;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder = new Notification.Builder(this, CHANNEL_ID);
    } else {
      builder = new Notification.Builder(this);
    }
    // IMPORTANCE_LOW channel (created above) keeps the notification silent.
    builder
        .setSmallIcon(android.R.drawable.ic_menu_add)
        .setContentTitle("BalFin quick add")
        .setContentText("Log an expense or income in seconds")
        .setOngoing(true)
        .setContentIntent(pOpen)
        .addAction(new Notification.Action.Builder(null, "− Expense", pExpense).build())
        .addAction(new Notification.Action.Builder(null, "+ Income", pIncome).build());
    return builder.build();
  }
}
