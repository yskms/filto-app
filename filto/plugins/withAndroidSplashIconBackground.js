const { withAndroidColors, withAndroidColorsNight, withFinalizedMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const LIGHT_COLOR = '#ffffff';
const DARK_COLOR = '#055C71';
const COLOR_NAME = 'splashscreen_icon_bg';

function addOrUpdateColor(colorsXml, name, value) {
  if (!colorsXml.resources.color) colorsXml.resources.color = [];
  const existing = colorsXml.resources.color.find((item) => item.$?.name === name);
  if (existing) {
    existing._ = value;
  } else {
    colorsXml.resources.color.push({ $: { name }, _: value });
  }
  return colorsXml;
}

module.exports = function withAndroidSplashIconBackground(config) {
  // 色リソースの追加（withAndroidColors/Nightは通常通り動作する）
  config = withAndroidColors(config, (c) => {
    c.modResults = addOrUpdateColor(c.modResults, COLOR_NAME, LIGHT_COLOR);
    return c;
  });

  config = withAndroidColorsNight(config, (c) => {
    c.modResults = addOrUpdateColor(c.modResults, COLOR_NAME, DARK_COLOR);
    return c;
  });

  // withFinalizedModは全てのmodが完了した後に確実に実行される
  // expo-splash-screenがstyles.xmlを書き込んだ後にパッチを当てる
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
        /\s*<item name="android:windowSplashScreenIconBackgroundColor">.*?<\/item>/g,
        ''
      );

      // Theme.App.SplashScreen の </style> 直前に挿入
      const updated = content.replace(
        /(<style name="Theme\.App\.SplashScreen"[^>]*>[\s\S]*?)(<\/style>)/,
        (_, before, end) =>
          `${before}    <item name="android:windowSplashScreenIconBackgroundColor">@color/${COLOR_NAME}</item>\n  ${end}`
      );

      if (updated !== content) {
        fs.writeFileSync(stylesPath, updated, 'utf8');
      }

      return c;
    },
  ]);

  return config;
};
