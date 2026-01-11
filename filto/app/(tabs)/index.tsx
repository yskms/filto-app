import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Article } from '@/types/Article';
import { FeedSelectModal } from '@/components/FeedSelectModal';
import { Feed } from '@/types/Feed';
import { FilterEngine } from '@/services/FilterEngine';
import { FilterService, Filter } from '@/services/FilterService';

// ダミーフィードデータ
const dummyFeeds: Feed[] = [
  {
    id: 'feed1',
    title: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    orderNo: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feed2',
    title: 'Qiita',
    url: 'https://qiita.com/feed',
    orderNo: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feed3',
    title: 'Medium',
    url: 'https://medium.com/feed',
    orderNo: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feed4',
    title: 'Dev.to',
    url: 'https://dev.to/feed',
    orderNo: 4,
    createdAt: new Date().toISOString(),
  },
];

// ダミーデータ
const dummyArticles: Article[] = [
  {
    id: '1',
    feedId: 'feed1',
    feedName: 'TechCrunch',
    title: 'React 19 Released: What\'s New in the Latest Version',
    link: 'https://example.com/article1',
    summary: 'React 19の新機能を詳しく解説します。',
    publishedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: '2',
    feedId: 'feed2',
    feedName: 'Qiita',
    title: 'FXで稼ぐ自動トレード術', // ← フィルタテスト用
    link: 'https://example.com/article2',
    summary: 'TypeScript 5.5で追加された便利な機能。',
    publishedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: '3',
    feedId: 'feed3',
    feedName: 'Medium',
    title: 'Expo Router のベストプラクティス',
    link: 'https://example.com/article3',
    summary: 'Expo Routerを使った効率的な開発手法。',
    publishedAt: new Date(Date.now() - 86400 * 1000).toISOString(),
    isRead: true,
  },
  {
    id: '4',
    feedId: 'feed1',
    feedName: 'TechBlog',
    title: '炎上したスタートアップの教訓', // ← フィルタテスト用
    link: 'https://example.com/article4',
    summary: '2025年のモバイル開発動向をまとめました。',
    publishedAt: new Date(Date.now() - 172800 * 1000).toISOString(),
    isRead: false,
  },
  {
    id: '5',
    feedId: 'feed4',
    feedName: 'Dev.to',
    title: 'RSSリーダーアプリの設計思想',
    link: 'https://example.com/article5',
    summary: 'ユーザー体験を重視したRSSリーダーの作り方。',
    publishedAt: new Date(Date.now() - 259200 * 1000).toISOString(),
    isRead: true,
  },
];

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
}> = ({ article, onPress }) => {
  const timeAgo = getTimeAgo(article.publishedAt);

  return (
    <TouchableOpacity
      style={[styles.articleContainer, article.isRead && styles.readContainer]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.articleContent}>
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailIcon}>📰</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, article.isRead && styles.readTitle]}
            numberOfLines={2}
          >
            {article.title}
          </Text>
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
    </TouchableOpacity>
  );
};

// ヘッダーコンポーネント
const HomeHeader: React.FC<{
  feedName: string;
  onPressFeedSelect: () => void;
  onPressRefresh: () => void;
}> = ({ feedName, onPressFeedSelect, onPressRefresh }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.feedSelector}
        onPress={onPressFeedSelect}
        activeOpacity={0.7}
      >
        <Text style={styles.feedName}>{feedName}</Text>
        <Text style={styles.dropdownIcon}>⬇️</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onPressRefresh}
        activeOpacity={0.7}
      >
        <Text style={styles.refreshIcon}>⟳</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function HomeScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [articles] = React.useState<Article[]>(dummyArticles);
  const [feeds] = React.useState<Feed[]>(dummyFeeds);
  const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
  const [feedModalVisible, setFeedModalVisible] = React.useState(false);
  
  // フィルタ関連
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);

  // 選択中のフィード名を取得
  const selectedFeedName = React.useMemo(() => {
    if (selectedFeedId === null) return 'ALL';
    const feed = feeds.find(f => f.id === selectedFeedId);
    return feed?.title || 'ALL';
  }, [selectedFeedId, feeds]);

  // フィルタを読み込む
  const loadFilters = React.useCallback(async () => {
    try {
      const filterList = await FilterService.list();
      setFilters(filterList);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  }, []);

  // 画面フォーカス時にフィルタを読み込む
  useFocusEffect(
    React.useCallback(() => {
      loadFilters();
    }, [loadFilters])
  );

  // フィルタ適用
  React.useEffect(() => {
    // フィードでフィルタリング
    let filtered = articles;
    if (selectedFeedId !== null) {
      filtered = articles.filter(a => a.feedId === selectedFeedId);
    }

    // フィルタエンジンで評価
    const globalAllowKeywords: string[] = []; // TODO: グローバル許可リスト
    const displayed = filtered.filter(article => {
      const shouldBlock = FilterEngine.evaluate(article, filters, globalAllowKeywords);
      return !shouldBlock; // ブロックされない記事のみ表示
    });

    setFilteredArticles(displayed);
  }, [articles, selectedFeedId, filters]);

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: RSS取得処理
    loadFilters(); // フィルタも再読み込み
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, [loadFilters]);

  const handleFeedSelect = React.useCallback(() => {
    setFeedModalVisible(true);
  }, []);

  const handleSelectFeed = React.useCallback((feedId: string | null) => {
    setSelectedFeedId(feedId);
  }, []);

  const handlePressArticle = React.useCallback(async (article: Article) => {
    try {
      await Linking.openURL(article.link);
      // TODO: 既読にする処理
    } catch (error) {
      Alert.alert('エラー', '記事を開けませんでした');
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        feedName={selectedFeedName}
        onPressFeedSelect={handleFeedSelect}
        onPressRefresh={handleRefresh}
      />
      
      <FlatList
        data={filteredArticles}
        renderItem={({ item }) => (
          <ArticleItem 
            article={item} 
            onPress={() => handlePressArticle(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭</Text>
            <Text style={styles.emptyMessage}>記事がありません</Text>
          </View>
        }
      />

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
  feedSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  dropdownIcon: {
    fontSize: 14,
  },
  refreshButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
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
  thumbnailIcon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    lineHeight: 22,
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
});