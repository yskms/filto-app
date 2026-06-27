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
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

export type CoachRect = { x: number; y: number; width: number; height: number };

export type CoachStep = {
  /** 対象要素の画面内座標を返す。表示できない場合は null を返すとそのステップはスキップされる */
  measure: () => Promise<CoachRect | null>;
  title: string;
  desc: string;
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
}

const MIN_TOP = 4; // ハイライト上端の最小位置（オーバーレイ上端での見切れ防止）

export const CoachMarks: React.FC<Props> = ({ visible, steps, onDone, continues = false, startAtLast = false, onBackBeforeFirst }) => {
  const { t } = useTranslation();
  const cardBg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const hintColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'background');

  const [index, setIndex] = React.useState(0); // 計測対象（遷移先）
  const [shownIndex, setShownIndex] = React.useState(0); // 実際に表示中のステップ
  const [rect, setRect] = React.useState<CoachRect | null>(null);
  const { height: screenH } = Dimensions.get('window');

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

  // 表示開始時はインデックスをリセット（前画面から戻ってきたときは最後から）。
  // 直前のハイライトは消して暗幕だけの状態にする
  React.useEffect(() => {
    if (visible) {
      const start = startAtLast ? Math.max(0, steps.length - 1) : 0;
      setIndex(start);
      setShownIndex(start);
      setRect(null);
    }
  }, [visible, startAtLast, steps.length]);

  // 現在ステップを計測。遷移直後でレイアウト未確定のときは少し待ってリトライし、
  // それでも計測できないステップ（非表示要素など）はスキップする
  React.useEffect(() => {
    if (!visible) return;
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
          else onDone();
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

  // rect 未確定（計測中/遷移直後）でも、暗幕だけは即時に出してタップを塞ぐ
  if (!rect) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onDone}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />
      </Modal>
    );
  }

  const step = steps[shownIndex];
  if (!step) return null;

  const hx = rect.x - PAD;
  const hw = rect.width + PAD * 2;
  // 上端がオーバーレイ上端より上に出る分だけ下げる（下端は維持）。
  // 上部のアイコン(更新/スター)の枠が見切れるのを防ぐ
  const rawTop = rect.y - PAD;
  const hy = Math.max(rawTop, MIN_TOP);
  const hh = rect.height + PAD * 2 - (hy - rawTop);

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

  // ハイライトが画面上寄りなら下に、下寄りなら上にカードを出す
  const below = hy + hh / 2 < screenH * 0.5;
  const cardPos = below
    ? { top: hy + hh + CARD_GAP }
    : { bottom: screenH - hy + CARD_GAP };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      {/* 「次へ」以外をタップしたら点滅で誘導（暗幕・ハイライト穴を含め全面で受ける） */}
      <Pressable style={StyleSheet.absoluteFill} onPress={triggerPulse}>
        <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hy) }]} />
        <View pointerEvents="none" style={[styles.dim, { top: hy, left: 0, width: Math.max(0, hx), height: hh }]} />
        <View pointerEvents="none" style={[styles.dim, { top: hy, left: hx + hw, right: 0, height: hh }]} />
        <View pointerEvents="none" style={[styles.dim, { top: hy + hh, left: 0, right: 0, bottom: 0 }]} />
        <View pointerEvents="none" style={[styles.ring, { top: hy, left: hx, width: hw, height: hh }]} />
      </Pressable>

      {/* 説明カード */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: ACCENT }, cardPos]}>
        <Text style={[styles.cardTitle, { color: textColor }]}>{step.title}</Text>
        <Text style={[styles.cardDesc, { color: hintColor }]}>{step.desc}</Text>
        <View style={styles.footer}>
          <Text style={[styles.progress, { color: hintColor }]}>
            {shownIndex + 1} / {steps.length}
          </Text>
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
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  back: { fontSize: 15 },
  progress: { fontSize: 13 },
  nextBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  nextText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
