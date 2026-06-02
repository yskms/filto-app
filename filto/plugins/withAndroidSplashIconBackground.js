const { withFinalizedMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

module.exports = function withAndroidSplashIconBackground(config) {
  config = withFinalizedMod(config, [
    'android',
    async (c) => {
      const stylesPath = path.join(
        c.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'values', 'styles.xml'
      );

      if (!fs.existsSync(stylesPath)) return c;

      let content = fs.readFileSync(stylesPath, 'utf8');

      // 既存エントリがあれば削除
      content = content.replace(
        /\s*<item name="(?:android:)?windowSplashScreenIconBackgroundColor">.*?<\/item>/g,
        ''
      );

      // expo-splash-screenが管理するsplashscreen_backgroundを流用する
      // (values/colors.xml=#ffffff, values-night/colors.xml=#055C71 を自動でカバー)
      // compat(prefixなし)とnative(android:あり)の両方を入れ、APIバージョンを問わず効かせる
      // Android 12+(API 31+)のネイティブsplashはandroid:付きframework属性を見るため必須
      const updated = content.replace(
        /(<style name="Theme\.App\.SplashScreen"[^>]*>[\s\S]*?)(<\/style>)/,
        (_, before, end) =>
          `${before}    <item name="windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>\n` +
          `    <item name="android:windowSplashScreenIconBackgroundColor">@color/splashscreen_background</item>\n  ${end}`
      );

      if (updated !== content) {
        fs.writeFileSync(stylesPath, updated, 'utf8');
      }

      return c;
    },
  ]);

  return config;
};
