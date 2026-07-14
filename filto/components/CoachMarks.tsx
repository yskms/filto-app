import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

// Expo Go は edge-to-edge 無効、standalone/dev client ビルドは有効。
//  - Expo Go(StoreClient): Modalは非translucent＝ステータスバー下から始まり、
//    measureInWindow(コンテンツ基準)とそのまま一致する → オフセット不要
//  - 本番/dev client(edge-to-edge): Modalは全画面(画面上端基準)になる一方、
//    measureInWindowはコンテンツ基準を返すため、insets.top 分を足して合わせる
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const FULLSCREEN_MODAL = !IS_EXPO_GO;

export type CoachRect = { x: number; y: number; width: number; height: number };

export type CoachStep = {
  /** 対象要素の画面内座標を返す。表示できない場合は null を返すとそのステップはスキップされる */
  measure: () => Promise<CoachRect | null>;
  /** 吹き出しに表示する説明文（太字1本） */
  text: string;
};

const ACCENT = '#0a7ea4';
const DIM = 'rgba(0,0,0,0.72)';
const PAD = 6; // ハイライトの余白
const CARD_GAP = 14; // ハイライトとカードの間隔

interface Props {
  visible: boolean;
  steps: CoachStep[];
  onDone: () => void;
  /** ツアーが次の画面へ続く場合 true。最後のステップのボタンが「完了」ではなく「次へ」になる */
  continues?: boolean;
  /** 表示開始時に最後のステップから始める（前画面から「戻る」で来たとき用） */
  startAtLast?: boolean;
  /** 最初のステップで「戻る」を押したときの処理（前の画面へ戻る）。未指定なら先頭で戻るは出さない */
  onBackBeforeFirst?: () => void;
  /** 指定するとツアーを飛ばす小さな「スキップ」ボタンを出す（再生時のみ渡す想定） */
  onSkip?: () => void;
}

const MIN_TOP = 4; // ハイライト上端の最小位置（オーバーレイ上端での見切れ防止）

