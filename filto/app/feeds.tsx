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
import { LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

// ダミーデータ型定義
interface Feed {
  id: number;
  title: string;
  url: string;
  icon?: string;
}

// ダミーデータ
const initialFeeds: Feed[] = [
  {
    id: 1,
    title: 'TechCrunch',
    url: 'techcrunch.com',
    icon: '📰',
  },
  {
    id: 2,
    title: 'Qiita',
    url: 'qiita.com',
    icon: '🧪',
  },
  {
    id: 3,
    title: 'Music Blog',
    url: 'musicblog.com',
    icon: '🎵',
  },
  {
    id: 4,
    title: 'Dev.to',
    url: 'dev.to',
    icon: '💻',
  },
];

// フィードアイテムコンポーネント
const FeedItem: React.FC<{
  feed: Feed;
  isSelected: boolean;
  deleteMode: boolean;
  swipeableRef: React.RefObject<Swipeable>;
  isSwipeOpen: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPressDelete: () => void;
  onSwipeableWillOpen: () => void;
  onSwipeableWillClose: () => void;
}> = ({
  feed,
  isSelected,
  deleteMode,
  swipeableRef,
  isSwipeOpen,
  onPress,
  onLongPress,
  onPressDelete,
  onSwipeableWillOpen,
  onSwipeableWillClose,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handleLongPress = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      scale.value = withSpring(1.05);
      onLongPress();
    } else if (event.nativeEvent.state === State.END) {
      scale.value = withSpring(1);
    }
  };

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
      return;
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
      onSwipeableWillClose={onSwipeableWillClose}
      overshootRight={false}
    >
      <LongPressGestureHandler
        onHandlerStateChange={handleLongPress}
        enabled={!deleteMode && !isSwipeOpen}
        minDurationMs={300}
      >
        <Reanimated.View style={animatedStyle}>
          <TouchableOpacity
            style={[
              styles.feedContainer,
              deleteMode && isSelected && styles.selectedContainer,
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <View style={styles.feedContent}>
              <Text style={styles.dragHandle}>☰</Text>
              <View style={styles.feedInfo}>
                <Text style={styles.feedIcon}>{feed.icon || '📰'}</Text>
                <View style={styles.textContainer}>
                  <Text style={styles.feedTitle}>{feed.title}</Text>
                  <Text style={styles.feedUrl}>{feed.url}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Reanimated.View>
      </LongPressGestureHandler>
    </Swipeable>
  );
};

// ヘッダーコンポーネント
const FeedsHeader: React.FC<{
  deleteMode: boolean;
  selectedCount: number;
  onToggleDeleteMode: () => void;
  onPressBack: () => void;
  onConfirmDelete: () => void;
}> = ({ deleteMode, selectedCount, onToggleDeleteMode, onPressBack, onConfirmDelete }) => {
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
      <TouchableOpacity
        onPress={onPressBack}
        style={styles.headerButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.headerIcon}>←</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Feeds</Text>

      <TouchableOpacity
        onPress={onToggleDeleteMode}
        style={styles.headerButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.headerIcon}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
};

// フローティング追加ボタン
const FloatingAddButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.floatingButtonText}>＋</Text>
    </TouchableOpacity>
  );
};

