import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

/**
 * 同じサイトの記事を続けて非表示にしたときに出す「このサイトごと非表示にしませんか？」の提案。
 * 押し付けない設計: 勝手に消さず提案するだけ。「あとで」で断ればしばらく再提案しない。
 */
export default function SiteHideSuggestModal({
  visible,
  feedName,
  onHide,
  onDismiss,
}: {
  visible: boolean;
  feedName: string;
  onHide: () => void;
  onDismiss: () => void;
}) {
  const cardBg = useThemeColor({ light: '#ffffff', dark: '#1c1d1f' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss}>
        {/* カード内タップでは閉じない */}
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: cardBg }]}>
          <Ionicons name="eye-off-outline" size={40} color={subtextColor} style={styles.icon} />
          <ThemedText style={[styles.title, { color: textColor }]}>
            {t('home.suggestHideSiteTitle')}
          </ThemedText>
          <ThemedText style={[styles.body, { color: subtextColor }]}>
            {t('home.suggestHideSiteBody', { name: feedName })}
          </ThemedText>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: tintColor }]}
            onPress={onHide}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <ThemedText style={styles.primaryText}>{t('home.suggestHideSiteConfirm')}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <ThemedText style={[styles.secondaryText, { color: subtextColor }]}>
              {t('home.suggestHideSiteLater')}
            </ThemedText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
