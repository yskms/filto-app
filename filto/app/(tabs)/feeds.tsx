import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated from 'react-native-reanimated';
import { Feed } from '@/types/Feed';
import { FeedService } from '@/services/FeedService';
import { FeedSortModal, FeedSortType } from '@/components/FeedSortModal';
import { ErrorHandler } from '@/utils/errorHandler';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

// FeedsHeader（通常モード）- タブ画面のため戻るボタンなし
const FeedsHeader: React.FC<{
  onPressSort: () => void;
  onPressDelete: () => void;
  onPressAdd: () => void;
}> = ({ onPressSort, onPressDelete, onPressAdd }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <ThemedText style={styles.headerTitle}>{t('feeds.title')}</ThemedText>
      <View style={styles.headerButtons}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressSort}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical-outline" size={22} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={22} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressAdd}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// FeedsHeader（削除モード）
const FeedsHeaderDeleteMode: React.FC<{
  selectedCount: number;
  onPressCancel: () => void;
  onPressDelete: () => void;
}> = ({ selectedCount, onPressCancel, onPressDelete }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onPressCancel}
        activeOpacity={0.7}
      >
        <ThemedText style={styles.cancelText}>{t('common.cancel')}</ThemedText>
      </TouchableOpacity>
      <ThemedText style={styles.selectedCount}>{t('feeds.deleteSelected', { count: selectedCount })}</ThemedText>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onPressDelete}
        disabled={selectedCount === 0}
        activeOpacity={0.7}
      >
        <ThemedText
          style={[
            styles.deleteText,
            selectedCount === 0 && styles.deleteTextDisabled,
          ]}
        >
          {t('common.delete')}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

