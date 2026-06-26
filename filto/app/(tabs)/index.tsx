import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Image,
  Animated,
  Alert,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Article } from '@/types/Article';
import { FeedSelectModal } from '@/components/FeedSelectModal';
import { FeedSortType } from '@/components/FeedSortModal';
import { CoachMarks, CoachStep, CoachRect } from '@/components/CoachMarks';
import { Feed } from '@/types/Feed';
import { FilterEngine } from '@/services/FilterEngine';
import { FilterService, Filter } from '@/services/FilterService';
import { FeedService } from '@/services/FeedService';
import { ArticleService } from '@/services/ArticleService';
import { ArticleRepository } from '@/repositories/ArticleRepository';
import { SyncService } from '@/services/SyncService';
import { GlobalAllowKeywordService } from '@/services/GlobalAllowKeywordService';
import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReadDisplayMode } from '../display_behavior';
import { Ionicons } from '@expo/vector-icons';
import { ErrorHandler } from '@/utils/errorHandler';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { LoadingView } from '@/components/LoadingView';

const ACCENT = '#0a7ea4';
const SCROLLBAR_INSET = 4; // スクロールバー上下の余白
const SCROLL_TOP_THRESHOLD = 500; // この位置を超えたら「トップへ戻る」ボタンを表示

// 経過時間を計算
const getTimeAgo = (publishedAt: string, justNow: string): string => {
  const now = Date.now();
  const published = new Date(publishedAt).getTime();
  const diff = now - published;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return justNow;
};

// 記事アイテムコンポーネント
const ArticleItem = React.memo<{
  article: Article;
  onPress: (article: Article) => void;
  onLongPress: (article: Article) => void;
  highlightAnim: Animated.Value;
  isBlocked?: boolean;
}>(({ article, onPress, onLongPress, highlightAnim, isBlocked = false }) => {
  const { t } = useTranslation();
  const timeAgo = getTimeAgo(article.publishedAt, t('home.justNow'));

  const bgColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const subtextColor = useThemeColor({}, 'icon');
  const placeholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2b2c' }, 'background');
  const highlightColor = useThemeColor({ light: '#fff3cd', dark: '#3a3520' }, 'background');

  // ハイライトアニメーション用の背景色（テーマ対応）
  const animatedBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [bgColor, highlightColor],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(article)}
      onLongPress={() => onLongPress(article)}
    >
      <Animated.View
        style={[
          styles.articleContainer,
          { backgroundColor: animatedBg, borderBottomColor: borderColor },
          (article.isRead || isBlocked) && styles.readContainer,
        ]}
      >
        <View style={styles.articleContent}>
          {article.thumbnailUrl ? (
            <Image
              source={{ uri: article.thumbnailUrl }}
              style={[styles.thumbnail, { backgroundColor: placeholderBg }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: placeholderBg }]}>
              <Ionicons name="newspaper-outline" size={24} color={subtextColor} />
            </View>
          )}

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: textColor }, (article.isRead || isBlocked) && { color: subtextColor, fontWeight: '400' }]}
                numberOfLines={2}
              >
                {article.title}
              </Text>
              {article.isStarred && (
                <Ionicons name="star" size={14} color="#f59e0b" style={{ marginTop: 2 }} />
              )}
            </View>
            <View style={styles.metaContainer}>
              {isBlocked && (
                <>
                  <Ionicons name="funnel" size={11} color={subtextColor} style={{ marginRight: 3 }} />
                  <Text style={[styles.metaText, { color: subtextColor }]}>{t('home.filteredLabel')}</Text>
                  <Text style={[styles.separator, { color: subtextColor }]}>/</Text>
                </>
              )}
              <Text style={[styles.metaText, { color: subtextColor }]}>
                {article.feedName}
              </Text>
              <Text style={[styles.separator, { color: subtextColor }]}>/</Text>
              <Text style={[styles.metaText, { color: subtextColor }]}>
                {timeAgo}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

