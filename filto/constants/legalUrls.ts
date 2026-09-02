/**
 * 法務文書のURL。
 *
 * App Store Reviewガイドライン3.1.2は、自動更新サブスクリプションを提供するアプリに
 * **アプリ本体とストアのメタデータの両方**で、サブスクリプションの名称・期間・価格と、
 * 利用規約（EULA）・プライバシーポリシーへの機能するリンクを示すことを求めている。
 * v1.5.0のiOS審査は、説明文にEULAリンクが無いことを理由に自動リジェクトされた。
 */

/**
 * Appleの標準EULA。独自のEULAを用意していないため標準を使う。
 * ※ 独自EULAに切り替える場合は App Store Connect 側にも登録が必要。
 */
export const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/** プライバシーポリシー（GitHub Pagesで公開。App Store Connectの登録先と同一） */
export const PRIVACY_POLICY_URL = 'https://yskms.github.io/filto-app/privacy-policy';