export default function FeedsScreen() {
  const router = useRouter();
  const [feeds, setFeeds] = useState<Feed[]>(initialFeeds);
  const [deleteMode, setDeleteMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null);

  // 各フィードのSwipeable refを管理
  const swipeableRefs = useRef<Map<number, React.RefObject<Swipeable>>>(new Map());

  // Swipeable refを取得または作成
  const getSwipeableRef = React.useCallback((feedId: number) => {
    if (!swipeableRefs.current.has(feedId)) {
      swipeableRefs.current.set(feedId, React.createRef<Swipeable>() as React.RefObject<Swipeable>);
    }
    return swipeableRefs.current.get(feedId)!;
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

  // 画面がフォーカスを失う時に開いているスワイプを閉じる
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // クリーンアップ関数：フォーカスを失う時に実行
        if (openSwipeId !== null) {
          const ref = swipeableRefs.current.get(openSwipeId);
          if (ref?.current) {
            ref.current.close();
          }
          setOpenSwipeId(null);
        }
      };
    }, [openSwipeId])
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
      setOpenSwipeId(null);
      return newMode;
    });
  }, [closeOpenSwipe]);

  const handlePressAdd = React.useCallback(() => {
    // 開いているスワイプを閉じる
    closeOpenSwipe();
    setOpenSwipeId(null);
    console.log('add feed');
  }, [closeOpenSwipe]);

  const handlePressFeed = React.useCallback(
    (feedId: number) => {
      // 開いているスワイプを閉じる
      closeOpenSwipe();
      setOpenSwipeId(null);

      if (deleteMode) {
        // 削除モード時：選択をトグル
        setSelectedIds((prev) => {
          if (prev.includes(feedId)) {
            return prev.filter((id) => id !== feedId);
          } else {
            return [...prev, feedId];
          }
        });
      }
    },
    [deleteMode, closeOpenSwipe]
  );

  const handleLongPressFeed = React.useCallback(
    (feedId: number) => {
      if (!deleteMode) {
        // 通常モード時：ドラッグ開始（UI only、実際の並び替えは実装しない）
        console.log('drag feed', feedId);
      }
    },
    [deleteMode]
  );

  const handlePressDelete = React.useCallback((feedId: number) => {
    Alert.alert(
      'フィードを削除',
      'このフィードを削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: () => {
            // キャンセル時もスワイプを閉じる
            const ref = swipeableRefs.current.get(feedId);
            if (ref?.current) {
              ref.current.close();
            }
          },
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            console.log('delete feed', feedId);
            // TODO: FeedService.delete(feedId)
            setFeeds((prev) => prev.filter((f) => f.id !== feedId));
            // 削除後、スワイプを閉じる
            const ref = swipeableRefs.current.get(feedId);
            if (ref?.current) {
              ref.current.close();
            }
            setOpenSwipeId(null);
          },
        },
      ]
    );
  }, []);

  const handleConfirmDelete = React.useCallback(() => {
    if (selectedIds.length === 0) return;

    Alert.alert(
      `${selectedIds.length}件のフィードを削除しますか？`,
      'この操作は取り消せません',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            console.log('delete feeds', selectedIds);
            // TODO: FeedService.delete(selectedIds)
            setFeeds((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
            setSelectedIds([]);
            setDeleteMode(false);
          },
        },
      ]
    );
  }, [selectedIds]);

  const handleSwipeableWillOpen = React.useCallback(
    (feedId: number) => {
      // 以前に開いていたスワイプを閉じる
      closeOpenSwipe(feedId);
      setOpenSwipeId(feedId);
    },
    [closeOpenSwipe]
  );

  const handleSwipeableWillClose = React.useCallback(() => {
    setOpenSwipeId(null);
  }, []);

  return (
    <>
      {/* Stackのデフォルトヘッダーを無効化 */}
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <FeedsHeader
          deleteMode={deleteMode}
          selectedCount={selectedIds.length}
          onToggleDeleteMode={handleToggleDeleteMode}
          onPressBack={() => router.back()}
          onConfirmDelete={handleConfirmDelete}
        />

        <FlatList
          data={feeds}
          renderItem={({ item }) => {
            const swipeableRef = getSwipeableRef(item.id);
            const isSwipeOpen = openSwipeId === item.id;
            return (
              <FeedItem
                feed={item}
                isSelected={selectedIds.includes(item.id)}
                deleteMode={deleteMode}
                swipeableRef={swipeableRef}
                isSwipeOpen={isSwipeOpen}
                onPress={() => handlePressFeed(item.id)}
                onLongPress={() => handleLongPressFeed(item.id)}
                onPressDelete={() => handlePressDelete(item.id)}
                onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
                onSwipeableWillClose={handleSwipeableWillClose}
              />
            );
          }}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />

        <FloatingAddButton onPress={handlePressAdd} />
      </SafeAreaView>
    </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingBottom: 100, // フローティングボタンのスペース
  },
  feedContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  selectedContainer: {
    backgroundColor: '#e3f2fd',
  },
  feedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    fontSize: 20,
    color: '#999',
    marginRight: 12,
  },
  feedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  feedUrl: {
    fontSize: 12,
    color: '#666',
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingButtonText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 28,
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