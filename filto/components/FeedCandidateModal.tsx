import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { FeedCandidate } from '@/utils/feedAutodiscovery';

interface FeedCandidateModalProps {
  visible: boolean;
  candidates: FeedCandidate[];
  onSelect: (candidate: FeedCandidate) => void;
  onClose: () => void;
}

/**
 * 自動検出で複数のフィード候補が見つかったときに、どれを登録するか選ばせるモーダル。
 * <link> の title 属性（「カテゴリ:技術」等）を併記して選びやすくする。
 */
export const FeedCandidateModal: React.FC<FeedCandidateModalProps> = ({
  visible,
  candidates,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const iconColor = useThemeColor({}, 'text');
  const subColor = useThemeColor({}, 'tabIconDefault');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.modalContent, { backgroundColor }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>{t('feeds.selectFeedTitle')}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: subColor }]}>
                {t('feeds.selectFeedDescription')}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.listContainer}>
            {candidates.map((c, i) => (
              <TouchableOpacity
                key={`${c.url}_${i}`}
                style={[styles.item, { borderBottomColor: borderColor }]}
                onPress={() => onSelect(c)}
                activeOpacity={0.7}
              >
                <View style={styles.itemText}>
                  <View style={styles.itemTitleRow}>
                    {c.title ? (
                      <ThemedText style={styles.itemTitle} numberOfLines={1}>
                        {c.title}
                      </ThemedText>
                    ) : null}
                    {c.isComment && (
                      <View style={[styles.badge, { borderColor }]}>
                        <ThemedText style={[styles.badgeText, { color: subColor }]}>
                          {t('feeds.commentFeedTag')}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText style={[styles.itemUrl, { color: subColor }]} numberOfLines={1}>
                    {c.url}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={borderColor} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  listContainer: {
    flexGrow: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  itemUrl: {
    fontSize: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
  },
});
