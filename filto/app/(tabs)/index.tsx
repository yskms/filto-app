import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
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
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
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
import { StorageKeys } from '@/constants/storageKeys';
import type { ReadDisplayMode } from '../display_behavior';
import { Ionicons } from '@expo/vector-icons';
import { ErrorHandler } from '@/utils/errorHandler';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { LoadingView } from '@/components/LoadingView';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { RectButton } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import { useToast } from '@/providers/toast';
import { ArticleActionSheet } from '@/components/ArticleActionSheet';

const ACCENT = '#0a7ea4';
const SCROLLBAR_INSET = 4; // スクロールバー上下の余白
const SCROLL_TOP_THRESHOLD = 250; // この位置を超えたら「トップへ戻る」ボタンを表示

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
// ホームの記事レイアウト（コンパクト＝小サムネ／ラージ＝全幅大画像）
type LayoutMode = 'compact' | 'large';

const ArticleItem = React.memo<{
  article: Article;
  onPress: (article: Article) => void;
  onLongPress: (article: Article) => void;
  onHide: (article: Article) => void;
  onRestore: (article: Article) => void;
  onFavorite: (article: Article) => void;
  swipeableRef: React.RefObject<SwipeableMethods | null>;
  getIsSwipeOpen: (id: string) => boolean;
  onSwipeableWillOpen: (id: string) => void;
  onSwipeableWillClose: (id: string) => void;
  highlightAnim: Animated.Value;
  isBlocked?: boolean;
  isHidden?: boolean;
  large?: boolean;
}>(({ article, onPress, onLongPress, onHide, onRestore, onFavorite, swipeableRef, getIsSwipeOpen, onSwipeableWillOpen, onSwipeableWillClose, highlightAnim, isBlocked = false, isHidden = false, large = false }) => {
  const { t } = useTranslation();
  const timeAgo = getTimeAgo(article.publishedAt, t('home.justNow'));

  const bgColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const subtextColor = useThemeColor({}, 'icon');
  const placeholderBg = useThemeColor({ light: '#f0f0f0', dark: '#2a2b2c' }, 'background');
  const highlightColor = useThemeColor({ light: '#fff3cd', dark: '#3a3520' }, 'background');
  const hideActionBg = useThemeColor({ light: '#6b7280', dark: '#4b5563' }, 'background');

  // ハイライトアニメーション用の背景色（テーマ対応）
  const animatedBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [bgColor, highlightColor],
  });

  // 右スワイプで「非表示 / 表示に戻す」。非表示は完全除外だが is_hidden で残し復元可能。
  // Swipeable のアクション内は RNGH の RectButton を使う（プレーンな Touchable は
  // 左アクションでタップを取りこぼすため）。RectButton は親を自然に埋める。
  const renderRightActions = () => (
    <Reanimated.View style={styles.hideAction}>
      <RectButton
        style={[styles.actionButton, { backgroundColor: hideActionBg }]}
        rippleColor="rgba(255,255,255,0.35)"
        onPress={() => {
          swipeableRef.current?.close();
          if (isHidden) onRestore(article);
          else onHide(article);
        }}
      >
        <Ionicons name={isHidden ? 'eye-outline' : 'eye-off-outline'} size={22} color="#fff" />
      </RectButton>
    </Reanimated.View>
  );

  // 左スワイプ（逆スワイプ）でお気に入りをトグル。
  const renderLeftActions = () => (
    <Reanimated.View style={styles.favAction}>
      <RectButton
        style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
        rippleColor="rgba(255,255,255,0.35)"
        onPress={() => {
          swipeableRef.current?.close();
          onFavorite(article);
        }}
      >
        <Ionicons name={article.isStarred ? 'star' : 'star-outline'} size={22} color="#fff" />
      </RectButton>
    </Reanimated.View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      rightThreshold={40}
      leftThreshold={40}
      overshootRight={false}
      overshootLeft={false}
      onSwipeableWillOpen={() => onSwipeableWillOpen(article.id)}
      onSwipeableWillClose={() => onSwipeableWillClose(article.id)}
    >
    <TouchableOpacity
      activeOpacity={0.7}
      // 不透明な背景を敷く。既読/淡色行は opacity 0.6 のため、これが無いと
      // スワイプを閉じる際に裏のグレー領域（非表示アクション）が透けて見えてしまう。
      style={{ backgroundColor: bgColor }}
      onPress={() => {
        // スワイプが開いていればタップで閉じる（記事は開かない）
        if (getIsSwipeOpen(article.id) && swipeableRef.current) {
          swipeableRef.current.close();
        } else {
          onPress(article);
        }
      }}
      onLongPress={() => onLongPress(article)}
    >
      <Animated.View
        style={[
          styles.articleContainer,
          { backgroundColor: animatedBg, borderBottomColor: borderColor },
          (article.isRead || isBlocked) && styles.readContainer,
        ]}
      >
        <View style={large ? styles.articleContentLarge : styles.articleContent}>
          {article.thumbnailUrl ? (
            <Image
              source={{ uri: article.thumbnailUrl }}
              style={[large ? styles.thumbnailLarge : styles.thumbnail, { backgroundColor: placeholderBg }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[large ? styles.thumbnailPlaceholderLarge : styles.thumbnailPlaceholder, { backgroundColor: placeholderBg }]}>
              <Ionicons name="newspaper-outline" size={large ? 40 : 24} color={subtextColor} />
            </View>
          )}

          <View style={large ? styles.textContainerLarge : styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: textColor }, (article.isRead || isBlocked) && { color: subtextColor, fontWeight: '400' }]}
                numberOfLines={large ? 3 : 2}
              >
                {article.title}
              </Text>
              {isHidden && (
                <Ionicons name="eye-off" size={14} color={subtextColor} style={{ marginTop: 2, marginLeft: 4 }} />
              )}
              {article.isStarred && (
                <Ionicons name="star" size={14} color="#f59e0b" style={{ marginTop: 2, marginLeft: 4 }} />
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
    </Swipeable>
  );
});

