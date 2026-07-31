import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageKeys } from '@/constants/storageKeys';
import { CoachMarks, CoachStep, CoachRect } from '@/components/CoachMarks';
import { ErrorHandler } from '@/utils/errorHandler';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

// 選択モード: なし / 複数削除 / 複数非表示
type SelectionMode = 'none' | 'delete' | 'hide';

// FeedsHeader（通常モード）- タブ画面のため戻るボタンなし
const FeedsHeader: React.FC<{
  onPressSort: () => void;
  onPressHide: () => void;
  onPressDelete: () => void;
  onPressAdd: () => void;
  addRef: React.RefObject<View | null>;
}> = ({ onPressSort, onPressHide, onPressDelete, onPressAdd, addRef }) => {
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
          onPress={onPressHide}
          activeOpacity={0.7}
          accessibilityLabel={t('feeds.hideModeA11y')}
        >
          <Ionicons name="eye-off-outline" size={22} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={22} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          ref={addRef}
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

// FeedsHeader（選択モード：削除 / 非表示 共通）
const FeedsHeaderSelectionMode: React.FC<{
  mode: 'delete' | 'hide';
  // hide モードで、選択がすべて非表示中のとき true（アクションが「表示に戻す」になる）
  unhideMode: boolean;
  selectedCount: number;
  allSelected: boolean;
  onPressCancel: () => void;
  onPressSelectAll: () => void;
  onPressAction: () => void;
}> = ({ mode, unhideMode, selectedCount, allSelected, onPressCancel, onPressSelectAll, onPressAction }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const dangerColor = useThemeColor({}, 'danger');
  const { t } = useTranslation();

  const actionColor = mode === 'delete' ? dangerColor : tintColor;
  const countText = t('feeds.selectedCountLabel', { count: selectedCount });
  const actionText = mode === 'delete'
    ? t('common.delete')
    : (unhideMode ? t('feeds.unhideAction') : t('feeds.hideAction'));

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <View style={styles.headerSideLeft}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPressCancel}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.cancelText, { color: tintColor }]}>{t('common.cancel')}</ThemedText>
        </TouchableOpacity>
      </View>
      <ThemedText style={styles.selectedCount}>{countText}</ThemedText>
      <View style={styles.headerSideRight}>
        <View style={styles.selectionActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onPressSelectAll}
            activeOpacity={0.7}
            accessibilityLabel={allSelected ? t('feeds.deselectAll') : t('feeds.selectAll')}
          >
            <Ionicons
              name={allSelected ? 'remove-circle-outline' : 'checkmark-done-outline'}
              size={24}
              color={tintColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onPressAction}
            disabled={selectedCount === 0}
            activeOpacity={0.7}
          >
            <ThemedText
              style={[
                styles.deleteText,
                { color: actionColor },
                selectedCount === 0 && styles.deleteTextDisabled,
              ]}
            >
              {actionText}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// FeedItem コンポーネント
type FeedItemProps = {
  feed: Feed;
  isSelectionMode: boolean;
  isSelected: boolean;
  getIsSwipeOpen: () => boolean;
  onToggleSelect: () => void;
  onSwipeHide: () => void;
  onPressEdit: () => void;
  swipeableRef: React.RefObject<SwipeableMethods | null>;
  onSwipeableWillOpen: () => void;
  onSwipeableWillClose: (feedId: string) => void;
};