// ヘッダーコンポーネント
const HomeHeader: React.FC<{
  feedName: string;
  showStarredOnly: boolean;
  onPressFeedSelect: () => void;
  onPressStarFilter: () => void;
  onPressRefresh: () => void;
  feedSelectorRef: React.RefObject<View | null>;
  refreshRef: React.RefObject<View | null>;
}> = ({ feedName, showStarredOnly, onPressFeedSelect, onPressStarFilter, onPressRefresh, feedSelectorRef, refreshRef }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'icon');
  const starBtnBg = useThemeColor({ light: '#f5f5f5', dark: '#2a2b2c' }, 'background');
  const starBtnActiveBg = useThemeColor({ light: '#fff3cd', dark: '#3a3520' }, 'background');

  return (
    <View style={[styles.headerContainer, { borderBottomColor: borderColor, backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity
          ref={feedSelectorRef}
          style={styles.feedSelector}
          onPress={onPressFeedSelect}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.feedName}>{feedName}</ThemedText>
          <Ionicons name="chevron-down" size={16} color={iconColor} />
        </TouchableOpacity>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.starButton, { backgroundColor: showStarredOnly ? starBtnActiveBg : starBtnBg }]}
            onPress={onPressStarFilter}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={18} color={showStarredOnly ? '#f59e0b' : iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            ref={refreshRef}
            style={styles.refreshButton}
            onPress={onPressRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={22} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [feeds, setFeeds] = React.useState<Feed[]>([]);
  const [selectedFeedIds, setSelectedFeedIds] = React.useState<string[] | null>(null);
  const [showStarredOnly, setShowStarredOnly] = React.useState(false);
  const [feedModalVisible, setFeedModalVisible] = React.useState(false);
  const [feedSort, setFeedSort] = React.useState<FeedSortType>('created_at_desc');

  // フィルタ関連
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [globalAllowKeywords, setGlobalAllowKeywords] = React.useState<GlobalAllowKeyword[]>([]);
  const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);
  const [blockedByFilters, setBlockedByFilters] = React.useState(0);
  // ブロックされた記事を（淡色で）表示するかどうか
  const [showBlockedKeywords, setShowBlockedKeywords] = React.useState(false);
  const [blockedKeywordIds, setBlockedKeywordIds] = React.useState<Set<string>>(new Set());

  // Display & Behavior（既読表示など）
  const [readDisplay, setReadDisplay] = React.useState<ReadDisplayMode>('dim');

  // 起動時自動同期の実行済みフラグ
  const [hasAutoSynced, setHasAutoSynced] = React.useState(false);

  // スクロール位置保持
  const flatListRef = React.useRef<FlatList>(null);
  const isInitialLoad = React.useRef(true);

  // 初回チュートリアル（コーチマーク）
  const insets = useSafeAreaInsets();
  const [tutorialVisible, setTutorialVisible] = React.useState(false);
  const [tutorialPending, setTutorialPending] = React.useState(false);
  // ツアー終了後、まだ実記事が無ければ準備スピナーで待つ
  const [waitingArticles, setWaitingArticles] = React.useState(false);
  const filteredCountRef = React.useRef(0);
  const feedSelectorRef = React.useRef<View>(null);
  const refreshRef = React.useRef<View>(null);
  const filterBarRef = React.useRef<View>(null);
  const listWrapperRef = React.useRef<View>(null);

  // スクロール連動（カスタムスクロールバー / トップへ戻るボタン）
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const scrollTopAnim = React.useRef(new Animated.Value(0)).current;
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [listViewportH, setListViewportH] = React.useState(0);
  const [listContentH, setListContentH] = React.useState(0);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = React.useState(false);

  // スクロールバーのドラッグ操作用（PanResponderは最新値をrefから読む）
  const scrollOffsetRef = React.useRef(0);
  const dragStartOffsetRef = React.useRef(0);
  const scrollbarGeomRef = React.useRef({ trackH: 0, thumbH: 0, maxScroll: 0 });

  const scrollbarPan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartOffsetRef.current = scrollOffsetRef.current;
        setIsDraggingScrollbar(true);
      },
      onPanResponderMove: (_evt, gesture) => {
        const { trackH, thumbH, maxScroll } = scrollbarGeomRef.current;
        const denom = trackH - thumbH;
        if (denom <= 0 || maxScroll <= 0) return;
        let offset = dragStartOffsetRef.current + (gesture.dy / denom) * maxScroll;
        offset = Math.max(0, Math.min(maxScroll, offset));
        flatListRef.current?.scrollToOffset({ offset, animated: false });
      },
      onPanResponderRelease: () => setIsDraggingScrollbar(false),
      onPanResponderTerminate: () => setIsDraggingScrollbar(false),
    })
  ).current;

  // ハイライトアニメーション用（記事IDごとに管理）
  const highlightAnims = React.useRef<Map<string, Animated.Value>>(new Map());

  // 記事のハイライトアニメーションを取得または作成
  const getHighlightAnim = React.useCallback((articleId: string): Animated.Value => {
    if (!highlightAnims.current.has(articleId)) {
      highlightAnims.current.set(articleId, new Animated.Value(0));
    }
    return highlightAnims.current.get(articleId)!;
  }, []);

  // 表示対象外になった記事のアニメーションオブジェクトを解放（メモリリーク防止）
  React.useEffect(() => {
    const currentIds = new Set(filteredArticles.map(a => a.id));
    for (const id of highlightAnims.current.keys()) {
      if (!currentIds.has(id)) {
        highlightAnims.current.delete(id);
      }
    }
  }, [filteredArticles]);

  // 選択中のフィード名を取得
  const selectedFeedName = React.useMemo(() => {
    if (selectedFeedIds === null) return t('home.allFeeds');
    if (selectedFeedIds.length === 1) {
      const feed = feeds.find(f => f.id === selectedFeedIds[0]);
      return feed?.title || t('home.allFeeds');
    }
    return t('home.feedsSelected', { count: selectedFeedIds.length });
  }, [selectedFeedIds, feeds, t]);

  // データを読み込む（showLoading=falseの場合はスピナーを出さずバックグラウンド更新）
  const loadData = React.useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);

      // フィード一覧を取得（選択中のソート順で）
      const feedList = await FeedService.listWithSort(feedSort);
      setFeeds(feedList);

      // 記事一覧を取得
      const articleList = await ArticleService.getArticles();
      setArticles(articleList);

      // フィルタ一覧を取得
      const filterList = await FilterService.list();
      setFilters(filterList);

      // グローバル許可キーワード一覧を取得
      const globalAllowList = await GlobalAllowKeywordService.list();
      setGlobalAllowKeywords(globalAllowList);

      // Display & Behavior の設定を取得
      const savedReadDisplay = await AsyncStorage.getItem('@filto/display_behavior/readDisplay');
      if (savedReadDisplay === 'dim' || savedReadDisplay === 'hide') {
        setReadDisplay(savedReadDisplay);
      }
    } catch (error) {
      ErrorHandler.showLoadError(t);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [feedSort]);

  // 保存済みのフィード並び順を読み込む
  React.useEffect(() => {
    AsyncStorage.getItem('@filto/home/feedSort')
      .then(saved => { if (saved) setFeedSort(saved as FeedSortType); })
      .catch(() => {});
  }, []);

  // フィード並び順を変更・永続化する
  const handleSelectFeedSort = React.useCallback((sortType: FeedSortType) => {
    setFeedSort(sortType);
    AsyncStorage.setItem('@filto/home/feedSort', sortType).catch(() => {});
  }, []);

  // チュートリアル: 対象要素を実測してハイライト位置を返す
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
    { measure: () => measureNode(feedSelectorRef), title: t('home.tutFeedTitle'), desc: t('home.tutFeedDesc') },
    { measure: () => measureNode(refreshRef), title: t('home.tutRefreshTitle'), desc: t('home.tutRefreshDesc') },
    {
      // 記事リストの先頭付近をハイライト（長押しでお気に入り）
      measure: () => new Promise<CoachRect | null>((resolve) => {
        const node = listWrapperRef.current;
        if (!node) { resolve(null); return; }
        node.measureInWindow((x, y, width, height) => {
          if (!width || !height) resolve(null);
          else resolve({ x: x + 8, y: y + 6, width: width - 16, height: Math.min(96, Math.max(0, height - 12)) });
        });
      }),
      title: t('home.tutStarTitle'), desc: t('home.tutStarDesc'),
    },
    { measure: () => measureNode(filterBarRef), title: t('home.tutFilterTitle'), desc: t('home.tutFilterDesc') },
    {
      // 下タブ: リスト領域の下端＝タブバー上端を実測して、その下を囲う
      measure: () => new Promise<CoachRect | null>((resolve) => {
        const { width, height } = Dimensions.get('window');
        const fallbackTop = height - (49 + insets.bottom);
        const node = listWrapperRef.current;
        if (!node) { resolve({ x: 0, y: fallbackTop, width, height: height - fallbackTop }); return; }
        node.measureInWindow((x, y, w, h) => {
          const top = (y && h) ? y + h : fallbackTop;
          resolve({ x: 0, y: top, width, height: Math.max(0, height - top) });
        });
      }),
      title: t('home.tutTabsTitle'), desc: t('home.tutTabsDesc'),
    },
  ], [t, measureNode, insets.bottom]);

  // ツアー中に背景へ出すダミー記事（実記事が届くまでの間、③長押し・④フィルタの
  // 説明対象を成立させるため）
  const dummyArticles = React.useMemo<Article[]>(() => {
    const now = Date.now();
    return [1, 2, 3].map((n, i) => ({
      id: `__demo_${n}`,
      feedId: '__demo',
      feedName: t('home.demoFeed'),
      title: t(`home.demoTitle${n}`),
      link: '',
      thumbnailUrl: undefined,
      publishedAt: new Date(now - (i + 1) * 3600 * 1000).toISOString(),
      isRead: false,
      isStarred: false,
    }));
  }, [t]);

  // 初回（オンボーディング直後）にチュートリアルを開始。ダミー記事とツアーを
  // ほぼ同時に出す（待たせない）
  React.useEffect(() => {
    if (isLoading) return;
    AsyncStorage.getItem('@filto/home/startTutorial').then((flag) => {
      if (flag === '1') {
        setTutorialPending(true);
        setTutorialVisible(true);
      }
    }).catch(() => {});
  }, [isLoading]);

  // 実記事が届いたら準備スピナーを解除
  React.useEffect(() => {
    filteredCountRef.current = filteredArticles.length;
    if (filteredArticles.length > 0) setWaitingArticles(false);
  }, [filteredArticles.length]);

  const handleTutorialDone = React.useCallback(() => {
    setTutorialVisible(false);
    setTutorialPending(false);
    AsyncStorage.removeItem('@filto/home/startTutorial').catch(() => {});
    AsyncStorage.setItem('@filto/home/tutorialSeen', 'true').catch(() => {});
    // まだ実記事が届いていなければ、空のホームを見せずに準備スピナーで待つ
    if (filteredCountRef.current === 0) {
      setWaitingArticles(true);
      setTimeout(() => setWaitingArticles(false), 30000); // 取得不能時のフォールバック
    }
  }, []);

  // 画面フォーカス時にデータを読み込む
  // 初回のみスピナーを表示し、タブ切り替えで戻った時はスクロール位置を保持したまま更新
  useFocusEffect(
    React.useCallback(() => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        loadData(true);
      } else {
        loadData(false);
      }
    }, [loadData])
  );

  // 起動時自動同期（一度だけ実行）
  React.useEffect(() => {
    const autoSync = async () => {
      if (hasAutoSynced) {
        return;
      }

      try {
        // 設定を確認
        const autoSyncEnabled = await AsyncStorage.getItem('@filto/display_behavior/autoSyncOnStartup');
        if (autoSyncEnabled === 'false') {
          setHasAutoSynced(true); // 無効の場合も実行済みフラグを立てる
          return;
        }

        // バックグラウンドで同期実行
        await SyncService.refresh();

        // データを再読み込み（スピナーを出さず＝FlatListを再マウントせず、
        // 閲覧中のスクロール位置を保ったまま更新する）
        await loadData(false);

        setHasAutoSynced(true);
      } catch (_) {
        // エラーでもアプリは正常に動作
        setHasAutoSynced(true);
      }
    };

    autoSync();
  }, [hasAutoSynced, loadData]);

  // フィルタ適用
  React.useEffect(() => {
    // フィードでフィルタリング
    let filtered = articles;
    if (selectedFeedIds !== null) {
      filtered = articles.filter(a => selectedFeedIds.includes(a.feedId));
    }

    // お気に入りフィルタを適用
    if (showStarredOnly) {
      filtered = filtered.filter(a => a.isStarred);
    }

    // グローバル許可キーワードを文字列配列に変換
    const allowKeywords = globalAllowKeywords.map(k => k.keyword);

    // フィルタエンジンで評価（ブロック対象を除外せず印を付ける）
    const blockedIds = new Set<string>();
    for (const article of filtered) {
      if (FilterEngine.evaluate(article, filters, allowKeywords)) {
        blockedIds.add(article.id);
      }
    }
    setBlockedKeywordIds(blockedIds);
    setBlockedByFilters(blockedIds.size);

    // 通常はブロック記事を非表示。「表示する」がONのときは順序を保ったまま含める
    let displayed = showBlockedKeywords
      ? filtered
      : filtered.filter(a => !blockedIds.has(a.id));

    // 既読表示設定に基づいてフィルタリング
    if (readDisplay === 'hide') {
      displayed = displayed.filter(a => !a.isRead);
    }

    setFilteredArticles(displayed);
  }, [articles, selectedFeedIds, showStarredOnly, filters, globalAllowKeywords, readDisplay, showBlockedKeywords]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);

      // RSS同期を実行
      const result = await SyncService.refresh();

      if (result.offline) {
        Alert.alert(t('common.error'), t('home.offlineError'));
        return;
      }


      // データを再読み込み（RefreshControlが既にスピナーを出すので再マウントしない）
      await loadData(false);

      // 手動更新は明示操作なので、最新記事を見せるため先頭へ
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (_) {
      ErrorHandler.showSyncError(t);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, t]);

  // スクロール監視（バー連動 + ボタン表示切替）
  const handleScroll = React.useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollOffsetRef.current = y;
          setShowScrollTop(y > SCROLL_TOP_THRESHOLD);
        },
      }),
    [scrollY]
  );

  const handleScrollToTop = React.useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // 「トップへ戻る」ボタンのフェード
  React.useEffect(() => {
    Animated.timing(scrollTopAnim, {
      toValue: showScrollTop ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showScrollTop, scrollTopAnim]);

  const handleFeedSelect = React.useCallback(() => {
    setFeedModalVisible(true);
  }, []);

  const handleSelectFeeds = React.useCallback((feedIds: string[] | null) => {
    setSelectedFeedIds(feedIds);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const handleToggleStarFilter = React.useCallback(() => {
    setShowStarredOnly(prev => !prev);
  }, []);

  const handlePressArticle = React.useCallback(async (article: Article) => {
    try {
      // 記事を既読にする
      await ArticleService.markRead(article.id);
      
      // ローカルの状態も更新
      setArticles(prev => 
        prev.map(a => a.id === article.id ? { ...a, isRead: true } : a)
      );
      
      // ブラウザで開く
      await Linking.openURL(article.link);
    } catch (_) {
      ErrorHandler.showGenericError(t, t('home.articleOpenError'));
    }
  }, []);

  const handleLongPressArticle = React.useCallback(async (article: Article) => {
    try {
      // 現在の状態を取得（追加か削除か）
      const isAdding = !article.isStarred;
      
      // お気に入りを切り替え
      await ArticleRepository.toggleStarred(article.id);
      
      // ハプティックフィードバック（軽い振動）
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // ハイライトアニメーション
      const anim = getHighlightAnim(article.id);
      
      if (isAdding) {
        // 追加時: 素早く2回光る（パパッと）
        Animated.sequence([
          // 1回目
          Animated.timing(anim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: false,
          }),
          // 2回目
          Animated.timing(anim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        // 削除時: 1回光る
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
      }
      
      // ローカルの状態も更新
      setArticles(prev => 
        prev.map(a => a.id === article.id ? { ...a, isStarred: !a.isStarred } : a)
      );
    } catch (_) {
      ErrorHandler.showDatabaseError(t, t('home.favoriteError'));
    }
  }, []);

  const renderItem = React.useCallback(({ item }: { item: Article }) => (
    <ArticleItem
      article={item}
      onPress={handlePressArticle}
      onLongPress={handleLongPressArticle}
      highlightAnim={getHighlightAnim(item.id)}
      isBlocked={blockedKeywordIds.has(item.id)}
    />
  ), [handlePressArticle, handleLongPressArticle, getHighlightAnim, blockedKeywordIds]);

  const backgroundColor = useThemeColor({}, 'background');
  const emptyIconColor = useThemeColor({}, 'tabIconDefault');

  const filterBarBg = useThemeColor({ light: '#f0f4ff', dark: '#1a1f2e' }, 'background');
  const filterBarText = useThemeColor({ light: '#4a6fa5', dark: '#7aa2d4' }, 'text');
  const scrollbarColor = useThemeColor({ light: 'rgba(0,0,0,0.25)', dark: 'rgba(255,255,255,0.3)' }, 'text');

  // カスタムスクロールバーのつまみ位置・サイズを算出
  const maxScroll = Math.max(0, listContentH - listViewportH);
  const showScrollbar = maxScroll > 0 && listViewportH > 0;
  const trackH = Math.max(0, listViewportH - SCROLLBAR_INSET * 2);
  const thumbH = showScrollbar ? Math.max(36, trackH * (listViewportH / listContentH)) : 0;
  const thumbTranslateY = scrollY.interpolate({
    inputRange: [0, maxScroll || 1],
    outputRange: [0, Math.max(0, trackH - thumbH)],
    extrapolate: 'clamp',
  });
  // PanResponderが参照する最新ジオメトリを保持
  scrollbarGeomRef.current = { trackH, thumbH, maxScroll };

  // 初回ツアー中で実記事がまだ無いときは、ダミー記事とサンプルのフィルタ件数を表示する
  const showTutorialDemo = (tutorialVisible || tutorialPending) && filteredArticles.length === 0;
  const displayArticles = showTutorialDemo ? dummyArticles : filteredArticles;
  const displayBlockedCount = showTutorialDemo ? 8 : blockedByFilters;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <HomeHeader
        feedName={selectedFeedName}
        showStarredOnly={showStarredOnly}
        onPressFeedSelect={handleFeedSelect}
        onPressStarFilter={handleToggleStarFilter}
        onPressRefresh={handleRefresh}
        feedSelectorRef={feedSelectorRef}
        refreshRef={refreshRef}
      />

      {displayBlockedCount > 0 && (
        <TouchableOpacity
          ref={filterBarRef}
          style={[styles.filterBar, { backgroundColor: filterBarBg }]}
          onPress={() => setShowBlockedKeywords(prev => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons name="funnel" size={12} color={filterBarText} style={styles.filterBarIcon} />
          <Text style={[styles.filterBarText, { color: filterBarText, flex: 1 }]}>
            {showBlockedKeywords
              ? t('home.articlesFilteredShown')
              : t('home.articlesFiltered', { count: displayBlockedCount })}
          </Text>
          <Text style={[styles.filterBarAction, { color: filterBarText }]}>
            {showBlockedKeywords ? t('home.hide') : t('home.show')}
          </Text>
          <Ionicons
            name={showBlockedKeywords ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={filterBarText}
            style={styles.filterBarChevron}
          />
        </TouchableOpacity>
      )}

      {isLoading ? (
        <LoadingView />
      ) : (
        <View
          ref={listWrapperRef}
          style={styles.listWrapper}
          onLayout={(e) => setListViewportH(e.nativeEvent.layout.height)}
        >
          <FlatList
            ref={flatListRef}
            data={displayArticles}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(_, h) => setListContentH(h)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="newspaper-outline" size={64} color={emptyIconColor} style={styles.emptyIcon} />
                <ThemedText style={styles.emptyMessage}>{t('home.noArticles')}</ThemedText>
                <ThemedText style={styles.emptyHint}>{t('home.noArticlesHint')}</ThemedText>
              </View>
            }
          />

          {/* 常時表示・ドラッグ可能なカスタムスクロールバー */}
          {showScrollbar && (
            <View
              style={[styles.scrollbarTrack, { top: SCROLLBAR_INSET, height: trackH }]}
              pointerEvents="box-none"
            >
              <Animated.View
                style={[
                  styles.scrollbarThumb,
                  isDraggingScrollbar && styles.scrollbarThumbActive,
                  { height: thumbH, backgroundColor: scrollbarColor, transform: [{ translateY: thumbTranslateY }] },
                ]}
                hitSlop={{ left: 18, right: 8, top: 6, bottom: 6 }}
                {...scrollbarPan.panHandlers}
              />
            </View>
          )}

          {/* 一番上に戻るボタン */}
          <Animated.View
            style={[
              styles.scrollTopWrap,
              {
                opacity: scrollTopAnim,
                transform: [{ scale: scrollTopAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
              },
            ]}
            pointerEvents={showScrollTop ? 'auto' : 'none'}
          >
            <TouchableOpacity
              style={styles.scrollTopBtn}
              onPress={handleScrollToTop}
              activeOpacity={0.8}
              accessibilityLabel={t('home.scrollToTop')}
            >
              <Ionicons name="chevron-up" size={26} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* フィード選択モーダル */}
      <FeedSelectModal
        visible={feedModalVisible}
        feeds={feeds}
        selectedFeedIds={selectedFeedIds}
        currentSort={feedSort}
        onClose={() => setFeedModalVisible(false)}
        onSelectFeeds={handleSelectFeeds}
        onSelectSort={handleSelectFeedSort}
      />

      {/* 初回の使い方ツアー（実画面の要素を指すコーチマーク） */}
      <CoachMarks
        visible={tutorialVisible}
        steps={tutorialSteps}
        onDone={handleTutorialDone}
      />

      {/* ツアー終了後、まだ記事が無いときの準備スピナー（Modalで全面を覆い、
          下タブの遷移もブロックする） */}
      <Modal visible={waitingArticles} animationType="fade" onRequestClose={() => {}}>
        <View style={[styles.waitingOverlay, { backgroundColor }]}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={[styles.waitingText, { color: emptyIconColor }]}>
            {t('home.preparingArticles')}
          </Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  feedSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedName: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  dropdownIcon: {
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starButtonIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  refreshButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  filterBarIcon: {
    marginRight: 6,
  },
  filterBarText: {
    fontSize: 12,
  },
  filterBarAction: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterBarChevron: {
    marginLeft: 2,
  },
  listWrapper: {
    flex: 1,
  },
  waitingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  waitingText: {
    fontSize: 15,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  scrollbarTrack: {
    position: 'absolute',
    right: 2,
    width: 16,
    alignItems: 'flex-end',
  },
  scrollbarThumb: {
    width: 6,
    borderRadius: 3,
  },
  scrollbarThumbActive: {
    width: 10,
    borderRadius: 5,
  },
  scrollTopWrap: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
  scrollTopBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  articleContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  readContainer: {
    opacity: 0.6,
  },
  articleContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  thumbnailIcon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  starIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 4,
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