// FeedItem コンポーネント
const FeedItem: React.FC<{
  feed: Feed;
  isDeleteMode: boolean;
  isSelected: boolean;
  isSwipeOpen: boolean;
  onToggleSelect: () => void;
  onSwipeDelete: () => void;
  swipeableRef: React.RefObject<SwipeableMethods | null>;
  onSwipeableWillOpen: () => void;
  onSwipeableWillClose: (feedId: string) => void;
}> = ({
  feed,
  isDeleteMode,
  isSelected,
  isSwipeOpen,
  onToggleSelect,
  onSwipeDelete,
  swipeableRef,
  onSwipeableWillOpen,
  onSwipeableWillClose,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const subtextColor = useThemeColor({}, 'icon');

  const renderRightActions = () => {
    return (
      <Reanimated.View style={styles.deleteAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onSwipeDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

  const handlePress = () => {
    if (swipeableRef.current && isSwipeOpen) {
      swipeableRef.current.close();
    }
    onToggleSelect();
  };

  const content = (
    <View style={[styles.feedItem, { backgroundColor, borderBottomColor: borderColor }]}>
      {isDeleteMode && (
        <View style={styles.checkbox}>
          <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={24} color={textColor} />
        </View>
      )}
      <View style={styles.feedContent}>
        {feed.iconUrl ? (
          <Image
            source={{ uri: feed.iconUrl }}
            style={styles.feedIconImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="newspaper-outline" size={28} color={subtextColor} style={{ marginRight: 12 }} />
        )}
        <View style={styles.feedTextContainer}>
          <Text style={[styles.feedTitle, { color: textColor }]}>{feed.title}</Text>
          <Text style={[styles.feedUrl, { color: subtextColor }]}>{feed.url}</Text>
        </View>
      </View>
    </View>
  );

  if (isDeleteMode) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      enabled={!isDeleteMode}
      rightThreshold={40}
      onSwipeableWillOpen={onSwipeableWillOpen}
      onSwipeableWillClose={() => onSwipeableWillClose(feed.id)}
      overshootRight={false}
    >
      {content}
    </Swipeable>
  );
};

export default function FeedsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState<FeedSortType>('created_at_desc');

  // 各フィードのSwipeable refを管理
  const swipeableRefs = useRef<Map<string, React.RefObject<SwipeableMethods | null>>>(new Map());
  
  // 開いているスワイプのIDを保持（refで直接管理）
  const openSwipeIdRef = useRef<string | null>(null);

  // フィードを読み込む
  const loadFeeds = React.useCallback(async () => {
    try {
      const feedList = await FeedService.listWithSort(currentSort);
      setFeeds(feedList);
    } catch (error) {
      console.error('Failed to load feeds:', error);
    }
  }, [currentSort]);

  // Swipeable refを取得または作成
  const getSwipeableRef = React.useCallback((feedId: string) => {
    if (!swipeableRefs.current.has(feedId)) {
      swipeableRefs.current.set(feedId, React.createRef<SwipeableMethods>());
    }
    return swipeableRefs.current.get(feedId)!;
  }, []);

  // 開いているスワイプを閉じる（useCallback を使わない）
  const closeOpenSwipe = (excludeId?: string) => {
    const currentOpenId = openSwipeIdRef.current;
    if (currentOpenId !== null && currentOpenId !== excludeId) {
      const ref = swipeableRefs.current.get(currentOpenId);
      if (ref?.current) {
        ref.current.close();
      }
    }
  };

  // 画面フォーカス時にフィードを読み込む
  useFocusEffect(
    React.useCallback(() => {
      loadFeeds();
      return () => {
        // クリーンアップ：フォーカスを失う時
        const currentOpenId = openSwipeIdRef.current;
        if (currentOpenId !== null) {
          const ref = swipeableRefs.current.get(currentOpenId);
          if (ref?.current) {
            ref.current.close();
          }
          openSwipeIdRef.current = null;
          setOpenSwipeId(null);
        }
        // 削除モードをオフ
        if (isDeleteMode) {
          setIsDeleteMode(false);
          setSelectedIds(new Set());
        }
      };
    }, [isDeleteMode, loadFeeds])
  );

  // currentSort が変更されたときにフィルタを再読み込み
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

    Alert.alert(t('feeds.confirmDelete'), t('feeds.confirmDeleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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
            ErrorHandler.showDatabaseError('フィードの削除');
          }
        },
      },
    ]);
  };

  const handleSwipeDelete = async (feed: Feed) => {
    Alert.alert(t('feeds.confirmDelete'), t('feeds.confirmDeleteSingle'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => {
          // キャンセル時もスワイプを閉じる
          const ref = swipeableRefs.current.get(feed.id);
          if (ref?.current) {
            ref.current.close();
          }
        },
      },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // 削除後、スワイプを閉じる
            const ref = swipeableRefs.current.get(feed.id);
            if (ref?.current) {
              ref.current.close();
            }
            openSwipeIdRef.current = null;
            setOpenSwipeId(null);
            await FeedService.delete(feed.id);
            await loadFeeds();
          } catch (error) {
            console.error('Failed to delete feed:', error);
            ErrorHandler.showDatabaseError('フィードの削除');
          }
        },
      },
    ]);
  };

  const handleSwipeableWillOpen = (feedId: string) => {
    // 古いスワイプを閉じる（新しいIDは除外）
    closeOpenSwipe(feedId);
    
    // 新しいIDを設定
    openSwipeIdRef.current = feedId;
    setOpenSwipeId(feedId);
  };

  const handleSwipeableWillClose = (feedId: string) => {
    // 自分が開いていた場合のみクリア
    if (openSwipeIdRef.current === feedId) {
      openSwipeIdRef.current = null;
      setOpenSwipeId(null);
    }
  };

  const backgroundColor = useThemeColor({}, 'background');

  return (
    <>
      {/* Expo Router のヘッダーを非表示 */}
      <Stack.Screen options={{ headerShown: false }} />

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
          renderItem={({ item }) => {
            const swipeableRef = getSwipeableRef(item.id);
            const isSwipeOpen = openSwipeId === item.id;
            return (
              <FeedItem
                feed={item}
                isDeleteMode={isDeleteMode}
                isSelected={selectedIds.has(item.id)}
                isSwipeOpen={isSwipeOpen}
                onToggleSelect={() => handleToggleSelect(item.id)}
                onSwipeDelete={() => handleSwipeDelete(item)}
                swipeableRef={swipeableRef}
                onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
                onSwipeableWillClose={handleSwipeableWillClose}
              />
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>📭</Text>
              <ThemedText style={styles.emptyMessage}>{t('feeds.noFeeds')}</ThemedText>
              <ThemedText style={styles.emptyHint}>{t('feeds.noFeedsHint')}</ThemedText>
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
    </>
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
    borderBottomColor: '#e0e0e0',
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
  selectedCount: {
    fontSize: 14,
    color: '#666',
  },
  deleteText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '600',
  },
  deleteTextDisabled: {
    color: '#b0b0b0',
  },
  listContent: {
    paddingBottom: 20,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 24,
  },
  feedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  feedIconImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  feedTextContainer: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  feedUrl: {
    fontSize: 14,
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
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
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
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
  },
});
