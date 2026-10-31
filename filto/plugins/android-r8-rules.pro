# R8の最適化（proguard-android-optimize.txt）を有効にしたときに必要な、このアプリ固有のkeepルール。
# plugins/withAndroidR8.js が android/app/ へコピーし、build.gradle の proguardFiles に足す。
# 経緯と確認方法は docs/03_dev_plan/01_wbs.md「Android R8（難読化）の有効化」。

# --- Expo の注釈インターフェース ---
# Expo Modules は、実行時に注釈のメンバーを読む。
#   - expo.modules.kotlin.records.Field          : Record変換（RecordTypeConverter、JSTypeConverterHelper）が
#                                                  `fieldAnnotation.key` を読む
#   - expo.modules.kotlin.records.Required       : 同じく有無を読む
#   - expo.modules.kotlin.services.ServiceInterface : ServicesRegistry が `clazz` を読む
# これらは注釈インターフェースで、プログラム内に実装クラスが無い（実体は実行時にAndroidのランタイムが動的Proxyとして作る）。
# 最適化が有効だと、R8は「実体の無い型のメソッド呼び出し」と判断し、呼び出しを `throw null` に
# 置き換えることがある。Field で実際に起き、Recordを引数に取るネイティブ関数が、リリースビルドだけで
# NullPointerException になり、起動直後にアプリが落ちた（別のExpo 57のアプリ retracks で、エミュレータで確認。
# -dontoptimize のときは起きない。Expoのテンプレートは -dontoptimize なので、Expo標準の構成では表に出ない）。
# ServiceInterface は、呼び出しが残っていて壊れていなかったが、なぜ壊れないのかは確かめられていない。
# 同種の不具合を未然に防ぐため、個別に列挙せず、Expoの注釈インターフェースをまとめて残す
# （残るのは小さな注釈クラスだけで、難読化・最適化・縮小の率への影響はごくわずか）。
-keep @interface expo.modules.** { *; }

# --- Expo の HeadlessAppLoader（Filto固有。参考にした3アプリでは出ない） ---
# expo-modules-core の AndroidManifest.xml は、meta-data（org.unimodules.core.AppLoader#react-native-headless）
# にクラス名の「文字列」だけを持つ。AppLoaderProvider が Class.forName で読み、getDeclaredConstructor(Context)
# で生成する。コードのどこからも静的に参照されないので、R8 は未使用とみなしてクラスごと削除する
# （AGP がマニフェストから自動で残すのは Activity・Service などのコンポーネントだけで、meta-data の値は対象外。
# expo-modules-core の consumer ルールにも無い）。
# 使うのは expo-task-manager の TaskService で、アプリのプロセスが落ちている間に expo-background-task
# （BackgroundSync.ts）が起動されたとき、ヘッドレスでJSを立ち上げるのに必要。削除されると、クラッシュはせず
# logcat に `Cannot initialize app loader` / `ClassNotFoundException` が出るだけで、その経路の同期が
# 静かに失敗する（エミュレータのリリースビルドで確認）。
-keep class expo.modules.adapters.react.apploader.RNHeadlessAppLoader { *; }

# --- expo-task-manager（Filto固有） ---
# expo-task-manager は android/proguard-rules.pro（`-keep class expo.modules.taskManager.** {*;}`）を
# 同梱しているが、android/build.gradle に consumerProguardFiles の指定が無く、アプリのビルドに入らない
# （同梱ルールを持つ他のパッケージ、expo-background-task・expo-modules-core・expo-updates などは指定している）。
# そのため R8 が TaskService・TaskManagerUtils・Task を改名・最適化していた（mapping.txt で確認）。
# TaskService は保存済みのタスクを Class.forName で復元し（restoreTasks）、ヘッドレス実行の入口でもあるので、
# ライブラリ作者の前提（パッケージごと残す）に合わせる。壊れてもクラッシュせず、同期が静かに失敗する種類の箇所。
# 上流が consumerProguardFiles を指定するようになったら、このルールは外してよい。
-keep class expo.modules.taskManager.** { *; }
