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
import { Swipeable } from 'react-native-gesture-handler';

// ダミーデータ型定義
interface Filter {
  id: number;
  block_keyword: string;
  allow_keyword?: string;
}

// ダミーデータ
const dummyFilters: Filter[] = [
  {
    id: 1,
    block_keyword: 'FX',
    allow_keyword: '仮想通貨',
  },
  {
    id: 2,
    block_keyword: '炎上',
  },
  {
    id: 3,
    block_keyword: 'ゴシップ',
  },
  {
    id: 4,
    block_keyword: '新卒',
    allow_keyword: 'react',
  },
];

// フィルタアイテムコンポーネント
const FilterItem: React.FC<{
  filter: Filter;
  isSelected: boolean;
  deleteMode: boolean;
  swipeableRef: React.RefObject<Swipeable>;
  isSwipeOpen: boolean;
  onPress: () => void;
  onPressEdit: () => void;
  onPressDelete: () => void;
  onSwipeableWillOpen: () => void;
  onSwipeableWillClose: () => void;
}> = ({
  filter,
  isSelected,
  deleteMode,
  swipeableRef,
  isSwipeOpen,
  onPress,
  onPressEdit,
  onPressDelete,
  onSwipeableWillOpen,
  onSwipeableWillClose,
}) => {
  // 削除アクション（右側）
  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={onPressDelete}
        activeOpacity={0.8}
      >
        <View style={styles.deleteButton}>
          <Text style={styles.deleteIcon}>🗑️</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handlePress = () => {
    // スワイプが開いている場合は閉じる
    if (swipeableRef.current && isSwipeOpen) {
      swipeableRef.current.close();
    }
    onPress();
  };

  const handlePressEdit = () => {
    // スワイプが開いている場合は閉じる（編集は実行しない）
    if (swipeableRef.current && isSwipeOpen) {
      swipeableRef.current.close();
      return;
    }
    // スワイプが閉じている場合のみ編集を実行
    onPressEdit();
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      enabled={!deleteMode}
      rightThreshold={40}
      onSwipeableWillOpen={onSwipeableWillOpen}
      onSwipeableWillClose={onSwipeableWillClose}
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
                Allow: {filter.allow_keyword}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handlePressEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

// ヘッダーコンポーネント
const FiltersHeader: React.FC<{
  deleteMode: boolean;
  onToggleDeleteMode: () => void;
  onPressAdd: () => void;
}> = ({ deleteMode, onToggleDeleteMode, onPressAdd }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Filters</Text>
      <View style={styles.headerButtons}>
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
  const [filters] = useState<Filter[]>(dummyFilters);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null);
  
  // 各フィルタのSwipeable refを管理
  const swipeableRefs = useRef<Map<number, React.RefObject<Swipeable>>>(new Map());

  // Swipeable refを取得または作成
  const getSwipeableRef = React.useCallback((filterId: number) => {
    if (!swipeableRefs.current.has(filterId)) {
      swipeableRefs.current.set(filterId, React.createRef<Swipeable>() as React.RefObject<Swipeable>);
    }
    return swipeableRefs.current.get(filterId)!;
  }, []);

  // 開いているスワイプを閉じる
  const closeOpenSwipe = React.useCallback((excludeId?: number) => {
    if (openSwipeId !== null && openSwipeId !== excludeId) {
      const ref = swipeableRefs.current.get(openSwipeId);
      if (ref?.current) {
        ref.current.close();
      }
    }
  }, [openSwipeId]);

  const handleToggleDeleteMode = React.useCallback(() => {
    setDeleteMode((prev) => {
      const newMode = !prev;
      if (!newMode) {
        // 削除モードをオフにする際、選択をクリア
        setSelectedIds([]);
      }
      // 開いているスワイプを閉じる
      closeOpenSwipe();
      setOpenSwipeId(null);
      return newMode;
    });
  }, [closeOpenSwipe]);

  const handlePressAdd = React.useCallback(() => {
    // 開いているスワイプを閉じる
    closeOpenSwipe();
    setOpenSwipeId(null);
    console.log('add filter');
  }, [closeOpenSwipe]);

  const handlePressFilter = React.useCallback(
    (filterId: number) => {
      // 開いているスワイプを閉じる
      closeOpenSwipe();
      setOpenSwipeId(null);

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
        // 通常モード時：編集（現状はconsole.log）
        console.log('edit filter', filterId);
      }
    },
    [deleteMode, closeOpenSwipe]
  );

  const handlePressEdit = React.useCallback(
    (filterId: number) => {
      // 開いているスワイプを閉じる
      closeOpenSwipe();
      setOpenSwipeId(null);
      // 編集を実行
      console.log('edit filter', filterId);
    },
    [closeOpenSwipe]
  );

  const handlePressDelete = React.useCallback((filterId: number) => {
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
          onPress: () => {
            console.log('delete filter', filterId);
            // 削除後、スワイプを閉じる
            const ref = swipeableRefs.current.get(filterId);
            if (ref?.current) {
              ref.current.close();
            }
            setOpenSwipeId(null);
          },
        },
      ]
    );
  }, []);

  const handleSwipeableWillOpen = React.useCallback(
    (filterId: number) => {
      // 以前に開いていたスワイプを閉じる
      closeOpenSwipe(filterId);
      setOpenSwipeId(filterId);
    },
    [closeOpenSwipe]
  );

  const handleSwipeableWillClose = React.useCallback(() => {
    setOpenSwipeId(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FiltersHeader
        deleteMode={deleteMode}
        onToggleDeleteMode={handleToggleDeleteMode}
        onPressAdd={handlePressAdd}
      />

      <FlatList
        data={filters}
        renderItem={({ item }) => {
          const swipeableRef = getSwipeableRef(item.id);
          const isSwipeOpen = openSwipeId === item.id;
          return (
            <FilterItem
              filter={item}
              isSelected={selectedIds.includes(item.id)}
              deleteMode={deleteMode}
              swipeableRef={swipeableRef}
              isSwipeOpen={isSwipeOpen}
              onPress={() => handlePressFilter(item.id)}
              onPressEdit={() => handlePressEdit(item.id)}
              onPressDelete={() => handlePressDelete(item.id)}
              onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
              onSwipeableWillClose={handleSwipeableWillClose}
            />
          );
        }}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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
  editButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 18,
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