export const CoachMarks: React.FC<Props> = ({ visible, steps, onDone, continues = false, startAtLast = false, onBackBeforeFirst, onSkip }) => {
  const { t } = useTranslation();
  const cardBg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const hintColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'background');

  const insets = useSafeAreaInsets();
  // 全画面Modal(edge-to-edge/standalone)では measureInWindow(コンテンツ基準)と
  // Modal内座標(画面上端基準)がステータスバー分ズレるため、その分を足して合わせる。
  // Expo Go(非全画面Modal)ではズレないのでオフセット0。
  const topOffset = FULLSCREEN_MODAL ? insets.top : 0;

  const [index, setIndex] = React.useState(0); // 計測対象（遷移先）
  const [shownIndex, setShownIndex] = React.useState(0); // 実際に表示中のステップ
  const [rect, setRect] = React.useState<CoachRect | null>(null);
  // 最終ステップがどうしても計測できないとき、自動遷移せずハイライト無しで
  // カードだけ中央表示するフォールバック
  const [noHighlight, setNoHighlight] = React.useState(false);
  // カード配置に使う「Modalの座標系の高さ」。全画面Modal(edge-to-edge)は画面全体に
  // 広がるので screen 高さを使う。window 高さだと端末によってはナビバー分小さく、
  // 「上側カード」の bottom 基準がズレてハイライトに重なる（Pixel3等 window<screen 端末）。
  const screenH = (FULLSCREEN_MODAL ? Dimensions.get('screen') : Dimensions.get('window')).height;

  // 「次へ」以外をタップしたときに、押す場所を点滅で誘導する
  const pulse = React.useRef(new Animated.Value(0)).current;
  const triggerPulse = React.useCallback(() => {
    pulse.stopAnimation(() => {
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 130, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    });
  }, [pulse]);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  // ハイライトのリングを常時ゆっくり鼓動させて注目を促す（transform を native
  // driver で動かして滑らかに）。外に膨らむと縁を越えて見切れるので内側へ縮める
  const ringPulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, ringPulse]);
  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });

  // 表示開始時はインデックスをリセット（前画面から戻ってきたときは最後から）。
  // 直前のハイライトは消して暗幕だけの状態にする
  React.useEffect(() => {
    if (visible) {
      const start = startAtLast ? Math.max(0, steps.length - 1) : 0;
      setIndex(start);
      setShownIndex(start);
      setRect(null);
      setNoHighlight(false);
    }
  }, [visible, startAtLast, steps.length]);

  // 現在ステップを計測。遷移直後でレイアウト未確定のときは少し待ってリトライし、
  // それでも計測できないステップ（非表示要素など）はスキップする
  React.useEffect(() => {
    if (!visible) return;
    setNoHighlight(false); // 新しいステップの計測を始めるのでフォールバックは解除
    const cur = steps[index];
    let cancelled = false;
    let attempt = 0;

    const same = (a: CoachRect, b: CoachRect) =>
      Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5 &&
      Math.abs(a.width - b.width) < 1.5 && Math.abs(a.height - b.height) < 1.5;

    // 2回続けて同じ位置を計測できたら「確定」とみなす（遷移アニメ中は位置が
    // 動くので、止まるまで待つ＝暗幕は出たままハイライトだけ遅れて出す）
    const settle = (prev: CoachRect | null) => {
      if (cancelled || !cur) { if (!cur && !cancelled) onDone(); return; }
      cur.measure().then((r) => {
        if (cancelled) return;
        const valid = !!(r && r.width > 0 && r.height > 0);
        if (valid && prev && same(r!, prev)) {
          // 安定 → ハイライトと吹き出しを同時に切り替える
          setRect(r);
          setShownIndex(index);
          return;
        }
        attempt++;
        if (attempt >= 20) {
          if (valid) { setRect(r!); setShownIndex(index); } // 安定しなくても打ち切って表示
          else if (index + 1 < steps.length) setIndex(index + 1); // 計測不可ならスキップ
          else { setShownIndex(index); setNoHighlight(true); } // 最終ステップ：自動遷移せずカードだけ出す
          return;
        }
        setTimeout(() => settle(valid ? r! : null), 70);
      }).catch(() => {});
    };

    // 画面遷移アニメ(push のスライド等)の完了後から計測開始（タブ遷移など
    // アニメが無ければ即実行）
    const handle = InteractionManager.runAfterInteractions(() => settle(null));
    return () => { cancelled = true; handle.cancel(); };
  }, [visible, index, steps, onDone]);

  if (!visible) return null;

  // Modal の statusBarTranslucent は IS_EXPO_GO で出し分ける（上部コメント参照）。
  // 一律付与すると Expo Go 側がステータスバー高さ分ズレるため。

  // rect 未確定（計測中/遷移直後）でも、暗幕だけは即時に出してタップを塞ぐ。
  // フォールバック表示中(noHighlight)はカードを出すのでここでは抜けない
  if (!rect && !noHighlight) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onDone} statusBarTranslucent={FULLSCREEN_MODAL} navigationBarTranslucent={FULLSCREEN_MODAL}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
      </Modal>
    );
  }

  const step = steps[shownIndex];
  if (!step) return null;

  // ボタン操作・進捗・最終判定は「表示中のステップ(shownIndex)」基準にする
  const isLast = shownIndex + 1 >= steps.length;
  const next = () => {
    if (isLast) onDone();
    else setIndex(shownIndex + 1);
  };
  const back = () => {
    if (shownIndex > 0) setIndex(shownIndex - 1);
    else onBackBeforeFirst?.();
  };
  const showBack = shownIndex > 0 || !!onBackBeforeFirst;

  // 説明カード（ハイライト有無の両方で使い回す。pos で位置だけ差し替え）
  const cardNode = (pos: object) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: ACCENT }, pos]}>
      <Text style={[styles.cardText, { color: textColor }]}>
        {/* `*…*` で囲んだ部分だけアクセント色で強調する */}
        {step.text.split('*').map((seg, i) =>
          i % 2 === 1 ? (
            <Text key={i} style={{ color: ACCENT }}>{seg}</Text>
          ) : (
            seg
          )
        )}
      </Text>
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={[styles.progress, { color: hintColor }]}>
            {shownIndex + 1} / {steps.length}
          </Text>
          {onSkip && (
            <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.skip, { color: hintColor }]}>{t('home.tutorialSkip')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.footerRight}>
          {showBack && (
            <TouchableOpacity onPress={back} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.back, { color: hintColor }]}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}
          <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
            <TouchableOpacity onPress={next} style={styles.nextBtn} activeOpacity={0.8}>
              <Text style={styles.nextText}>
                {isLast && !continues ? t('home.tutorialDone') : t('home.tutorialNext')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );

  // フォールバック：位置が取れなかった最終ステップ。全面暗幕＋中央寄りカードのみ
  if (!rect) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onDone} statusBarTranslucent={FULLSCREEN_MODAL} navigationBarTranslucent={FULLSCREEN_MODAL}>
        <Pressable style={StyleSheet.absoluteFill} onPress={triggerPulse}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
        </Pressable>
        {cardNode({ top: screenH * 0.4 })}
      </Modal>
    );
  }

  const hx = rect.x - PAD;
  const hw = rect.width + PAD * 2;
  // 上端がオーバーレイ上端より上に出る分だけ下げる（下端は維持）。
  // 上部のアイコン(更新/スター)の枠が見切れるのを防ぐ。
  // topOffset は全画面Modal時のステータスバー分の座標系ズレ補正（上記コメント参照）。
  const rawTop = rect.y - PAD + topOffset;
  const hy = Math.max(rawTop, MIN_TOP);
  const hh = rect.height + PAD * 2 - (hy - rawTop);

  // ハイライトが画面上寄りなら下に、下寄りなら上にカードを出す
  const below = hy + hh / 2 < screenH * 0.5;
  const cardPos = below
    ? { top: hy + hh + CARD_GAP }
    : { bottom: screenH - hy + CARD_GAP };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone} statusBarTranslucent={FULLSCREEN_MODAL} navigationBarTranslucent={FULLSCREEN_MODAL}>
      {/* 「次へ」以外をタップしたら点滅で誘導（暗幕・ハイライト穴を含め全面で受ける） */}
      <Pressable style={StyleSheet.absoluteFill} onPress={triggerPulse}>
        <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hy) }]} />
        <View pointerEvents="none" style={[styles.dim, { top: hy, left: 0, width: Math.max(0, hx), height: hh }]} />
        <View pointerEvents="none" style={[styles.dim, { top: hy, left: hx + hw, right: 0, height: hh }]} />
        <View pointerEvents="none" style={[styles.dim, { top: hy + hh, left: 0, right: 0, bottom: 0 }]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { top: hy, left: hx, width: hw, height: hh, opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
        />
      </Pressable>

      {/* 説明カード */}
      {cardNode(cardPos)}
    </Modal>
  );
};

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: ACCENT,
    borderRadius: 12,
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  cardText: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: { fontSize: 15 },
  progress: { fontSize: 13 },
  skip: { fontSize: 13, textDecorationLine: 'underline' },
  nextBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  nextText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
