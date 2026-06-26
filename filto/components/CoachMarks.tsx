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
}

const MIN_TOP = 4; // ハイライト上端の最小位置（オーバーレイ上端での見切れ防止）

export const CoachMarks: React.FC<Props> = ({ visible, steps, onDone, continues = false }) => {
  const { t } = useTranslation();
  const cardBg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const hintColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'background');

  const [index, setIndex] = React.useState(0);
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

  // 表示開始時はインデックスをリセット
  React.useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  // 現在ステップ（measureがnullのものは飛ばす）を計測
  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      let i = index;
      while (i < steps.length) {
        // レイアウト確定を待ってから計測
        const r = await steps[i].measure();
        if (r && r.width > 0 && r.height > 0) {
          if (!cancelled) {
            setRect(r);
            if (i !== index) setIndex(i);
          }
          return;
        }
        i++;
      }
      if (!cancelled) onDone();
    })();
    return () => {
      cancelled = true;
    };
    // index/visible が変わるたびに再計測
  }, [visible, index, steps, onDone]);

  if (!visible || !rect) return null;

  const step = steps[index];
  if (!step) return null;

  const hx = rect.x - PAD;
  const hw = rect.width + PAD * 2;
  // 上端がオーバーレイ上端より上に出る分だけ下げる（下端は維持）。
  // 上部のアイコン(更新/スター)の枠が見切れるのを防ぐ
  const rawTop = rect.y - PAD;
  const hy = Math.max(rawTop, MIN_TOP);
  const hh = rect.height + PAD * 2 - (hy - rawTop);

  const isLast = index + 1 >= steps.length;
  const next = () => {
    if (isLast) onDone();
    else setIndex(index + 1);
  };
  const back = () => {
    if (index > 0) setIndex(index - 1);
  };

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
            {index + 1} / {steps.length}
          </Text>
          <View style={styles.footerRight}>
            {index > 0 && (
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
