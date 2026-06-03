const { withFinalizedMod } = require('expo/config-plugins');
const path = require('path');
const fs = require('fs');

const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];

// expo-splash-screenは生成するsplashscreen_logo.pngにbackgroundColor(#ffffff)を
// 焼き込んでしまう（元画像は透明なのに不透明白になる）。Android 12+はこのアイコンを
// 円形クリップして表示するため、ダークモードでは緑背景に白い円として見える。
//
// 対策: 事前に用意した透明背景版(assets/splash-logo/<density>.png)で各密度の
// splashscreen_logo.pngを上書きする。円形クリップされても背景が透けるので、
// windowSplashScreenBackgroundのライト(白)/ダーク(緑)切り替えがそのまま見える。
//
// ※EASビルド環境にImageMagick等が無くても動くよう、生成済みPNGをコピーする方式。
module.exports = function withAndroidSplashIconBackground(config) {
  config = withFinalizedMod(config, [
    'android',
    async (c) => {
      const resDir = path.join(
        c.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res'
      );
      const srcDir = path.join(c.modRequest.projectRoot, 'assets', 'splash-logo');

      for (const d of DENSITIES) {
        const src = path.join(srcDir, `${d}.png`);
        const dest = path.join(resDir, `drawable-${d}`, 'splashscreen_logo.png');
        if (fs.existsSync(src) && fs.existsSync(path.dirname(dest))) {
          fs.copyFileSync(src, dest);
        }
      }

      return c;
    },
  ]);

  return config;
};
