package com.balfin.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class QuickAddWidgetProvider extends AppWidgetProvider {

  static final String EXTRA_KIND = "kind";

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
    for (int id : appWidgetIds) {
      RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_add);

      Intent expense = new Intent(Intent.ACTION_VIEW,
          Uri.parse("balfin://quick-add?kind=expense"), context, MainActivity.class);
      PendingIntent pExpense = PendingIntent.getActivity(
          context, 1001, expense,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

      Intent income = new Intent(Intent.ACTION_VIEW,
          Uri.parse("balfin://quick-add?kind=income"), context, MainActivity.class);
      PendingIntent pIncome = PendingIntent.getActivity(
          context, 1002, income,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

      views.setOnClickPendingIntent(R.id.widget_btn_expense, pExpense);
      views.setOnClickPendingIntent(R.id.widget_btn_income, pIncome);

      manager.updateAppWidget(id, views);
    }
  }

  @Override
  public void onReceive(Context context, Intent intent) {
    super.onReceive(context, intent);
  }
}
