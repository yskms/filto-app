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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Article } from '@/types/Article';
import { FeedSelectModal } from '@/components/FeedSelectModal';
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
const ArticleItem: React.FC<{
  article: Article;
  onPress: () => void;
  onLongPress: () => void;
  highlightAnim: Animated.Value;
}> = ({ article, onPress, onLongPress, highlightAnim }) => {
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
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Animated.View
        style={[
          styles.articleContainer,
          { backgroundColor: animatedBg, borderBottomColor: borderColor },
          article.isRead && styles.readContainer,
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
                style={[styles.title, { color: textColor }, article.isRead && { color: subtextColor, fontWeight: '400' }]}
                numberOfLines={2}
              >
                {article.title}
              </Text>
              {article.isStarred && (
                <Ionicons name="star" size={14} color="#f59e0b" style={{ marginTop: 2 }} />
              )}
            </View>
            <View style={styles.metaContainer}>
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
};

// ヘッダーコンポーネント
const HomeHeader: React.FC<{
  feedName: string;
  showStarredOnly: boolean;
  onPressFeedSelect: () => void;
  onPressStarFilter: () => void;
  onPressRefresh: () => void;
}> = ({ feedName, showStarredOnly, onPressFeedSelect, onPressStarFilter, onPressRefresh }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'icon');
  const starBtnBg = useThemeColor({ light: '#f5f5f5', dark: '#2a2b2c' }, 'background');
  const starBtnActiveBg = useThemeColor({ light: '#fff3cd', dark: '#3a3520' }, 'background');

  return (
    <View style={[styles.headerContainer, { borderBottomColor: borderColor, backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity
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
  const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
  const [showStarredOnly, setShowStarredOnly] = React.useState(false);
  const [feedModalVisible, setFeedModalVisible] = React.useState(false);
  
  // フィルタ関連
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [globalAllowKeywords, setGlobalAllowKeywords] = React.useState<GlobalAllowKeyword[]>([]);
  const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);
  
  // Display & Behavior（既読表示など）
  const [readDisplay, setReadDisplay] = React.useState<ReadDisplayMode>('dim');
  
  // 起動時自動同期の実行済みフラグ
  const [hasAutoSynced, setHasAutoSynced] = React.useState(false);

  // ハイライトアニメーション用（記事IDごとに管理）
  const highlightAnims = React.useRef<Map<string, Animated.Value>>(new Map());

  // 記事のハイライトアニメーションを取得または作成
  const getHighlightAnim = (articleId: string): Animated.Value => {
    if (!highlightAnims.current.has(articleId)) {
      highlightAnims.current.set(articleId, new Animated.Value(0));
    }
    return highlightAnims.current.get(articleId)!;
  };

  // 選択中のフィード名を取得
  const selectedFeedName = React.useMemo(() => {
    if (selectedFeedId === null) return t('home.allFeeds');
    const feed = feeds.find(f => f.id === selectedFeedId);
    return feed?.title || t('home.allFeeds');
  }, [selectedFeedId, feeds, t]);

  // データを読み込む
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      // フィード一覧を取得
      const feedList = await FeedService.list();
      setFeeds(feedList);
      
      // 記事一覧を取得
      const articleList = await ArticleService.getArticles(selectedFeedId ?? undefined);
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
      console.error('Failed to load data:', error);
      ErrorHandler.showLoadError();
    } finally {
      setIsLoading(false);
    }
  }, [selectedFeedId]);

  // 画面フォーカス時にデータを読み込む
  useFocusEffect(
    React.useCallback(() => {
      loadData();
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

        // 同期が必要かチェック（30分以上経過時のみ）
        const shouldSync = await SyncService.shouldSync();
        if (!shouldSync) {
          setHasAutoSynced(true);
          return;
        }

        // バックグラウンドで同期実行
        await SyncService.refresh();
        
        // データを再読み込み
        await loadData();
        
        setHasAutoSynced(true);
      } catch (error) {
        console.error('[AutoSync] Failed:', error);
        // エラーでもアプリは正常に動作
        setHasAutoSynced(true);
      }
    };

    // 少し遅延させて、画面表示を優先
    const timer = setTimeout(() => {
      autoSync();
    }, 1500); // 1.5秒後に開始

    return () => clearTimeout(timer);
  }, [hasAutoSynced, loadData]);

  // フィルタ適用
  React.useEffect(() => {
    // フィードでフィルタリング
    let filtered = articles;
    if (selectedFeedId !== null) {
      filtered = articles.filter(a => a.feedId === selectedFeedId);
    }

    // お気に入りフィルタを適用
    if (showStarredOnly) {
      filtered = filtered.filter(a => a.isStarred);
    }

    // グローバル許可キーワードを文字列配列に変換
    const allowKeywords = globalAllowKeywords.map(k => k.keyword);
    
    // フィルタエンジンで評価
    let displayed = filtered.filter(article => {
      const shouldBlock = FilterEngine.evaluate(article, filters, allowKeywords);
      return !shouldBlock; // ブロックされない記事のみ表示
    });

    // 既読表示設定に基づいてフィルタリング
    if (readDisplay === 'hide') {
      displayed = displayed.filter(a => !a.isRead);
    }

    setFilteredArticles(displayed);
  }, [articles, selectedFeedId, showStarredOnly, filters, globalAllowKeywords, readDisplay]);

  const handleRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);

      // RSS同期を実行
      const result = await SyncService.refresh();

      if (result.offline) {
        Alert.alert(t('common.error'), t('home.offlineError'));
        return;
      }


      // データを再読み込み
      await loadData();
    } catch (error) {
      console.error('Failed to refresh:', error);
      ErrorHandler.showSyncError();
    } finally {
      setRefreshing(false);
    }
  }, [loadData, t]);

  const handleFeedSelect = React.useCallback(() => {
    setFeedModalVisible(true);
  }, []);

  const handleSelectFeed = React.useCallback((feedId: string | null) => {
    setSelectedFeedId(feedId);
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
    } catch (error) {
      console.error('Failed to open article:', error);
      ErrorHandler.showGenericError('記事を開けませんでした');
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
    } catch (error) {
      console.error('Failed to toggle star:', error);
      ErrorHandler.showDatabaseError('お気に入りの変更に失敗しました');
    }
  }, []);

  const backgroundColor = useThemeColor({}, 'background');
  const emptyIconColor = useThemeColor({}, 'tabIconDefault');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <HomeHeader
        feedName={selectedFeedName}
        showStarredOnly={showStarredOnly}
        onPressFeedSelect={handleFeedSelect}
        onPressStarFilter={handleToggleStarFilter}
        onPressRefresh={handleRefresh}
      />

      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={filteredArticles}
          renderItem={({ item }) => (
            <ArticleItem
              article={item}
              onPress={() => handlePressArticle(item)}
              onLongPress={() => handleLongPressArticle(item)}
              highlightAnim={getHighlightAnim(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
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
      )}

      {/* フィード選択モーダル */}
      <FeedSelectModal
        visible={feedModalVisible}
        feeds={feeds}
        selectedFeedId={selectedFeedId}
        onClose={() => setFeedModalVisible(false)}
        onSelectFeed={handleSelectFeed}
      />
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
  listContent: {
    flexGrow: 1,
    paddingBottom: 20,
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