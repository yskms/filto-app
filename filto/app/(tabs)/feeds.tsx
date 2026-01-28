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
import { FeedService, Feed, FeedSortType } from '@/services/FeedService';
import { ErrorHandler } from '@/utils/errorHandler';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

// フィードヘッダー（通常モード）
const FeedsHeader: React.FC<{
  onPressSort: () => void;
  onPressDelete: () => void;
  onPressAdd: () => void;
}> = ({ onPressSort, onPressDelete, onPressAdd }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <ThemedText style={styles.headerTitle}>{t.feeds.title}</ThemedText>
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

// フィードヘッダー（削除モード）
const FeedsHeaderDeleteMode: React.FC<{
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
        <ThemedText style={styles.cancelText}>{t.feeds.cancel}</ThemedText>
      </TouchableOpacity>
      <ThemedText style={styles.selectedCount}>{selectedCount}{t.feeds.selected}</ThemedText>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onPressDelete}
        disabled={selectedCount === 0}
        activeOpacity={0.7}
      >
        <ThemedText style={[styles.deleteText, selectedCount === 0 && styles.disabledText]}>
          {t.feeds.cancel}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

// 並び替えモーダル
const FeedSortModal: React.FC<{
  visible: boolean;
  currentSort: FeedSortType;
  onClose: () => void;
  onSelectSort: (sortType: FeedSortType) => void;
}> = ({ visible, currentSort, onClose, onSelectSort }) => {
  const backgroundColor = useThemeColor({}, 'background');
  const t = useTranslation();

  const sortOptions: Array<{ type: FeedSortType; label: string }> = [
    { type: 'name_asc', label: t.feeds.sortNameAsc },
    { type: 'name_desc', label: t.feeds.sortNameDesc },
    { type: 'created_asc', label: t.feeds.sortDateAsc },
    { type: 'created_desc', label: t.feeds.sortDateDesc },
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
                onPress={() => {
                  onSelectSort(option.type);
                  onClose();
                }}
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

// フィードアイテム
const FeedItem: React.FC<{
  feed: Feed;
  isSelected: boolean;
  isDeleteMode: boolean;
  onPress: () => void;
  onPressDelete: () => void;
  swipeableRef: React.RefObject<Swipeable>;
  onSwipeableOpen: () => void;
}> = ({ feed, isSelected, isDeleteMode, onPress, onPressDelete, swipeableRef, onSwipeableOpen }) => {
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
      renderRightActions={isDeleteMode ? undefined : renderRightActions}
      enabled={!isDeleteMode}
      onSwipeableOpen={onSwipeableOpen}
    >
      <TouchableOpacity
        style={[
          styles.feedContainer,
          { borderBottomColor: borderColor, backgroundColor },
          isSelected && styles.selectedContainer,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.feedContent}>
          <View style={styles.textContainer}>
            <ThemedText style={styles.feedTitle}>{feed.title}</ThemedText>
            <ThemedText style={styles.feedUrl} numberOfLines={1}>{feed.url}</ThemedText>
          </View>
          {isDeleteMode && (
            <ThemedText style={styles.checkbox}>{isSelected ? '☑' : '☐'}</ThemedText>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function FeedsScreen() {
  const router = useRouter();
  const t = useTranslation();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentSort, setCurrentSort] = useState<FeedSortType>('created_desc');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const openSwipeIdRef = useRef<string | null>(null);
  const swipeableRefs = useRef<Map<string, React.RefObject<Swipeable>>>(new Map());

  const loadFeeds = useCallback(async () => {
    try {
      const feedList = await FeedService.list(currentSort);
      setFeeds(feedList);
    } catch (error) {
      console.error('Failed to load feeds:', error);
    }
  }, [currentSort]);

  const getSwipeableRef = (feedId: string): React.RefObject<Swipeable> => {
    if (!swipeableRefs.current.has(feedId)) {
      swipeableRefs.current.set(feedId, React.createRef<Swipeable>());
    }
    return swipeableRefs.current.get(feedId)!;
  };

  const closeOpenSwipe = (excludeId?: string) => {
    const currentOpenId = openSwipeIdRef.current;
    if (currentOpenId !== null && currentOpenId !== excludeId) {
      const ref = swipeableRefs.current.get(currentOpenId);
      if (ref?.current) {
        ref.current.close();
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadFeeds();
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
        if (isDeleteMode) {
          setIsDeleteMode(false);
          setSelectedIds(new Set());
        }
      };
    }, [isDeleteMode, loadFeeds])
  );

  React.useEffect(() => {
    loadFeeds();
  }, [currentSort, loadFeeds]);

  const handlePressSortButton = () => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    setSortModalVisible(true);
  };

  const handleSelectSort = (sortType: FeedSortType) => {
    setCurrentSort(sortType);
    setSortModalVisible(false);
  };

  const handlePressDelete = () => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    setIsDeleteMode(true);
  };

  const handlePressAdd = () => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setOpenSwipeId(null);
    router.push('/feed_add');
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCancelDelete = () => {
    setIsDeleteMode(false);
    setSelectedIds(new Set());
  };

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) return;

    Alert.alert(t.feeds.confirmTitle, `${selectedIds.size}${t.feeds.deleteConfirm}`, [
      { text: t.feeds.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            for (const id of selectedIds) {
              await FeedService.delete(id);
            }
            setIsDeleteMode(false);
            setSelectedIds(new Set());
            await loadFeeds();
          } catch (error) {
            console.error('Failed to delete feeds:', error);
            ErrorHandler.showDatabaseError(t.feeds.errorDelete);
          }
        },
      },
    ]);
  };

  const handleSwipeDelete = async (feed: Feed) => {
    Alert.alert(t.feeds.confirmTitle, `「${feed.title}」${t.feeds.deleteOneConfirm}`, [
      {
        text: t.feeds.cancel,
        style: 'cancel',
        onPress: () => {
          const ref = swipeableRefs.current.get(feed.id);
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
            await FeedService.delete(feed.id);
            await loadFeeds();
          } catch (error) {
            console.error('Failed to delete feed:', error);
            ErrorHandler.showDatabaseError(t.feeds.errorDelete);
          }
        },
      },
    ]);
  };

  const handleSwipeableOpen = (feedId: string) => {
    if (openSwipeIdRef.current !== null && openSwipeIdRef.current !== feedId) {
      const ref = swipeableRefs.current.get(openSwipeIdRef.current);
      if (ref?.current) {
        ref.current.close();
      }
    }
    openSwipeIdRef.current = feedId;
    setOpenSwipeId(feedId);
  };

  const backgroundColor = useThemeColor({}, 'background');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      {isDeleteMode ? (
        <FeedsHeaderDeleteMode
          selectedCount={selectedIds.size}
          onPressCancel={handleCancelDelete}
          onPressDelete={handleConfirmDelete}
        />
      ) : (
        <FeedsHeader
          onPressSort={handlePressSortButton}
          onPressDelete={handlePressDelete}
          onPressAdd={handlePressAdd}
        />
      )}

      <FlatList
        data={feeds}
        renderItem={({ item }) => (
          <FeedItem
            feed={item}
            isSelected={selectedIds.has(item.id)}
            isDeleteMode={isDeleteMode}
            onPress={() => {
              if (openSwipeIdRef.current !== null) {
                closeOpenSwipe();
                openSwipeIdRef.current = null;
                setOpenSwipeId(null);
                return;
              }
              if (isDeleteMode) {
                handleToggleSelect(item.id);
              }
            }}
            onPressDelete={() => handleSwipeDelete(item)}
            swipeableRef={getSwipeableRef(item.id)}
            onSwipeableOpen={() => handleSwipeableOpen(item.id)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>{t.feeds.emptyIcon}</ThemedText>
            <ThemedText style={styles.emptyMessage}>{t.feeds.emptyMessage}</ThemedText>
          </View>
        }
      />

      <FeedSortModal
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
  feedContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  selectedContainer: {
    backgroundColor: '#e3f2fd',
  },
  feedContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  feedUrl: {
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