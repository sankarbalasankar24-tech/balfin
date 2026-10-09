package com.balfin.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Daily Financial Summary: an exact alarm at 21:00 local time fetches the
 * user's Convex data directly and posts a notification with today's spend
 * and any material portfolio shift. Reschedules itself for the next day.
 */
public class DailySummaryReceiver extends BroadcastReceiver {

  public static final String CHANNEL = "balfin_daily_summary";
  private static final int NOTIF_ID = 4714;
  static final String PREFS = "balfin_prefs";
  static final String KEY_SUMMARY_HOUR = "summary_hour";
  static final String KEY_CONVEX_URL = "convex_url";

  @Override
  public void onReceive(Context context, Intent intent) {
    scheduleNext(context); // keep the daily chain alive
    new Thread(() -> {
      try {
        String[] summary = fetchSummary(context);
        post(context, summary[0], summary[1]);
      } catch (Exception e) {
        // silent — a failed summary must never crash or buzz for attention
      }
    }).start();
  }

  static void scheduleNext(Context context) {
    AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (am == null) return;
    Calendar cal = Calendar.getInstance();
    int hour = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getInt(KEY_SUMMARY_HOUR, 21);
    cal.set(Calendar.HOUR_OF_DAY, hour);
    cal.set(Calendar.MINUTE, 0);
    cal.set(Calendar.SECOND, 0);
    if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_YEAR, 1);
    PendingIntent pi = PendingIntent.getBroadcast(
        context, 2001, new Intent(context, DailySummaryReceiver.class),
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    try {
      if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
      } else {
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
      }
    } catch (SecurityException ignored) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
    }
  }

  static void ensureChannel(Context context) {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm != null) {
        nm.createNotificationChannel(new NotificationChannel(
            CHANNEL, "Daily summary", NotificationManager.IMPORTANCE_DEFAULT));
      }
    }
  }

  private void post(Context context, String title, String text) {
    ensureChannel(context);
    Intent open = new Intent(context, MainActivity.class)
        .setAction(Intent.ACTION_VIEW)
        .setData(Uri.parse("balfin://app"));
    PendingIntent pOpen = PendingIntent.getActivity(
        context, 2002, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL)
        .setSmallIcon(android.R.drawable.ic_menu_myplaces)
        .setContentTitle(title)
        .setContentText(text)
        .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
        .setContentIntent(pOpen)
        .setAutoCancel(true);
    NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm != null) nm.notify(NOTIF_ID, b.build());
  }

  /** Queries the Convex deployment for today's transactions + portfolio. */
  private String[] fetchSummary(Context context) throws Exception {
    String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(KEY_CONVEX_URL, "");
    if (raw.isEmpty()) return new String[]{"BalFin", "Daily summary ready — open BalFin."};
    String base = raw.endsWith("/") ? raw : raw + "/";

    // today's local midnight in epoch ms
    Calendar c = Calendar.getInstance();
    c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0);
    c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
    long since = c.getTimeInMillis();

    JSONObject body = new JSONObject()
        .put("path", "transactions:list")
        .put("args", new JSONObject())
        .put("format", "json");
    String resp = post(base + "api/query", body.toString());
    JSONArray rows = new JSONArray(resp);

    double spent = 0, earned = 0;
    int count = 0;
    for (int i = 0; i < rows.length(); i++) {
      JSONObject t = rows.getJSONObject(i);
      long date = t.optLong("date", 0);
      if (date < since) continue;
      String kind = t.optString("kind", "");
      double amt = t.optDouble("amount", 0);
      if ("transfer".equals(kind)) continue;
      count++;
      if ("income".equals(kind)) earned += amt; else spent += amt;
    }

    String line;
    if (count == 0) {
      line = "No entries today. Spend ₹0.";
    } else if (spent > 0 && earned > 0) {
      line = String.format(Locale.US, "Spent ₹%,.0f across %d entries · earned ₹%,.0f.", spent, count, earned);
    } else if (spent > 0) {
      line = String.format(Locale.US, "Spent ₹%,.0f across %d entries.", spent, count);
    } else {
      line = String.format(Locale.US, "Earned ₹%,.0f across %d entries.", earned, count);
    }
    SimpleDateFormat fmt = new SimpleDateFormat("EEE, d MMM", Locale.US);
    return new String[]{"BalFin daily summary — " + fmt.format(new Date()), line};
  }

  private static String line;

  private String post(String urlStr, String json) throws Exception {
    HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
    conn.setRequestMethod("POST");
    conn.setRequestProperty("Content-Type", "application/json");
    conn.setConnectTimeout(8000);
    conn.setReadTimeout(8000);
    conn.setDoOutput(true);
    try (java.io.OutputStream os = conn.getOutputStream()) {
      os.write(json.getBytes("UTF-8"));
    }
    BufferedReader br = new BufferedReader(new InputStreamReader(
        conn.getResponseCode() < 400 ? conn.getInputStream() : conn.getErrorStream(), "UTF-8"));
    StringBuilder sb = new StringBuilder();
    while ((line = br.readLine()) != null) sb.append(line);
    br.close();
    return sb.toString();
  }
}
