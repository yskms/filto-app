import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { FilterService, Filter } from '@/services/FilterService';
import { FilterSortModal, FilterSortType } from '@/components/FilterSortModal';
import { ErrorHandler } from '@/utils/errorHandler';

// フィルタアイテムコンポーネント
const FilterItem: React.FC<{
  filter: Filter;
  isSelected: boolean;
  deleteMode: boolean;
  swipeableRef: React.RefObject<SwipeableMethods | null>;
  isSwipeOpen: boolean;
  onPress: () => void;
  onPressDelete: () => void;
  onSwipeableWillOpen: () => void;
  onSwipeableWillClose: (filterId: number) => void;
}> = ({
  filter,
  isSelected,
  deleteMode,
  swipeableRef,
  isSwipeOpen,
  onPress,
  onPressDelete,
  onSwipeableWillOpen,
  onSwipeableWillClose,
}) => {
  // 削除アクション（右側）- Reanimated版
  const renderRightActions = () => {
    return (
      <Reanimated.View style={styles.deleteAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onPressDelete}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

  const handlePress = () => {
    // スワイプが開いている場合は閉じる
    if (swipeableRef.current && isSwipeOpen) {
      swipeableRef.current.close();
    }
    onPress();
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      enabled={!deleteMode}
      rightThreshold={40}
      onSwipeableWillOpen={onSwipeableWillOpen}
      onSwipeableWillClose={() => onSwipeableWillClose(filter.id!)}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[
          styles.filterContainer,
          deleteMode && isSelected && styles.selectedContainer,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.filterContent}>
          <View style={styles.textContainer}>
            <Text style={styles.blockKeyword}>{filter.block_keyword}</Text>
            {filter.allow_keyword && (
              <Text style={styles.allowKeyword}>
                許可: {filter.allow_keyword}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

// ヘッダーコンポーネント
const FiltersHeader: React.FC<{
  deleteMode: boolean;
  selectedCount: number;
  onToggleDeleteMode: () => void;
  onPressSortButton: () => void;
  onPressAdd: () => void;
  onConfirmDelete: () => void;
}> = ({ deleteMode, selectedCount, onToggleDeleteMode, onPressSortButton, onPressAdd, onConfirmDelete }) => {
  if (deleteMode) {
    // 削除モード時のヘッダー
    return (
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onToggleDeleteMode}
          style={styles.headerButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {selectedCount}件選択
        </Text>

        <TouchableOpacity
          onPress={onConfirmDelete}
          style={styles.headerButton}
          disabled={selectedCount === 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[
            styles.deleteText,
            selectedCount === 0 && styles.disabledText
          ]}>
            削除
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 通常モード時のヘッダー
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Filters</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressSortButton}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIcon}>🔄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onToggleDeleteMode}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIcon}>🗑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressAdd}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIcon}>＋</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function FiltersScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filter[]>([]);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null);
  
  // ソート関連のState
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState<FilterSortType>('created_at_desc');
  
  // 各フィルタのSwipeable refを管理
  const swipeableRefs = useRef<Map<number, React.RefObject<SwipeableMethods | null>>>(new Map());
  
  // 開いているスワイプのIDを保持（refで直接管理）
  const openSwipeIdRef = useRef<number | null>(null);

  // フィルタ一覧を読み込む
  const loadFilters = React.useCallback(async () => {
    try {
      const filterList = await FilterService.listWithSort(currentSort);
      setFilters(filterList);
    } catch (error) {
      ErrorHandler.showLoadError('フィルタ');
    }
  }, [currentSort]);

  // Swipeable refを取得または作成
  const getSwipeableRef = React.useCallback((filterId: number) => {
    if (!swipeableRefs.current.has(filterId)) {
      swipeableRefs.current.set(filterId, React.createRef<SwipeableMethods>());
    }
    return swipeableRefs.current.get(filterId)!;
  }, []);

  // 開いているスワイプを閉じる（useCallback を使わない）
  const closeOpenSwipe = (excludeId?: number) => {
    const currentOpenId = openSwipeIdRef.current;
    if (currentOpenId !== null && currentOpenId !== excludeId) {
      const ref = swipeableRefs.current.get(currentOpenId);
      if (ref?.current) {
        ref.current.close();
      }
    }
  };

  // currentSort が変更されたときにフィルタを再読み込み
  React.useEffect(() => {
    loadFilters();
  }, [currentSort, loadFilters]);

  // 画面がフォーカスされた時にフィルタを読み込む
  useFocusEffect(
    React.useCallback(() => {
      loadFilters();
      return () => {
        // クリーンアップ関数：フォーカスを失う時に実行
        const currentOpenId = openSwipeIdRef.current;
        if (currentOpenId !== null) {
          const ref = swipeableRefs.current.get(currentOpenId);
          if (ref?.current) {
            ref.current.close();
          }
          openSwipeIdRef.current = null;
          setOpenSwipeId(null);
        }
        // 削除モードをオフにする
        if (deleteMode) {
          setDeleteMode(false);
          setSelectedIds([]);
        }
      };
    }, [deleteMode, loadFilters])
  );

  const handleToggleDeleteMode = React.useCallback(() => {
    setDeleteMode((prev) => {
      const newMode = !prev;
      if (!newMode) {
        // 削除モードをオフにする際、選択をクリア
        setSelectedIds([]);
      }
      // 開いているスワイプを閉じる
      closeOpenSwipe();
      openSwipeIdRef.current = null;
      setOpenSwipeId(null);
      return newMode;
    });
  }, []);

  const handlePressAdd = React.useCallback(() => {
    // 開いているスワイプを閉じる
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    router.push('/filter_edit');
  }, [router]);

  const handlePressSortButton = React.useCallback(() => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    setSortModalVisible(true);
  }, []);

  const handleSelectSort = React.useCallback((sortType: FilterSortType) => {
    setCurrentSort(sortType);
    // loadFilters は currentSort の変更で自動的に再実行される
  }, []);

  const handlePressFilter = React.useCallback(
    (filterId: number) => {
      // スワイプが開いている場合は閉じるのみ
      if (openSwipeIdRef.current !== null) {
        closeOpenSwipe();
        openSwipeIdRef.current = null;
        setOpenSwipeId(null);
        return;
      }

      if (deleteMode) {
        // 削除モード時：選択をトグル
        setSelectedIds((prev) => {
          if (prev.includes(filterId)) {
            return prev.filter((id) => id !== filterId);
          } else {
            return [...prev, filterId];
          }
        });
      } else {
        // 通常モード時：編集画面に遷移
        router.push(`/filter_edit?filterId=${filterId}`);
      }
    },
    [deleteMode, router]
  );

  const handlePressDelete = React.useCallback(
    (filterId: number) => {
      Alert.alert(
        'フィルタを削除',
        'このフィルタを削除しますか？',
        [
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: () => {
              // キャンセル時もスワイプを閉じる
              const ref = swipeableRefs.current.get(filterId);
              if (ref?.current) {
                ref.current.close();
              }
            },
          },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              try {
                // 削除後、スワイプを閉じる
                const ref = swipeableRefs.current.get(filterId);
                if (ref?.current) {
                  ref.current.close();
                }
                openSwipeIdRef.current = null;
                setOpenSwipeId(null);
                await FilterService.delete(filterId);
                // フィルタ一覧を再読み込み
                await loadFilters();
              } catch (error) {
                ErrorHandler.showDatabaseError('フィルタの削除');
              }
            },
          },
        ]
      );
    },
    [loadFilters]
  );

  const handleConfirmDelete = React.useCallback(async () => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      `${selectedIds.length}件のフィルタを削除しますか？`,
      'この操作は取り消せません',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 複数削除を順次実行
              for (const id of selectedIds) {
                await FilterService.delete(id);
              }
              setSelectedIds([]);
              setDeleteMode(false);
              // フィルタ一覧を再読み込み
              await loadFilters();
            } catch (error) {
              ErrorHandler.showDatabaseError('フィルタの削除');
            }
          },
        },
      ]
    );
  }, [selectedIds, loadFilters]);

  const handleSwipeableWillOpen = (filterId: number) => {
    // 古いスワイプを閉じる（新しいIDは除外）
    closeOpenSwipe(filterId);
    
    // 新しいIDを設定
    openSwipeIdRef.current = filterId;
    setOpenSwipeId(filterId);
  };

  const handleSwipeableWillClose = (filterId: number) => {
    // 自分が開いていた場合のみクリア
    if (openSwipeIdRef.current === filterId) {
      openSwipeIdRef.current = null;
      setOpenSwipeId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FiltersHeader
        deleteMode={deleteMode}
        selectedCount={selectedIds.length}
        onToggleDeleteMode={handleToggleDeleteMode}
        onPressSortButton={handlePressSortButton}
        onPressAdd={handlePressAdd}
        onConfirmDelete={handleConfirmDelete}
      />

      <FlatList
        data={filters}
        renderItem={({ item }) => {
          if (!item.id) return null;
          const filterId = item.id;
          const swipeableRef = getSwipeableRef(filterId);
          const isSwipeOpen = openSwipeId === filterId;
          return (
            <FilterItem
              filter={item}
              isSelected={selectedIds.includes(filterId)}
              deleteMode={deleteMode}
              swipeableRef={swipeableRef}
              isSwipeOpen={isSwipeOpen}
              onPress={() => handlePressFilter(filterId)}
              onPressDelete={() => handlePressDelete(filterId)}
              onSwipeableWillOpen={() => handleSwipeableWillOpen(filterId)}
              onSwipeableWillClose={() => handleSwipeableWillClose(filterId)}
            />
          );
        }}
        keyExtractor={(item) => (item.id ?? 0).toString()}
        contentContainerStyle={styles.listContent}
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
    backgroundColor: '#fff',
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
  listContent: {
    paddingBottom: 20,
  },
  filterContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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
    color: '#000',
    marginBottom: 4,
  },
  allowKeyword: {
    fontSize: 14,
    color: '#666',
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
});