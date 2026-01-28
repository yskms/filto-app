import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { FilterService, Filter, FilterSortType } from '@/services/FilterService';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

// フィルタヘッダー（通常モード）
const FiltersHeader: React.FC<{
  onPressSort: () => void;
  onPressDelete: () => void;
  onPressAdd: () => void;
}> = ({ onPressSort, onPressDelete, onPressAdd }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <ThemedText style={styles.headerTitle}>{t.filters.title}</ThemedText>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressSort}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerIcon}>🔄</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressDelete}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerIcon}>🗑</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressAdd}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.headerIcon}>＋</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// フィルタヘッダー（削除モード）
const FiltersHeaderDeleteMode: React.FC<{
  selectedCount: number;
  onPressCancel: () => void;
  onPressDelete: () => void;
}> = ({ selectedCount, onPressCancel, onPressDelete }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onPressCancel}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.cancelText}>{t.filters.cancel}</ThemedText>
      </TouchableOpacity>
      <ThemedText style={styles.selectedCount}>{selectedCount}{t.filters.selected}</ThemedText>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onPressDelete}
        disabled={selectedCount === 0}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.deleteText, selectedCount === 0 && styles.disabledText]}>
          {t.filters.delete}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

// 並び替えモーダル
const FilterSortModal: React.FC<{
  visible: boolean;
  currentSort: FilterSortType;
  onClose: () => void;
  onSelectSort: (sortType: FilterSortType) => void;
}> = ({ visible, currentSort, onClose, onSelectSort }) => {
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  const sortOptions: Array<{ type: FilterSortType; label: string }> = [
    { type: 'created_asc', label: t.feeds.sortDateAsc },
    { type: 'created_desc', label: t.feeds.sortDateDesc },
    { type: 'updated_asc', label: t.feeds.sortDateAsc.replace('追加', '更新').replace('Added', 'Updated') },
    { type: 'updated_desc', label: t.feeds.sortDateDesc.replace('追加', '更新').replace('Added', 'Updated') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sortModalContent, { backgroundColor }]}>
          <ThemedText style={styles.sortModalTitle}>{t.feeds.sortTitle}</ThemedText>
          <View style={styles.sortModalOptions}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={styles.sortOption}
                onPress={() => onSelectSort(option.type)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.sortOptionText}>{option.label}</ThemedText>
                {currentSort === option.type && (
                  <ThemedText style={styles.sortOptionCheck}>✓</ThemedText>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// フィルタアイテム
const FilterItem: React.FC<{
  filter: Filter;
  isSelected: boolean;
  deleteMode: boolean;
  onPress: () => void;
  onPressDelete: () => void;
  swipeableRef: React.RefObject<Swipeable>;
  onSwipeableOpen: () => void;
}> = ({ filter, isSelected, deleteMode, onPress, onPressDelete, swipeableRef, onSwipeableOpen }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');

  const renderRightActions = () => (
    <View style={styles.deleteAction}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onPressDelete}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.deleteIcon}>🗑</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={deleteMode ? undefined : renderRightActions}
      enabled={!deleteMode}
      onSwipeableOpen={onSwipeableOpen}
    >
      <TouchableOpacity
        style={[
          styles.filterContainer,
          { borderBottomColor: borderColor, backgroundColor },
          isSelected && styles.selectedContainer,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.filterContent}>
          <View style={styles.textContainer}>
            <ThemedText style={styles.blockKeyword}>{filter.blockKeyword}</ThemedText>
            {filter.allowKeywords && (
              <ThemedText style={styles.allowKeyword}>許可: {filter.allowKeywords}</ThemedText>
            )}
          </View>
          {deleteMode && (
            <ThemedText style={styles.checkbox}>{isSelected ? '☑' : '☐'}</ThemedText>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function FiltersScreen() {
  const router = useRouter();
  const t = useTranslation();
  const [filters, setFilters] = useState<Filter[]>([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentSort, setCurrentSort] = useState<FilterSortType>('created_desc');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null);
  const openSwipeIdRef = useRef<number | null>(null);
  const swipeableRefs = useRef<Map<number, React.RefObject<Swipeable>>>(new Map());

  const loadFilters = useCallback(async () => {
    try {
      const filterList = await FilterService.list(currentSort);
      setFilters(filterList);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  }, [currentSort]);

  const getSwipeableRef = (filterId: number): React.RefObject<Swipeable> => {
    if (!swipeableRefs.current.has(filterId)) {
      swipeableRefs.current.set(filterId, React.createRef<Swipeable>());
    }
    return swipeableRefs.current.get(filterId)!;
  };

  const closeOpenSwipe = () => {
    const currentOpenId = openSwipeIdRef.current;
    if (currentOpenId !== null) {
      const ref = swipeableRefs.current.get(currentOpenId);
      if (ref?.current) {
        ref.current.close();
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFilters();
      return () => {
        const currentOpenId = openSwipeIdRef.current;
        if (currentOpenId !== null) {
          const ref = swipeableRefs.current.get(currentOpenId);
          if (ref?.current) {
            ref.current.close();
          }
          openSwipeIdRef.current = null;
          setOpenSwipeId(null);
        }
        if (deleteMode) {
          setDeleteMode(false);
          setSelectedIds([]);
        }
      };
    }, [deleteMode, loadFilters])
  );

  React.useEffect(() => {
    loadFilters();
  }, [currentSort, loadFilters]);

  const handlePressSortButton = useCallback(() => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    setSortModalVisible(true);
  }, []);

  const handleSelectSort = useCallback((sortType: FilterSortType) => {
    setCurrentSort(sortType);
  }, []);

  const handlePressFilter = useCallback(
    (filterId: number) => {
      if (openSwipeIdRef.current !== null) {
        closeOpenSwipe();
        openSwipeIdRef.current = null;
        setOpenSwipeId(null);
        return;
      }

      if (deleteMode) {
        setSelectedIds((prev) => {
          if (prev.includes(filterId)) {
            return prev.filter((id) => id !== filterId);
          } else {
            return [...prev, filterId];
          }
        });
      } else {
        router.push(`/filter_edit?filterId=${filterId}`);
      }
    },
    [deleteMode, router]
  );

  const handlePressDelete = useCallback(
    (filterId: number) => {
      Alert.alert(
        t.filters.deleteConfirmTitle,
        t.filters.deleteConfirmMessage,
        [
          {
            text: t.common.cancel,
            style: 'cancel',
            onPress: () => {
              const ref = swipeableRefs.current.get(filterId);
              if (ref?.current) {
                ref.current.close();
              }
            },
          },
          {
            text: t.common.delete,
            style: 'destructive',
            onPress: async () => {
              try {
                await FilterService.delete(filterId);
                await loadFilters();
              } catch (error) {
                console.error('Failed to delete filter:', error);
                Alert.alert(t.common.error, 'Failed to delete filter');
              }
            },
          },
        ]
      );
    },
    [loadFilters, t]
  );

  const handlePressDeleteMode = useCallback(() => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    setDeleteMode(true);
  }, []);

  const handlePressAdd = useCallback(() => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    router.push('/filter_edit');
  }, [router]);

  const handleCancelDelete = useCallback(() => {
    setDeleteMode(false);
    setSelectedIds([]);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    Alert.alert(t.common.confirm, `${selectedIds.length}${t.filters.deleteConfirm}`, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            for (const id of selectedIds) {
              await FilterService.delete(id);
            }
            setDeleteMode(false);
            setSelectedIds([]);
            await loadFilters();
          } catch (error) {
            console.error('Failed to delete filters:', error);
            Alert.alert(t.common.error, 'Failed to delete filters');
          }
        },
      },
    ]);
  }, [selectedIds, loadFilters, t]);

  const handleSwipeableOpen = useCallback((filterId: number) => {
    if (openSwipeIdRef.current !== null && openSwipeIdRef.current !== filterId) {
      const ref = swipeableRefs.current.get(openSwipeIdRef.current);
      if (ref?.current) {
        ref.current.close();
      }
    }
    openSwipeIdRef.current = filterId;
    setOpenSwipeId(filterId);
  }, []);

  const backgroundColor = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      {deleteMode ? (
        <FiltersHeaderDeleteMode
          selectedCount={selectedIds.length}
          onPressCancel={handleCancelDelete}
          onPressDelete={handleConfirmDelete}
        />
      ) : (
        <FiltersHeader
          onPressSort={handlePressSortButton}
          onPressDelete={handlePressDeleteMode}
          onPressAdd={handlePressAdd}
        />
      )}

      <FlatList
        data={filters}
        renderItem={({ item }) => (
          <FilterItem
            filter={item}
            isSelected={selectedIds.includes(item.id!)}
            deleteMode={deleteMode}
            onPress={() => handlePressFilter(item.id!)}
            onPressDelete={() => handlePressDelete(item.id!)}
            swipeableRef={getSwipeableRef(item.id!)}
            onSwipeableOpen={() => handleSwipeableOpen(item.id!)}
          />
        )}
        keyExtractor={(item) => (item.id ?? 0).toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{t.filters.emptyIcon}</ThemedText>
            <ThemedText style={styles.emptyMessage}>{t.filters.emptyMessage}</ThemedText>
          </View>
        }
      />

      <FilterSortModal
        visible={sortModalVisible}
        currentSort={currentSort}
        onClose={() => setSortModalVisible(false)}
        onSelectSort={handleSelectSort}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  headerIcon: {
    fontSize: 20,
  },
  cancelText: {
    fontSize: 16,
    color: '#1976d2',
  },
  deleteText: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '600',
  },
  disabledText: {
    opacity: 0.3,
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  selectedContainer: {
    backgroundColor: '#e3f2fd',
  },
  filterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  blockKeyword: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  allowKeyword: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    fontSize: 24,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteButton: {
    flex: 1,
    width: '100%',
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 24,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortModalOptions: {
    gap: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sortOptionText: {
    fontSize: 16,
  },
  sortOptionCheck: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: '600',
  },
});