import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';

export type FilterSortType = 
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'block_keyword_asc'
  | 'block_keyword_desc';

interface FilterSortModalProps {
  visible: boolean;
  currentSort: FilterSortType;
  onClose: () => void;
  onSelectSort: (sortType: FilterSortType) => void;
}

const SORT_OPTIONS: { type: FilterSortType; label: string }[] = [
  { type: 'created_at_desc', label: '作成日時（新しい順）' },
  { type: 'created_at_asc', label: '作成日時（古い順）' },
  { type: 'updated_at_desc', label: '更新日時（新しい順）' },
  { type: 'updated_at_asc', label: '更新日時（古い順）' },
  { type: 'block_keyword_asc', label: 'ブロックキーワード（昇順）' },
  { type: 'block_keyword_desc', label: 'ブロックキーワード（降順）' },
];

export const FilterSortModal: React.FC<FilterSortModalProps> = ({
  visible,
  currentSort,
  onClose,
  onSelectSort,
}) => {
  const handleSelectSort = (sortType: FilterSortType) => {
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
            <View style={styles.modalContent}>
              <Text style={styles.title}>並び替え</Text>
              
              <View style={styles.optionsList}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={styles.optionItem}
                    onPress={() => handleSelectSort(option.type)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionLabel}>
                      {currentSort === option.type && '▶ '}
                      {option.label}
                    </Text>
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
    backgroundColor: '#fff',
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
    color: '#000',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#000',
  },
});

