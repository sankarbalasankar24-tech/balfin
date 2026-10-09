package com.balfin.app;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

/**
 * Privacy & security bridge: biometric (fingerprint / face) app lock backed
 * by Android's BiometricPrompt. The JS layer calls setLockEnabled; the
 * activity gate prompts on every app resume while enabled.
 */
@CapacitorPlugin(name = "BalFinSecurity")
public class SecurityPlugin extends Plugin {

  public static final String PREFS = "balfin_prefs";
  public static final String KEY_LOCK = "biometric_lock";

  @PluginMethod
  public void setLockEnabled(PluginCall call) {
    boolean enabled = call.getBoolean("enabled", false);
    getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().putBoolean(KEY_LOCK, enabled).apply();
    call.resolve();
  }

  @PluginMethod
  public void isLockEnabled(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("enabled", getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getBoolean(KEY_LOCK, false));
    call.resolve(ret);
  }

  @PluginMethod
  public void canAuthenticate(PluginCall call) {
    JSObject ret = new JSObject();
    BiometricManager bm = BiometricManager.from(getContext());
    int code = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
    ret.put("available", code == BiometricManager.BIOMETRIC_SUCCESS);
    call.resolve(ret);
  }

  /** Shows the system biometric dialog; resolves { ok: true/false }. */
  @PluginMethod
  public void authenticate(PluginCall call) {
    FragmentActivity activity = (FragmentActivity) bridge.getActivity();
    Executor executor = ContextCompat.getMainExecutor(getContext());
    BiometricPrompt prompt = new BiometricPrompt(activity, executor,
        new BiometricPrompt.AuthenticationCallback() {
          @Override
          public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
            if (call != null && !call.isReleased()) {
              JSObject ret = new JSObject();
              ret.put("ok", true);
              call.resolve(ret);
            }
          }

          @Override
          public void onAuthenticationError(int errCode, @NonNull CharSequence errString) {
            if (call != null && !call.isReleased()) {
              JSObject ret = new JSObject();
              ret.put("ok", false);
              ret.put("error", String.valueOf(errString));
              call.resolve(ret);
            }
          }
        });
    BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
        .setTitle("Unlock BalFin")
        .setSubtitle("Your financial data is private")
        .setAllowedAuthenticators(
            BiometricManager.Authenticators.BIOMETRIC_WEAK
                | BiometricManager.Authenticators.DEVICE_CREDENTIAL)
        .build();
    prompt.authenticate(info);
  }
}