// ヘッダーコンポーネント
const HomeHeader: React.FC<{
  feedName: string;
  showStarredOnly: boolean;
  searchOpen: boolean;
  layoutMode: LayoutMode;
  onPressFeedSelect: () => void;
  onPressStarFilter: () => void;
  onPressSearch: () => void;
  onPressLayoutToggle: () => void;
  onPressRefresh: () => void;
  feedSelectorRef: React.RefObject<View | null>;
  refreshRef: React.RefObject<View | null>;
  starFilterRef: React.RefObject<View | null>;
  layoutToggleRef: React.RefObject<View | null>;
}> = ({ feedName, showStarredOnly, searchOpen, layoutMode, onPressFeedSelect, onPressStarFilter, onPressSearch, onPressLayoutToggle, onPressRefresh, feedSelectorRef, refreshRef, starFilterRef, layoutToggleRef }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
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
            style={styles.refreshButton}
            onPress={onPressSearch}
            activeOpacity={0.7}
          >
            <Ionicons
              name={searchOpen ? 'search' : 'search-outline'}
              size={22}
              color={searchOpen ? tintColor : iconColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            ref={layoutToggleRef}
            style={styles.refreshButton}
            onPress={onPressLayoutToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={layoutMode === 'large' ? 'list-outline' : 'image-outline'}
              size={22}
              color={iconColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            ref={starFilterRef}
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
  const { showToast } = useToast();
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
  // 手動で非表示にした記事ID。ホーム一覧から除外し、「表示」トグルで淡色表示→復元できる。
  const [hiddenArticleIds, setHiddenArticleIds] = React.useState<Set<string>>(new Set());
  const [hiddenInViewCount, setHiddenInViewCount] = React.useState(0);
  // 長押しで開くコンテキストメニュー対象の記事（null で閉）
  const [actionSheetArticle, setActionSheetArticle] = React.useState<Article | null>(null);
  // ブロック記事・非表示記事を（淡色で）表示するかどうか（統合トグル）
  const [showBlockedKeywords, setShowBlockedKeywords] = React.useState(false);
  const [blockedKeywordIds, setBlockedKeywordIds] = React.useState<Set<string>>(new Set());
  // ホーム内検索（一時的な絞り込み。恒久フィルタ block/allow とは別物）。
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Display & Behavior（既読表示など）
  const [readDisplay, setReadDisplay] = React.useState<ReadDisplayMode>('dim');
  const [layoutMode, setLayoutMode] = React.useState<LayoutMode>('compact');

  // 起動時自動同期の実行済みフラグ
  const [hasAutoSynced, setHasAutoSynced] = React.useState(false);

  // スクロール位置保持
  const flatListRef = React.useRef<FlatList>(null);
  const isInitialLoad = React.useRef(true);

  // 記事スワイプ: 一度に1行だけ開く。開いているIDは ref で管理し（再レンダリングを避ける）、
  // 各行の Swipeable ref は id ごとにキャッシュして安定参照にする（メモ化を効かせるため）。
  const swipeableRefs = React.useRef<Map<string, React.RefObject<SwipeableMethods | null>>>(new Map());
  const openSwipeIdRef = React.useRef<string | null>(null);
  const getSwipeableRef = React.useCallback((id: string) => {
    if (!swipeableRefs.current.has(id)) {
      swipeableRefs.current.set(id, React.createRef<SwipeableMethods>());
    }
    return swipeableRefs.current.get(id)!;
  }, []);
  const closeOpenSwipe = React.useCallback((excludeId?: string) => {
    const openId = openSwipeIdRef.current;
    if (openId !== null && openId !== excludeId) {
      swipeableRefs.current.get(openId)?.current?.close();
    }
  }, []);
  const handleArticleSwipeWillOpen = React.useCallback((id: string) => {
    closeOpenSwipe(id);
    openSwipeIdRef.current = id;
  }, [closeOpenSwipe]);
  const handleArticleSwipeWillClose = React.useCallback((id: string) => {
    if (openSwipeIdRef.current === id) openSwipeIdRef.current = null;
  }, []);
  const getIsArticleSwipeOpen = React.useCallback((id: string) => openSwipeIdRef.current === id, []);
  // 記事が入れ替わったら、消えた記事の Swipeable ref をマップから掃除する（肥大防止）
  React.useEffect(() => {
    const ids = new Set(articles.map(a => a.id));
    for (const id of swipeableRefs.current.keys()) {
      if (!ids.has(id)) swipeableRefs.current.delete(id);
    }
  }, [articles]);

  // 初回チュートリアル（コーチマーク）
  const [tutorialVisible, setTutorialVisible] = React.useState(false);
  const [tutorialPending, setTutorialPending] = React.useState(false);
  const [homeStartAtLast, setHomeStartAtLast] = React.useState(false);
  // 「初回設定をやり直す」で再生したツアーのときだけスキップボタンを出す
  const [tourIsReplay, setTourIsReplay] = React.useState(false);
  // ツアーが一周してホームへ戻ってきたとき、初回取得が終わるまで待つスピナー
  const [waitingArticles, setWaitingArticles] = React.useState(false);
  const hasAutoSyncedRef = React.useRef(false);
  const feedSelectorRef = React.useRef<View>(null);
  const refreshRef = React.useRef<View>(null);
  const starFilterRef = React.useRef<View>(null);
  const layoutToggleRef = React.useRef<View>(null);
  const filterBarRef = React.useRef<View>(null);
  const listWrapperRef = React.useRef<View>(null);
  // ツアーで「長押しでお気に入り」をハイライトする対象（先頭の記事1件）。
  // レイアウト（コンパクト/大画像）で記事の高さが変わるため、固定値ではなく実測する
  const firstArticleRef = React.useRef<View>(null);

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

      // 手動で非表示にした記事ID
      const hiddenIds = await ArticleService.getHiddenIds();
      setHiddenArticleIds(new Set(hiddenIds));

      // フィルタ一覧を取得
      const filterList = await FilterService.list();
      setFilters(filterList);

      // グローバル許可キーワード一覧を取得
      const globalAllowList = await GlobalAllowKeywordService.list();
      setGlobalAllowKeywords(globalAllowList);

      // Display & Behavior の設定を取得
      const savedReadDisplay = await AsyncStorage.getItem(StorageKeys.readDisplay);
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
    AsyncStorage.getItem(StorageKeys.feedSort)
      .then(saved => { if (saved) setFeedSort(saved as FeedSortType); })
      .catch(() => {});
  }, []);

  // 保存済みの記事レイアウトを読み込む
  React.useEffect(() => {
    AsyncStorage.getItem(StorageKeys.layoutMode)
      .then(saved => { if (saved === 'compact' || saved === 'large') setLayoutMode(saved); })
      .catch(() => {});
  }, []);

  // 記事レイアウトを切替・永続化する
  const handleToggleLayout = React.useCallback(() => {
    setLayoutMode(prev => {
      const next: LayoutMode = prev === 'compact' ? 'large' : 'compact';
      AsyncStorage.setItem(StorageKeys.layoutMode, next).catch(() => {});
      return next;
    });
  }, []);

  // フィード並び順を変更・永続化する
  const handleSelectFeedSort = React.useCallback((sortType: FeedSortType) => {
    setFeedSort(sortType);
    AsyncStorage.setItem(StorageKeys.feedSort, sortType).catch(() => {});
  }, []);

  // 先頭記事が計測できないとき（描画前など）に使う代用ハイライト。
  // リスト上部を控えめな高さで囲う
  const measureListTopFallback = React.useCallback(
    (): Promise<CoachRect | null> =>
      new Promise((resolve) => {
        const node = listWrapperRef.current;
        if (!node) { resolve(null); return; }
        node.measureInWindow((x, y, width, height) => {
          if (!width || !height) resolve(null);
          else resolve({ x: x + 8, y: y + 6, width: width - 16, height: Math.min(96, Math.max(0, height - 12)) });
        });
      }),
    []
  );

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
    // ヘッダーは左→右、その後リスト→下タブの順にハイライトが流れるよう並べる
    { measure: () => measureNode(feedSelectorRef), text: t('home.tutFeedDesc') },
    { measure: () => measureNode(layoutToggleRef), text: t('home.tutLayoutDesc') },
    { measure: () => measureNode(starFilterRef), text: t('home.tutStarViewDesc') },
    { measure: () => measureNode(refreshRef), text: t('home.tutRefreshDesc') },
    { measure: () => measureNode(filterBarRef), text: t('home.tutFilterDesc') },
    {
      // 先頭の記事1件をハイライト（長押しでお気に入り）。
      // 記事の高さはレイアウトで変わるので実測する。取れないときはリスト先頭付近で代用
      measure: () => new Promise<CoachRect | null>((resolve) => {
        const first = firstArticleRef.current;
        if (!first) { resolve(measureListTopFallback()); return; }
        first.measureInWindow((x, y, width, height) => {
          if (width && height) resolve({ x, y, width, height });
          else resolve(measureListTopFallback());
        });
      }),
      text: t('home.tutStarDesc'),
    },
    {
      // 下タブの「フィルタ」タブ(4つ中2番目)のアイコンだけを囲う。タブセルの幅一杯
      // ではなく、アイコン+ラベル相当の小さめのボックスをセル中央に置くことで、
      // 青枠がセルの内側に余白を持って収まる
      measure: () => new Promise<CoachRect | null>((resolve) => {
        const { width } = Dimensions.get('window');
        const tabW = width / 4;
        const node = listWrapperRef.current;
        if (!node) { resolve(null); return; }
        node.measureInWindow((x, y, w, h) => {
          if (!h) { resolve(null); return; }
          const boxW = Math.min(tabW - 20, 58);
          const cx = tabW + (tabW - boxW) / 2; // 2番目のタブセルの中央
          resolve({ x: cx, y: y + h, width: boxW, height: 38 });
        });
      }),
      text: t('home.tutFiltersTabDesc'),
    },
  ], [t, measureNode, measureListTopFallback]);

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

  // チュートリアル開始/再開。オンボ直後('1')はマウント時、フィルタ画面から「戻る」で
  // 来たとき('last')はフォーカス時に、フラグを見て開始する
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(StorageKeys.tourHome).then((flag) => {
        if (flag === '1' || flag === 'last') {
          AsyncStorage.removeItem(StorageKeys.tourHome).catch(() => {});
          // 再生ツアーのときだけスキップボタンを出す
          AsyncStorage.getItem(StorageKeys.tourIsReplay)
            .then((r) => setTourIsReplay(r === '1'))
            .catch(() => {});
          setHomeStartAtLast(flag === 'last');
          setTutorialPending(true);
          setTutorialVisible(true);
        }
      }).catch(() => {});
    }, [])
  );

  // 「次へ」でフィルタ画面へ進みツアー継続
  const handleTutorialDone = React.useCallback(async () => {
    setTutorialVisible(false);
    setTutorialPending(false);
    // 遷移先が読む前に確実に書き込む（先頭から開始）
    try { await AsyncStorage.setItem(StorageKeys.tourFilters, '1'); } catch {}
    router.navigate('/filters');
  }, []);

  // ツアーをスキップ（再生時のみ）。全ツアーフラグを消してこの先の画面でも起動させず、
  // 通常のツアー終了と同じく「記事を準備中」を出して初回同期の完了で解除する。
  const handleSkipTour = React.useCallback(async () => {
    setTutorialVisible(false);
    setTutorialPending(false);
    setTourIsReplay(false);
    await AsyncStorage.multiRemove([
      StorageKeys.tourHome,
      StorageKeys.tourFilters,
      StorageKeys.tourFilterEdit,
      StorageKeys.tourFeeds,
      StorageKeys.tourFeedAdd,
      StorageKeys.tourFinish,
      StorageKeys.tourIsReplay,
    ]).catch(() => {});
    setWaitingArticles(true);
    const delay = hasAutoSyncedRef.current ? 700 : 120000;
    setTimeout(() => setWaitingArticles(false), delay);
  }, []);

  // ツアーが一周してホームへ戻ってきたら、まず必ず準備スピナーを出し、初回同期が
  // 完了してから解除する（中途半端な状態を一切見せない）
  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(StorageKeys.tourFinish).then((flag) => {
        if (flag !== '1') return;
        AsyncStorage.removeItem(StorageKeys.tourFinish).catch(() => {});
        // 再生フラグも一周終了で片付ける（次回以降に持ち越さない）
        AsyncStorage.removeItem(StorageKeys.tourIsReplay).catch(() => {});
        setWaitingArticles(true);
        // 既に同期完了済みなら一瞬だけ見せて閉じる。未完了なら完了まで待つ
        // （通常は hasAutoSynced で解除。これは保険のフォールバック）
        const delay = hasAutoSyncedRef.current ? 700 : 120000;
        setTimeout(() => setWaitingArticles(false), delay);
        // ツアー完走の区切りとして一言（スキップ時は出さない）
        Alert.alert(t('home.tutorialCompleteTitle'), t('home.tutorialCompleteMessage'));
      }).catch(() => {});
    }, [])
  );

  // 初回同期(autoSync の refresh→loadData)が完了したら準備スピナーを解除
  React.useEffect(() => {
    hasAutoSyncedRef.current = hasAutoSynced;
    if (hasAutoSynced) setWaitingArticles(false);
  }, [hasAutoSynced]);

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

  // loadData の最新版を ref で保持（autoSync を1回だけ実行するため deps に入れない）
  const loadDataRef = React.useRef(loadData);
  React.useEffect(() => { loadDataRef.current = loadData; }, [loadData]);

  // アプリがバックグラウンドから前面に戻ったら記事を読み直す。
  // useFocusEffect は画面遷移でしか発火しないため、これが無いとバックグラウンド更新で
  // 追加された記事が、別タブに移動して戻るまで反映されない。
  // loadData(false) なのでスピナーは出ず、スクロール位置も保持される。
  const appStateRef = React.useRef(AppState.currentState);
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
        loadDataRef.current(false);
      }
    });
    return () => sub.remove();
  }, []);

  // 起動直後の自動同期やバックグラウンド同期がアプリ内で走ると、ホームはそれが
  // 終わる前に描画されるため新着が出ない（別タブに移動して戻ると反映される現象）。
  // 同期の完了通知を購読し、終わった時点でDBを読み直す。loadData(false) なので
  // スピナーは出ず、スクロール位置も保持される。
  React.useEffect(() => {
    const unsubscribe = SyncService.onSyncComplete(() => {
      loadDataRef.current(false);
    });
    return unsubscribe;
  }, []);

  // 初回取得（ブートストラップ）。マウント時に確実に一度だけ実行する。
  // 「起動のたびに同期」は廃止し、オンボーディング完了時に立つ pendingInitialFetch
  // フラグがあるときだけ取得する。通常の起動は既存記事を即表示し、鮮度は
  // バックグラウンド更新と手動更新で担保する（記事を手動削除しただけでは取得しない）。
  // ※ effect が再実行されると refresh が isRefreshing ガードで即returnし、
  //   hasAutoSynced が早期に true になってしまうため、ref で多重実行を防ぐ
  const initialFetchStartedRef = React.useRef(false);
  React.useEffect(() => {
    if (initialFetchStartedRef.current) return;
    initialFetchStartedRef.current = true;

    const runInitialFetch = async () => {
      try {
        const pending = await AsyncStorage.getItem(StorageKeys.pendingInitialFetch);
        if (pending !== '1') {
          // 通常起動：取得せず既存記事を即表示（スピナーを出さない）
          setHasAutoSynced(true);
          return;
        }
        // オンボーディング直後の一度きりの取得。オフラインで取れなくても再試行は
        // しない（例外的なケースのため、次回は通常起動とする）。フラグは先に消す。
        await AsyncStorage.removeItem(StorageKeys.pendingInitialFetch);
        // 全フィードの取得・保存が終わるまで待つ（SyncService.refresh は順次処理）。
        // オフライン時のダイアログはオンボーディング完了時に出すため、ここでは出さない
        await SyncService.refresh();
        await loadDataRef.current(false);
        setHasAutoSynced(true);
      } catch (_) {
        setHasAutoSynced(true);
      }
    };

    runInitialFetch();
  }, []);

  // フィルタ適用
  React.useEffect(() => {
    // ホームで非表示（ミュート）にしたフィードの記事は常に除外する（削除ではなく表示制御）
    const hiddenFeedIds = new Set(feeds.filter(f => f.hiddenFromHome).map(f => f.id));
    let filtered = hiddenFeedIds.size > 0
      ? articles.filter(a => !hiddenFeedIds.has(a.feedId))
      : articles;

    // フィードでフィルタリング
    if (selectedFeedIds !== null) {
      filtered = filtered.filter(a => selectedFeedIds.includes(a.feedId));
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

    // 現在のスコープ内で手動非表示にされている件数（バー表示用）
    const hiddenInView = filtered.reduce((n, a) => (hiddenArticleIds.has(a.id) ? n + 1 : n), 0);
    setHiddenInViewCount(hiddenInView);

    // 通常はブロック記事・非表示記事を除外。統合トグルON時は順序を保ったまま含める（淡色表示）
    let displayed = showBlockedKeywords
      ? filtered
      : filtered.filter(a => !blockedIds.has(a.id) && !hiddenArticleIds.has(a.id));

    // 既読表示設定に基づいてフィルタリング
    if (readDisplay === 'hide') {
      displayed = displayed.filter(a => !a.isRead);
    }

    setFilteredArticles(displayed);
  }, [articles, feeds, selectedFeedIds, showStarredOnly, filters, globalAllowKeywords, readDisplay, showBlockedKeywords, hiddenArticleIds]);

  const runRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);

      // RSS同期を実行（手動更新は明示操作なのでWiFi限定設定を無視して必ず取得）
      const result = await SyncService.refresh({ ignoreWifiOnly: true });

      if (result.offline) {
        Alert.alert(t('common.error'), t('home.offlineError'));
        return;
      }


      // データを再読み込み（RefreshControlが既にスピナーを出すので再マウントしない）
      await loadData(false);

      // 手動更新は明示操作なので、取得完了後は必ず先頭まで戻す。
      // 先頭に記事が差し込まれた直後は maintainVisibleContentPosition が offset を
      // 補正するため、同フレームでスクロールすると途中で止まる。レイアウトが
      // 落ち着く次フレームまで待ってからスクロールする（2フレーム待つ）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
      });
    } catch (_) {
      ErrorHandler.showSyncError(t);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, t]);

  // 手動更新。「WiFi接続時のみ取得」がオンでモバイル回線のときは、
  // 通信量が発生する旨を確認してから取得する（判定に失敗したらそのまま取得）
  const handleRefresh = React.useCallback(async () => {
    try {
      // 同期実行中（起動直後の自動同期など）は refresh() が黙って何もせず返るため、
      // 先にここで拾って「更新中」であることを伝える。
      // この時点では lastSyncTime が未更新なのでクールダウン判定も効かない
      if (SyncService.isRefreshing) {
        Alert.alert(t('home.refreshInProgressTitle'), t('home.refreshInProgressMessage'));
        return;
      }

      // 連打防止の最低更新間隔チェック（制限中なら残り時間を案内して中断）。
      // 通信量の確認より先に行い、制限中は無駄なダイアログを出さない
      const cooldown = await SyncService.getManualRefreshCooldown();
      if (cooldown !== null) {
        Alert.alert(
          t('home.refreshThrottledTitle'),
          t('home.refreshThrottled', { minutes: Math.ceil(cooldown / 60) })
        );
        return;
      }

      if (await SyncService.shouldConfirmMobileFetch()) {
        Alert.alert(
          t('home.mobileFetchConfirmTitle'),
          t('home.mobileFetchConfirmMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('home.mobileFetchConfirmButton'), onPress: () => { void runRefresh(); } },
          ]
        );
        return;
      }
    } catch (_) {
    }
    await runRefresh();
  }, [runRefresh, t]);

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

  // 左スワイプでお気に入りをトグル。スワイプ自体がフィードバックになるため、
  // 長押し時代の派手なハイライトアニメ（useNativeDriver:false）は使わない
  // （同じ行での2回目の操作を妨げていたため）。DBと状態を一括でトグルするだけ。
  const handleFavoriteArticle = React.useCallback(async (article: Article) => {
    try {
      // 目標値を明示的に持つ（トグルではないので遅延しても DB とずれない）。
      const next = !article.isStarred;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await ArticleRepository.toggleStarred(article.id);
      // 状態更新（＝行の再レンダリング）は閉じアニメ完了後に遅延し、引っ掛かりを防ぐ。
      setTimeout(() => {
        setArticles(prev =>
          prev.map(a => a.id === article.id ? { ...a, isStarred: next } : a)
        );
      }, 260);
    } catch (_) {
      ErrorHandler.showDatabaseError(t, t('home.favoriteError'));
    }
  }, [t]);

  // 長押しでコンテキストメニュー（この記事/このサイトを非表示）を開く。
  // 別の行のスワイプが開いていたら閉じる。
  const handleLongPressArticle = React.useCallback((article: Article) => {
    closeOpenSwipe();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionSheetArticle(article);
  }, [closeOpenSwipe]);

  // このサイト（フィード）ごとホームで非表示にする。Undoトースト＋フィード画面で復元可能。
  const handleHideSite = React.useCallback((article: Article) => {
    FeedService.setHiddenFromHome(article.feedId, true).catch(() => {});
    setFeeds(prev => prev.map(f => f.id === article.feedId ? { ...f, hiddenFromHome: true } : f));
    showToast(t('home.siteHiddenToast', { name: article.feedName }), 'success', {
      label: t('common.undo'),
      onPress: () => {
        FeedService.setHiddenFromHome(article.feedId, false).catch(() => {});
        setFeeds(prev => prev.map(f => f.id === article.feedId ? { ...f, hiddenFromHome: false } : f));
      },
    });
  }, [showToast, t]);

  // スワイプで記事を非表示にする（完全除外だが復元可能）。Undoトースト＋「表示」トグルの二重で戻せる。
  // DB反映は即時、一覧からの除外（再レンダリング）は閉じアニメ完了後に遅延してカクつきを防ぐ。
  const applyArticleHidden = React.useCallback((id: string, hidden: boolean, deferVisual: boolean) => {
    ArticleService.setHidden(id, hidden).catch(() => {});
    const update = () =>
      setHiddenArticleIds(prev => {
        const next = new Set(prev);
        if (hidden) next.add(id);
        else next.delete(id);
        return next;
      });
    if (deferVisual) setTimeout(update, 260);
    else update();
  }, []);

  const handleHideArticle = React.useCallback((article: Article) => {
    applyArticleHidden(article.id, true, true);
    showToast(t('home.articleHiddenToast'), 'success', {
      label: t('common.undo'),
      onPress: () => applyArticleHidden(article.id, false, false),
    });
  }, [applyArticleHidden, showToast, t]);

  // 「表示」トグルで淡色表示中の非表示記事を、スワイプで元に戻す（復元にもトーストを出す）
  const handleRestoreArticle = React.useCallback((article: Article) => {
    applyArticleHidden(article.id, false, true);
    showToast(t('home.articleShownToast'), 'success');
  }, [applyArticleHidden, showToast, t]);

  const renderItem = React.useCallback(({ item, index }: { item: Article; index: number }) => {
    const row = (
      <ArticleItem
        article={item}
        onPress={handlePressArticle}
        onLongPress={handleLongPressArticle}
        onHide={handleHideArticle}
        onRestore={handleRestoreArticle}
        onFavorite={handleFavoriteArticle}
        swipeableRef={getSwipeableRef(item.id)}
        getIsSwipeOpen={getIsArticleSwipeOpen}
        onSwipeableWillOpen={handleArticleSwipeWillOpen}
        onSwipeableWillClose={handleArticleSwipeWillClose}
        highlightAnim={getHighlightAnim(item.id)}
        isBlocked={blockedKeywordIds.has(item.id)}
        isHidden={hiddenArticleIds.has(item.id) && showBlockedKeywords}
        large={layoutMode === 'large'}
      />
    );
    // 先頭の1件だけツアーの計測対象にする（collapsable=false でAndroidでも計測可能に）
    if (index !== 0) return row;
    return (
      <View ref={firstArticleRef} collapsable={false}>
        {row}
      </View>
    );
  }, [handlePressArticle, handleLongPressArticle, handleHideArticle, handleRestoreArticle, handleFavoriteArticle, getSwipeableRef, getIsArticleSwipeOpen, handleArticleSwipeWillOpen, handleArticleSwipeWillClose, getHighlightAnim, blockedKeywordIds, hiddenArticleIds, showBlockedKeywords, layoutMode]);

  const backgroundColor = useThemeColor({}, 'background');
  const emptyIconColor = useThemeColor({}, 'tabIconDefault');

  const filterBarBg = useThemeColor({ light: '#f0f4ff', dark: '#1a1f2e' }, 'background');
  const searchBarBg = useThemeColor({ light: '#f0f0f0', dark: '#1c1d1f' }, 'background');
  const searchTextColor = useThemeColor({}, 'text');
  const searchIconColor = useThemeColor({}, 'icon');
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

  // 初回ツアー表示中はダミー記事＋サンプルのフィルタ件数を表示する
  // （実記事が届いても差し替えず、ツアー終了後に通常表示へ）
  const handleToggleSearch = React.useCallback(() => {
    setSearchOpen(prev => {
      if (prev) setSearchQuery(''); // 閉じるときはクエリをクリアして元の一覧に戻す
      return !prev;
    });
  }, []);

  const showTutorialDemo = tutorialVisible || tutorialPending;
  // 検索絞り込み（一時的・見えている集合を細くするだけ）。filteredArticles は
  // フィード選択・フィルタ評価・非表示/既読の表示制御まで適用済みなので、その後段に軽く掛ける。
  // → 「非表示を表示中」なら淡色の一致記事もそのまま出る（見えているものを絞る、で一貫）。
  const searchedArticles = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredArticles;
    return filteredArticles.filter(
      a => a.title.toLowerCase().includes(q) || (a.summary ? a.summary.toLowerCase().includes(q) : false)
    );
  }, [filteredArticles, searchQuery]);
  const searchActive = searchOpen && searchQuery.trim().length > 0;
  const displayArticles = showTutorialDemo ? dummyArticles : searchedArticles;
  const displayBlockedCount = showTutorialDemo ? 8 : blockedByFilters;
  const displayHiddenCount = showTutorialDemo ? 0 : hiddenInViewCount;
  const revealBarVisible = displayBlockedCount > 0 || displayHiddenCount > 0;
  // 「フィルタで除外」と「手動で非表示」を1本のバーに統合（逃し対策の恒久導線）
  const revealBarText = showBlockedKeywords
    ? t('home.hiddenAndFilteredShown')
    : displayBlockedCount > 0 && displayHiddenCount > 0
      ? t('home.filteredAndHidden', { filtered: displayBlockedCount, hidden: displayHiddenCount })
      : displayHiddenCount > 0
        ? t('home.articlesHidden', { count: displayHiddenCount })
        : t('home.articlesFiltered', { count: displayBlockedCount });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <HomeHeader
        feedName={selectedFeedName}
        showStarredOnly={showStarredOnly}
        searchOpen={searchOpen}
        layoutMode={layoutMode}
        onPressFeedSelect={handleFeedSelect}
        onPressStarFilter={handleToggleStarFilter}
        onPressSearch={handleToggleSearch}
        onPressLayoutToggle={handleToggleLayout}
        onPressRefresh={handleRefresh}
        feedSelectorRef={feedSelectorRef}
        refreshRef={refreshRef}
        starFilterRef={starFilterRef}
        layoutToggleRef={layoutToggleRef}
      />

      {searchOpen && (
        <View style={[styles.searchBar, { backgroundColor: searchBarBg }]}>
          <Ionicons name="search" size={18} color={searchIconColor} />
          <TextInput
            style={[styles.searchInput, { color: searchTextColor }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={searchIconColor}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={searchIconColor} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {revealBarVisible && (
        <TouchableOpacity
          ref={filterBarRef}
          style={[styles.filterBar, { backgroundColor: filterBarBg }]}
          onPress={() => setShowBlockedKeywords(prev => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={displayBlockedCount === 0 && displayHiddenCount > 0 ? 'eye-off' : 'funnel'}
            size={12}
            color={filterBarText}
            style={styles.filterBarIcon}
          />
          <Text style={[styles.filterBarText, { color: filterBarText, flex: 1 }]}>
            {revealBarText}
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

      {isLoading && !showTutorialDemo ? (
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
            // 起動時の自動同期などで先頭に記事が差し込まれても、見ている位置がズレないよう固定する。
            // 先頭付近にいるとき（10px以内）だけ新着に追従して先頭へ寄せる
            maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 10 }}
            onScroll={handleScroll}
            // 縦スクロールを始めたら、開いていた横スワイプ（お気に入り/非表示）を閉じる。
            // onScroll ではなく onScrollBeginDrag を使い、指での操作開始時だけ閉じる
            // （更新後の先頭スクロール等プログラム的なスクロールでは閉じない）。
            onScrollBeginDrag={() => closeOpenSwipe()}
            scrollEventThrottle={16}
            onContentSizeChange={(_, h) => setListContentH(h)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name={searchActive ? 'search-outline' : 'newspaper-outline'} size={64} color={emptyIconColor} style={styles.emptyIcon} />
                <ThemedText style={styles.emptyMessage}>{searchActive ? t('home.noSearchResults') : t('home.noArticles')}</ThemedText>
                {!searchActive && <ThemedText style={styles.emptyHint}>{t('home.noArticlesHint')}</ThemedText>}
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
        feeds={feeds.filter(f => !f.hiddenFromHome)}
        selectedFeedIds={selectedFeedIds}
        currentSort={feedSort}
        onClose={() => setFeedModalVisible(false)}
        onSelectFeeds={handleSelectFeeds}
        onSelectSort={handleSelectFeedSort}
      />

      {/* 初回の使い方ツアー（実画面の要素を指すコーチマーク）。次画面へ続く */}
      <CoachMarks
        visible={tutorialVisible}
        steps={tutorialSteps}
        onDone={handleTutorialDone}
        continues
        startAtLast={homeStartAtLast}
        onSkip={tourIsReplay ? handleSkipTour : undefined}
      />

      {/* 記事の長押しメニュー（この記事/このサイトを非表示） */}
      <ArticleActionSheet
        visible={actionSheetArticle !== null}
        title={actionSheetArticle?.title ?? ''}
        feedName={actionSheetArticle?.feedName ?? ''}
        onClose={() => setActionSheetArticle(null)}
        onHideArticle={() => {
          const a = actionSheetArticle;
          setActionSheetArticle(null);
          if (a) handleHideArticle(a);
        }}
        onHideSite={() => {
          const a = actionSheetArticle;
          setActionSheetArticle(null);
          if (a) handleHideSite(a);
        }}
      />

      {/* ツアーが一周して戻ってきたとき、取得完了まで全面スピナー（タブ遷移もブロック） */}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
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
  // スワイプアクションの領域幅（＝スワイプで開く幅）。左右そろえて 80。
  hideAction: {
    width: 80,
    alignItems: 'stretch',
  },
  favAction: {
    width: 80,
    alignItems: 'stretch',
  },
  // RectButton は親を埋めるので flex（高さ）＋ 親の alignItems:stretch（幅）でOK。
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  articleContentLarge: {
    flexDirection: 'column',
  },
  thumbnailLarge: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 10,
  },
  thumbnailPlaceholderLarge: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainerLarge: {
    width: '100%',
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