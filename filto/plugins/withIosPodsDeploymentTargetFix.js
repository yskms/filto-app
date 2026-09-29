const { withPodfile } = require('expo/config-plugins');

// Xcode 27 (iOS 27 SDK) は IPHONEOS_DEPLOYMENT_TARGET が15.0未満のターゲットの
// ビルドを拒否する（"the range of supported deployment target versions is
// 15.0 to 27.0.x"）。Filto自体はPodfile先頭の `platform :ios, ...` で
// `podfile_properties['ios.deploymentTarget'] || '15.1'` を指定しているが、
// 一部のPodのリソースバンドルターゲット（例: SDWebImage, RevenueCat,
// react-native-google-mobile-ads配下のGoogleUserMessagingPlatform/
// GoogleMobileAdsResources, RNCAsyncStorage, ReachabilitySwift）が
// 個別に古い値(9.0〜13.4等)を指定しており、これらはXcode 27で単独にビルド不能になる。
// react_native_post_install（RN本体側）はこの調整を行わないため、post_installで
// プロジェクト全体の最小値未満のターゲットを一律で引き上げる。
//
// 最小値はJS側に定数として持たず、Podfile先頭と同じ
// `podfile_properties['ios.deploymentTarget'] || '15.1'` という式をRubyコード上で
// 再利用している。Podfile先頭の値を変更しても、この後処理は常に追随する。
//
// ios/ は expo prebuild の自動生成物（gitignore対象）のため、この対応を
// ios/Podfile へ直接書き込んでも次のprebuildで消える。変更は必ずこのプラグイン側に
// 加えること。詳細: CLAUDE.md「iOS 27 (UIScene) 対応」

const PATCH_MARKER = '# __withIosPodsDeploymentTargetFix_patched__';

const REACT_NATIVE_POST_INSTALL_CALL = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end`;

const REACT_NATIVE_POST_INSTALL_CALL_WITH_FIX = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    ${PATCH_MARKER}
    # Podfile先頭の \`platform :ios, ...\` と同じ式で最小値を求める（常に同期させるため）。
    min_deployment_target = podfile_properties['ios.deploymentTarget'] || '15.1'
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        deployment_target = build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if deployment_target && Gem::Version.new(deployment_target) < Gem::Version.new(min_deployment_target)
          build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_deployment_target
        end
      end
    end
  end`;

function patchPodfile(contents) {
  if (contents.includes(PATCH_MARKER)) {
    return contents; // 既にパッチ済み（expo prebuildの再実行など）
  }

  const patched = contents.replace(REACT_NATIVE_POST_INSTALL_CALL, REACT_NATIVE_POST_INSTALL_CALL_WITH_FIX);
  if (patched === contents) {
    throw new Error(
      'withIosPodsDeploymentTargetFix: Podfile内の react_native_post_install 呼び出しの' +
        'パターンが見つかりませんでした。Expoのテンプレートが変わった可能性があるため ' +
        'plugins/withIosPodsDeploymentTargetFix.js を確認してください。'
    );
  }

  return patched;
}

module.exports = function withIosPodsDeploymentTargetFix(config) {
  return withPodfile(config, (config) => {
    config.modResults.contents = patchPodfile(config.modResults.contents);
    return config;
  });
};
