import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export type FeedSortType = 
  | 'created_at_desc'
  | 'created_at_asc'
  | 'title_asc'
  | 'title_desc'
  | 'url_asc'
  | 'url_desc';

interface FeedSortModalProps {
  visible: boolean;
  currentSort: FeedSortType;
  onClose: () => void;
  onSelectSort: (sortType: FeedSortType) => void;
}

const SORT_OPTIONS: { type: FeedSortType; label: string }[] = [
  { type: 'created_at_desc', label: '作成日時（新しい順）' },
  { type: 'created_at_asc', label: '作成日時（古い順）' },
  { type: 'title_asc', label: 'フィード名（昇順）' },
  { type: 'title_desc', label: 'フィード名（降順）' },
  { type: 'url_asc', label: 'URL（昇順）' },
  { type: 'url_desc', label: 'URL（降順）' },
];

export const FeedSortModal: React.FC<FeedSortModalProps> = ({
  visible,
  currentSort,
  onClose,
  onSelectSort,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');

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
                並び替え
              </ThemedText>
              
              <View style={styles.optionsList}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={styles.optionItem}
                    onPress={() => handleSelectSort(option.type)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.optionLabel}>
                      {currentSort === option.type && '▶ '}
                      {option.label}
                    </ThemedText>
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
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionLabel: {
    fontSize: 16,
  },
});
