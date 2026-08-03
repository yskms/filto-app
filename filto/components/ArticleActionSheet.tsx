import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

interface ArticleActionSheetProps {
  visible: boolean;
  title: string;
  feedName: string;
  onClose: () => void;
  onHideArticle: () => void;
  onHideSite: () => void;
}

/**
 * 記事の長押しで開くコンテキストメニュー（ボトムシート）。
 * 「この記事を非表示」「このサイトを非表示」を提供する。お気に入りは左スワイプに割り当て済み。
 */
export const ArticleActionSheet: React.FC<ArticleActionSheetProps> = ({
  visible,
  title,
  feedName,
  onClose,
  onHideArticle,
  onHideSite,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const textColor = useThemeColor({}, 'text');
  const subtextColor = useThemeColor({}, 'icon');
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheetWrapper}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheet, { backgroundColor, paddingBottom: insets.bottom + 8 }]}>
              <ThemedText style={[styles.title, { borderBottomColor: borderColor }]} numberOfLines={2}>
                {title}
              </ThemedText>

              <TouchableOpacity style={styles.option} onPress={onHideArticle} activeOpacity={0.7}>
                <Ionicons name="eye-off-outline" size={22} color={textColor} style={styles.optionIcon} />
                <ThemedText style={styles.optionLabel}>{t('home.hideThisArticle')}</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.option} onPress={onHideSite} activeOpacity={0.7}>
                <Ionicons name="eye-off" size={22} color={textColor} style={styles.optionIcon} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.optionLabel}>{t('home.hideThisSite')}</ThemedText>
                  <Text style={[styles.optionSub, { color: subtextColor }]} numberOfLines={1}>
                    {feedName}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.option, styles.cancel, { borderTopColor: borderColor }]} onPress={onClose} activeOpacity={0.7}>
                <ThemedText style={styles.cancelLabel}>{t('common.cancel')}</ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  cancel: {
    borderTopWidth: 1,
    marginTop: 4,
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
