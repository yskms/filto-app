import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

export type FeedSortType =
  | 'created_at_desc'
  | 'created_at_asc'
  | 'title_asc'
  | 'title_desc'
  | 'url_asc'
  | 'url_desc'
  | 'read_desc'
  | 'read_asc';

interface FeedSortModalProps {
  visible: boolean;
  currentSort: FeedSortType;
  onClose: () => void;
  onSelectSort: (sortType: FeedSortType) => void;
}

export const FeedSortModal: React.FC<FeedSortModalProps> = ({
  visible,
  currentSort,
  onClose,
  onSelectSort,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const tintColor = useThemeColor({}, 'tint');
  const { t } = useTranslation();

  const sortOptions: { type: FeedSortType; label: string }[] = [
    { type: 'created_at_desc', label: t('feeds.sortCreatedDesc') },
    { type: 'created_at_asc', label: t('feeds.sortCreatedAsc') },
    { type: 'read_desc', label: t('feeds.sortReadDesc') },
    { type: 'read_asc', label: t('feeds.sortReadAsc') },
    { type: 'title_asc', label: t('feeds.sortTitleAsc') },
    { type: 'title_desc', label: t('feeds.sortTitleDesc') },
    { type: 'url_asc', label: t('feeds.sortUrlAsc') },
    { type: 'url_desc', label: t('feeds.sortUrlDesc') },
  ];

  const handleSelectSort = (sortType: FeedSortType) => {
    onSelectSort(sortType);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, { backgroundColor }]}>
              <ThemedText style={[styles.title, { borderBottomColor: borderColor }]}>
                {t('common.sort')}
              </ThemedText>

              <View style={styles.optionsList}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={styles.optionItem}
                    onPress={() => handleSelectSort(option.type)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.optionLabel}>{option.label}</ThemedText>
                    {currentSort === option.type && (
                      <Ionicons name="checkmark" size={18} color={tintColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  optionsList: {
    paddingTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionLabel: {
    fontSize: 16,
  },
});
