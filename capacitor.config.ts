import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.normalproject.journal",
  appName: "Спасибо много",
  webDir: "android-www",
  server: {
    // Android: https required for crypto.subtle and secure context in WebView
    androidScheme: "https",
    // iOS: do NOT set iosScheme to "http" or "https" — WKWebView reserves them.
    // Capacitor defaults to "capacitor://localhost", which is a secure context.
    // Invalid schemes are silently reset to "capacitor".
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
};

export default config;
