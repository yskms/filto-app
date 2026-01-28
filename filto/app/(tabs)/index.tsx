import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Image,
  Animated,
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
import { ErrorHandler } from '@/utils/errorHandler';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

// 経過時間を計算
const getTimeAgo = (publishedAt: string): string => {
  const now = Date.now();
  const published = new Date(publishedAt).getTime();
  const diff = now - published;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'たった今';
};

// 記事アイテムコンポーネント
const ArticleItem: React.FC<{ 
  article: Article;
  onPress: () => void;
  onLongPress: () => void;
  highlightAnim: Animated.Value;
}> = ({ article, onPress, onLongPress, highlightAnim }) => {
  const timeAgo = getTimeAgo(article.publishedAt);

  // ハイライトアニメーション用の背景色
  const backgroundColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#fff', '#fff3cd'], // 白 → 薄い黄色
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
          article.isRead && styles.readContainer,
          { backgroundColor },
        ]}
      >
        <View style={styles.articleContent}>
          {article.thumbnailUrl ? (
            <Image
              source={{ uri: article.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailIcon}>📰</Text>
            </View>
          )}
          
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, article.isRead && styles.readTitle]}
                numberOfLines={2}
              >
                {article.title}
              </Text>
              {article.isStarred && (
                <Text style={styles.starIcon}>⭐</Text>
              )}
            </View>
            <View style={styles.metaContainer}>
              <Text style={[styles.metaText, article.isRead && styles.readMetaText]}>
                {article.feedName}
              </Text>
              <Text style={styles.separator}>/</Text>
              <Text style={[styles.metaText, article.isRead && styles.readMetaText]}>
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

  return (
    <View style={[styles.headerContainer, { borderBottomColor: borderColor, backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.feedSelector}
          onPress={onPressFeedSelect}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.feedName}>{feedName}</ThemedText>
          <ThemedText style={[styles.dropdownIcon, { color: iconColor }]}>⬇️</ThemedText>
        </TouchableOpacity>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.starButton, showStarredOnly && styles.starButtonActive]}
            onPress={onPressStarFilter}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.starButtonIcon}>⭐</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onPressRefresh}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.refreshIcon}>⟳</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const t = useTranslation();
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
    if (selectedFeedId === null) return t.home.all;
    const feed = feeds.find(f => f.id === selectedFeedId);
    return feed?.title || t.home.all;
  }, [selectedFeedId, feeds, t]);

  // データを読み込む
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      
      // フィード一覧を取得
      const feedList = await FeedService.list();
      setFeeds(feedList);
      
      // 記事一覧を取得
      const articleList = await ArticleService.getArticles(selectedFeedId ?? undefined, showStarredOnly);
      setArticles(articleList);

      // フィルタ一覧を取得
      const filterList = await FilterService.list();
      setFilters(filterList);

      // グローバル許可キーワード一覧を取得
      const keywordList = await GlobalAllowKeywordService.list();
      setGlobalAllowKeywords(keywordList);

      // Display & Behavior設定を読み込み
      const savedReadDisplay = await AsyncStorage.getItem('@filto/display_behavior/readDisplay');
      if (savedReadDisplay === 'dim' || savedReadDisplay === 'hide') {
        setReadDisplay(savedReadDisplay);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFeedId, showStarredOnly]);

  // フィルタ適用
  React.useEffect(() => {
    const filtered = FilterEngine.filterArticles(articles, filters, globalAllowKeywords);
    setFilteredArticles(filtered);
  }, [articles, filters, globalAllowKeywords]);

  // 起動時の自動同期
  React.useEffect(() => {
    const checkAndSync = async () => {
      if (hasAutoSynced) return;

      try {
        const autoSync = await AsyncStorage.getItem('@filto/display_behavior/autoSyncOnStartup');
        if (autoSync !== 'true') {
          setHasAutoSynced(true);
          return;
        }

        const lastSyncStr = await AsyncStorage.getItem('@filto/lastSyncTime');
        const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
        const now = Math.floor(Date.now() / 1000);
        const diffMinutes = (now - lastSync) / 60;

        if (diffMinutes >= 30) {
          await SyncService.refresh();
          await loadData();
        }

        setHasAutoSynced(true);
      } catch (error) {
        console.error('Auto sync failed:', error);
        setHasAutoSynced(true);
      }
    };

    checkAndSync();
  }, [hasAutoSynced, loadData]);

  // 画面フォーカス時にデータを読み込む
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [loadData])
  );

  // リフレッシュ処理
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await SyncService.refresh();
      await loadData();
    } catch (error) {
      console.error('Failed to refresh:', error);
      ErrorHandler.showGenericError('更新に失敗しました');
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // フィード選択
  const handleFeedSelect = React.useCallback(() => {
    setFeedModalVisible(true);
  }, []);

  const handleSelectFeed = React.useCallback((feedId: string | null) => {
    setSelectedFeedId(feedId);
    setFeedModalVisible(false);
  }, []);

  // お気に入りフィルタ切り替え
  const handleToggleStarFilter = React.useCallback(() => {
    setShowStarredOnly(prev => !prev);
  }, []);

  // 記事タップ
  const handlePressArticle = React.useCallback(async (article: Article) => {
    try {
      // 既読にする
      await ArticleRepository.markRead(article.id);
      
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        feedName={selectedFeedName}
        showStarredOnly={showStarredOnly}
        onPressFeedSelect={handleFeedSelect}
        onPressStarFilter={handleToggleStarFilter}
        onPressRefresh={handleRefresh}
      />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>{t.home.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={readDisplay === 'hide' ? filteredArticles.filter(a => !a.isRead) : filteredArticles}
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
              <Text style={styles.emptyText}>{t.home.emptyIcon}</Text>
              <Text style={styles.emptyMessage}>{t.home.emptyMessage}</Text>
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
    backgroundColor: '#f5f5f5',
  },
  starButtonActive: {
    backgroundColor: '#fff3cd',
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
    color: '#1976d2',
  },
  listContent: {
    paddingBottom: 20,
  },
  articleContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
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
    color: '#000',
    lineHeight: 22,
  },
  starIcon: {
    fontSize: 14,
    marginTop: 2,
  },
  readTitle: {
    color: '#666',
    fontWeight: '400',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  readMetaText: {
    color: '#999',
  },
  separator: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 4,
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
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});