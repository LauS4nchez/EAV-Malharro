package com.example.eavmalharro;

import android.os.Build;
import android.os.Bundle;
import android.content.Context;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Limite superior de densidad que acepta tu app (evita "pantalla gigante" del sistema)
    private static final int MAX_DPI = 440;

    // --- Clamp temprano de fontScale y densityDpi ---
    @Override
    protected void attachBaseContext(Context newBase) {
        Context fixed = fixConfig(newBase);
        super.attachBaseContext(fixed);
    }

    private Context fixConfig(Context context) {
        Resources res = context.getResources();
        Configuration cfg = new Configuration(res.getConfiguration());

        // No heredamos el tamaño de fuente del sistema
        if (cfg.fontScale != 1f) {
            cfg.fontScale = 1f;
        }

        // No heredamos zoom de pantalla excesivo
        if (cfg.densityDpi > MAX_DPI) {
            cfg.densityDpi = MAX_DPI;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            return context.createConfigurationContext(cfg);
        } else {
            // Legacy
            res.updateConfiguration(cfg, res.getDisplayMetrics());
            return context;
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings s = webView.getSettings();

        // --- Render consistente ---
        s.setTextZoom(100);                 // no texto agrandado por sistema
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);

        // --- Requisitos típicos para OAuth en WebView (Discord) ---
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        // Necesario para manejar window.open / popups (p.ej., OAuth)
        webView.setWebChromeClient(new WebChromeClient());
    }

    // Clamp también cuando el sistema vuelva a pedir Resources durante runtime
    @Override
    public Resources getResources() {
        Resources res = super.getResources();
        Configuration cfg = new Configuration(res.getConfiguration());

        if (cfg.fontScale != 1f) {
            cfg.fontScale = 1f;
        }
        if (cfg.densityDpi > MAX_DPI) {
            cfg.densityDpi = MAX_DPI;
        }

        res.updateConfiguration(cfg, res.getDisplayMetrics());
        return res;
    }
}
