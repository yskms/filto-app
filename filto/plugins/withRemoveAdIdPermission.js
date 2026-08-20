const { withAndroidManifest } = require('expo/config-plugins');

const AD_ID_PERMISSION = 'com.google.android.gms.permission.AD_ID';

// react-native-google-mobile-ads (Google Mobile Ads SDK) がAndroidマニフェストに
// AD_IDパーミッションを自動追加する。Filtoは非パーソナライズ広告のみを配信し、
// 広告IDを使わない方針のため、マニフェストマージャーで明示的に除外する。
// これが「広告はあるがトラッキングはしない」の技術的な裏付けの一部となる。
// 設計: docs/01_requirements/01_monetization_plan.md §4.1
module.exports = function withRemoveAdIdPermission(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const alreadyPresent = manifest['uses-permission'].some(
      (p) => p.$ && p.$['android:name'] === AD_ID_PERMISSION
    );

    if (!alreadyPresent) {
      manifest['uses-permission'].push({
        $: {
          'android:name': AD_ID_PERMISSION,
          'tools:node': 'remove',
        },
      });
    }

    return config;
  });
};
