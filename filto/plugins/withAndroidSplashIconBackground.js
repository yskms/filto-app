const { withAndroidColors, withAndroidColorsNight, withAndroidStyles } = require('expo/config-plugins');

const COLOR_NAME = 'splashscreen_icon_bg';
const SPLASH_THEME = 'Theme.App.SplashScreen';

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
  // ライトモード: 白背景と同色にして丸を見えなくする
  config = withAndroidColors(config, (c) => {
    c.modResults = addOrUpdateColor(c.modResults, COLOR_NAME, '#ffffff');
    return c;
  });

  // ダークモード: ティール背景と同色にして丸を見えなくする
  config = withAndroidColorsNight(config, (c) => {
    c.modResults = addOrUpdateColor(c.modResults, COLOR_NAME, '#055C71');
    return c;
  });

  // スプラッシュテーマに windowSplashScreenIconBackgroundColor を追加
  config = withAndroidStyles(config, (c) => {
    const styles = c.modResults.resources;
    if (!styles?.style) return c;

    const splashTheme = styles.style.find((s) => s.$?.name === SPLASH_THEME);
    if (splashTheme) {
      if (!splashTheme.item) splashTheme.item = [];
      splashTheme.item = splashTheme.item.filter(
        (item) => item.$?.name !== 'android:windowSplashScreenIconBackgroundColor'
      );
      splashTheme.item.push({
        $: { name: 'android:windowSplashScreenIconBackgroundColor' },
        _: `@color/${COLOR_NAME}`,
      });
    }
    return c;
  });

  return config;
};