// 大量のフィード行で毎タップ全行が再レンダリングされて重くなるのを防ぐためメモ化。
// コールバックは毎回新規生成されるが挙動は feed.id 依存で安定しているため比較から除外し、
// 表示に影響する feed / isSelectionMode / isSelected の変化だけで再描画する。
const FeedItem = React.memo(function FeedItem({
  feed,
  isSelectionMode,
  isSelected,
  getIsSwipeOpen,
  onToggleSelect,
  onSwipeHide,
  onPressEdit,
  swipeableRef,
  onSwipeableWillOpen,
  onSwipeableWillClose,
}: FeedItemProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const subtextColor = useThemeColor({}, 'icon');
  const hideActionBg = useThemeColor({ light: '#6b7280', dark: '#4b5563' }, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const selectedBgColor = useThemeColor({ light: '#e3f2fd', dark: '#1e3a5f' }, 'background');
  const iconPlaceholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2b2c' }, 'background');

  // スワイプは「非表示/表示」の切り替え（非破壊）。削除は編集画面・複数削除モードに集約した。
  const renderRightActions = () => {
    return (
      <Reanimated.View style={styles.deleteAction}>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: hideActionBg }]}
          onPress={onSwipeHide}
          activeOpacity={0.8}
        >
          <Ionicons name={feed.hiddenFromHome ? 'eye-outline' : 'eye-off-outline'} size={22} color="#fff" />
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

  const handlePress = () => {
    if (swipeableRef.current && getIsSwipeOpen()) {
      swipeableRef.current.close();
    }
    onToggleSelect();
  };

  const content = (
    <View style={[
      styles.feedItem,
      { backgroundColor, borderBottomColor: borderColor },
      isSelectionMode && isSelected && { backgroundColor: selectedBgColor },
    ]}>
      <View style={[styles.feedContent, feed.hiddenFromHome && styles.feedContentHidden]}>
        {feed.iconUrl ? (
          <Image
            source={{ uri: feed.iconUrl }}
            style={[styles.feedIconImage, { backgroundColor: iconPlaceholderBg }]}
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
      {feed.hiddenFromHome && !isSelectionMode && (
        <Ionicons name="eye-off-outline" size={18} color={subtextColor} style={styles.hiddenIndicator} />
      )}
      {isSelectionMode && (
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isSelected ? tintColor : borderColor}
          style={styles.selectIndicator}
        />
      )}
    </View>
  );

  if (isSelectionMode) {
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
      enabled={!isSelectionMode}
      rightThreshold={40}
      onSwipeableWillOpen={onSwipeableWillOpen}
      onSwipeableWillClose={() => onSwipeableWillClose(feed.id)}
      overshootRight={false}
    >
      <TouchableOpacity
        onPress={() => {
          if (getIsSwipeOpen() && swipeableRef.current) {
            swipeableRef.current.close();
          } else {
            onPressEdit();
          }
        }}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    </Swipeable>
  );
}, (prev, next) =>
  prev.feed === next.feed &&
  prev.isSelectionMode === next.isSelectionMode &&
  prev.isSelected === next.isSelected
);

export default function FeedsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [mode, setMode] = useState<SelectionMode>('none');
  const isSelectionMode = mode !== 'none';
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [currentSort, setCurrentSort] = useState<FeedSortType>('created_at_desc');
  const emptyIconColor = useThemeColor({}, 'tabIconDefault');

  // 各フィードのSwipeable refを管理
  const swipeableRefs = useRef<Map<string, React.RefObject<SwipeableMethods | null>>>(new Map());
  
  // 開いているスワイプのIDを保持（refで直接管理）
  const openSwipeIdRef = useRef<string | null>(null);

  // 選択中のフィードがすべて「非表示中」か。非表示モードのアクションを
  // 「非表示にする」/「表示に戻す」で切り替えるために使う（一括解除に対応）。
  const selectedAllHidden = React.useMemo(
    () => selectedIds.size > 0 && [...selectedIds].every((id) => feeds.find((f) => f.id === id)?.hiddenFromHome),
    [selectedIds, feeds]
  );

  // 初回チュートリアル（フィルタ追加画面から引き継ぎ）
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStartAtLast, setTutorialStartAtLast] = useState(false);
  const addRef = useRef<View>(null);
  const listRef = useRef<View>(null);

  const measureNode = React.useCallback(
    (ref: React.RefObject<View | null>): Promise<CoachRect | null> =>
      new Promise((resolve) => {
        const node = ref.current;
        if (!node) { resolve(null); return; }
        requestAnimationFrame(() => {
          node.measureInWindow((x, y, width, height) => {
            if (!width || !height) resolve(null);
            else resolve({ x, y, width, height });
          });
        });
      }),
    []
  );

  const tutorialSteps = React.useMemo<CoachStep[]>(() => [
    {
      // 下タブの「フィード」タブ(4つ中3番目)のアイコンを囲う
      measure: () => new Promise<CoachRect | null>((resolve) => {
        const { width } = Dimensions.get('window');
        const tabW = width / 4;
        const node = listRef.current;
        if (!node) { resolve(null); return; }
        node.measureInWindow((x, y, w, h) => {
          if (!h) { resolve(null); return; }
          const boxW = Math.min(tabW - 20, 58);
          const cx = tabW * 2 + (tabW - boxW) / 2; // 3番目(フィード)タブ中央
          resolve({ x: cx, y: y + h, width: boxW, height: 38 });
        });
      }),
      text: t('feeds.tutTabDesc'),
    },
    {
      measure: () => new Promise<CoachRect | null>((resolve) => {
        const node = listRef.current;
        if (!node) { resolve(null); return; }
        node.measureInWindow((x, y, width, height) => {
          if (!width || !height) resolve(null);
          else resolve({ x: x + 8, y: y + 6, width: width - 16, height: Math.min(110, Math.max(0, height - 12)) });
        });
      }),
      text: t('feeds.tutListDesc'),
    },
    { measure: () => measureNode(addRef), text: t('feeds.tutAddDesc') },
  ], [t, measureNode]);

  // フィルタ追加画面('1')or フィード追加画面からの戻り('last')でツアーを開始/再開
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(StorageKeys.tourFeeds).then((flag) => {
        if (flag === '1' || flag === 'last') {
          AsyncStorage.removeItem(StorageKeys.tourFeeds).catch(() => {});
          setTutorialStartAtLast(flag === 'last');
          setTutorialVisible(true);
        }
      }).catch(() => {});
    }, [])
  );

  // 最初のステップで「戻る」→ フィルタ追加画面のツアー最後へ戻る（再push）
  const handleTutorialBack = React.useCallback(async () => {
    setTutorialVisible(false);
    try { await AsyncStorage.setItem(StorageKeys.tourFilterEdit, 'last'); } catch {}
    router.push('/filter_edit');
  }, [router]);

  // 最後の「次へ」で、フィード追加画面へ進みツアー継続
  const handleTutorialDone = React.useCallback(async () => {
    setTutorialVisible(false);
    try { await AsyncStorage.setItem(StorageKeys.tourFeedAdd, '1'); } catch {}
    router.push('/feed_add');
  }, [router]);

  // フィードを読み込む
  const loadFeeds = React.useCallback(async () => {
    try {
      const feedList = await FeedService.listWithSort(currentSort);
      setFeeds(feedList);
    } catch (_) {
      ErrorHandler.showLoadError(t);
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
        }
        // 選択モードをオフ
        if (mode !== 'none') {
          setMode('none');
          setSelectedIds(new Set());
        }
      };
    }, [mode, loadFeeds])
  );

  // currentSort が変更されたときにフィルタを再読み込み
  React.useEffect(() => {
    loadFeeds();
  }, [currentSort, loadFeeds]);

  // feeds 更新時に削除済みフィードの swipeableRef をクリーンアップ
  React.useEffect(() => {
    const currentIds = new Set(feeds.map((f) => f.id));
    for (const id of swipeableRefs.current.keys()) {
      if (!currentIds.has(id)) {
        swipeableRefs.current.delete(id);
      }
    }
  }, [feeds]);


  const handlePressSortButton = () => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setSortModalVisible(true);
  };

  const handleSelectSort = (sortType: FeedSortType) => {
    setCurrentSort(sortType);
    setSortModalVisible(false);
  };

  const enterSelectionMode = (nextMode: 'delete' | 'hide') => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    setSelectedIds(new Set());
    setMode(nextMode);
  };

  const handlePressDelete = () => enterSelectionMode('delete');
  const handlePressHide = () => enterSelectionMode('hide');

  const handlePressAdd = () => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    router.push('/feed_add');
  };

  const handlePressEdit = (feedId: string) => {
    closeOpenSwipe();
    openSwipeIdRef.current = null;
    router.push(`/feed_edit?feedId=${feedId}`);
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

  const handleCancelSelection = () => {
    setMode('none');
    setSelectedIds(new Set());
  };

  // すべて選択 / 全解除のトグル
  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === feeds.length ? new Set() : new Set(feeds.map((f) => f.id))));
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
            setMode('none');
            setSelectedIds(new Set());
            await loadFeeds();
          } catch (_) {
            ErrorHandler.showDatabaseError(t, t('feeds.deleteError'));
          }
        },
      },
    ]);
  };

  // 選択したフィードをまとめて非表示／表示にする（非破壊なので確認ダイアログは出さない）。
  // 選択がすべて非表示中なら「表示に戻す」、それ以外は「非表示にする」に切り替わる。
  const handleConfirmHide = async () => {
    if (selectedIds.size === 0) return;
    const targetHidden = !selectedAllHidden;
    try {
      for (const id of selectedIds) {
        await FeedService.setHiddenFromHome(id, targetHidden);
      }
      setMode('none');
      setSelectedIds(new Set());
      await loadFeeds();
    } catch (_) {
      ErrorHandler.showDatabaseError(t, t('feeds.saveError'));
    }
  };

  // スワイプで単一フィードの非表示/表示をトグル（非破壊なので確認なし）。
  // 閉じアニメーションを妨げないよう、DB反映と行の見た目更新はアニメ完了後に行う
  // （全体 loadFeeds ではなく該当行だけを楽観的に差し替えて再レンダリングを最小化）。
  const handleSwipeHide = (feed: Feed) => {
    const ref = swipeableRefs.current.get(feed.id);
    ref?.current?.close();
    if (openSwipeIdRef.current === feed.id) {
      openSwipeIdRef.current = null;
    }
    const nextHidden = !feed.hiddenFromHome;
    setTimeout(() => {
      FeedService.setHiddenFromHome(feed.id, nextHidden)
        .then(() => {
          setFeeds((prev) => prev.map((f) => (f.id === feed.id ? { ...f, hiddenFromHome: nextHidden } : f)));
        })
        .catch(() => ErrorHandler.showDatabaseError(t, t('feeds.saveError')));
    }, 260);
  };

  const handleSwipeableWillOpen = (feedId: string) => {
    // 古いスワイプを閉じる（新しいIDは除外）
    closeOpenSwipe(feedId);
    // 開いているIDは ref のみで管理する（state にすると開閉のたびに一覧全体が
    // 再レンダリングされ、閉じアニメーションが途中で止まってカクつくため）
    openSwipeIdRef.current = feedId;
  };

  const handleSwipeableWillClose = (feedId: string) => {
    // 自分が開いていた場合のみクリア
    if (openSwipeIdRef.current === feedId) {
      openSwipeIdRef.current = null;
    }
  };

  const backgroundColor = useThemeColor({}, 'background');

  return (
    <>
      {/* Expo Router のヘッダーを非表示 */}
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        {mode !== 'none' ? (
          <FeedsHeaderSelectionMode
            mode={mode}
            unhideMode={selectedAllHidden}
            selectedCount={selectedIds.size}
            allSelected={feeds.length > 0 && selectedIds.size === feeds.length}
            onPressCancel={handleCancelSelection}
            onPressSelectAll={handleToggleSelectAll}
            onPressAction={mode === 'delete' ? handleConfirmDelete : handleConfirmHide}
          />
        ) : (
          <FeedsHeader
            onPressSort={handlePressSortButton}
            onPressHide={handlePressHide}
            onPressDelete={handlePressDelete}
            onPressAdd={handlePressAdd}
            addRef={addRef}
          />
        )}

        <View ref={listRef} style={styles.listWrapper}>
        <FlatList
          data={feeds}
          renderItem={({ item }) => {
            const swipeableRef = getSwipeableRef(item.id);
            return (
              <FeedItem
                feed={item}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(item.id)}
                getIsSwipeOpen={() => openSwipeIdRef.current === item.id}
                onToggleSelect={() => handleToggleSelect(item.id)}
                onSwipeHide={() => handleSwipeHide(item)}
                onPressEdit={() => handlePressEdit(item.id)}
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
              <Ionicons name="logo-rss" size={64} color={emptyIconColor} style={styles.emptyIcon} />
              <ThemedText style={styles.emptyMessage}>{t('feeds.noFeeds')}</ThemedText>
              <ThemedText style={styles.emptyHint}>{t('feeds.noFeedsHint')}</ThemedText>
            </View>
          }
        />
        </View>

        <FeedSortModal
          visible={sortModalVisible}
          currentSort={currentSort}
          onClose={() => setSortModalVisible(false)}
          onSelectSort={handleSelectSort}
        />

        <CoachMarks
          visible={tutorialVisible}
          steps={tutorialSteps}
          onDone={handleTutorialDone}
          continues
          startAtLast={tutorialStartAtLast}
          onBackBeforeFirst={handleTutorialBack}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listWrapper: {
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
  headerSideLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerSideRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteTextDisabled: {
    opacity: 0.4,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  selectIndicator: {
    marginLeft: 12,
  },
  checkboxText: {
    fontSize: 24,
  },
  feedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedContentHidden: {
    opacity: 0.45,
  },
  hiddenIndicator: {
    marginLeft: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyMessage: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    opacity: 0.6,
  },
});
