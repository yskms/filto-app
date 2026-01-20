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
    ActivityIndicator,
    Image,
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { useFocusEffect } from '@react-navigation/native';
  import { Article } from '@/types/Article';
  import { FeedSelectModal } from '@/components/FeedSelectModal';
  import { Feed } from '@/types/Feed';
  import { FilterEngine } from '@/services/FilterEngine';
  import { FilterService, Filter } from '@/services/FilterService';
  import { FeedService } from '@/services/FeedService';
  import { ArticleService } from '@/services/ArticleService';
  import { SyncService } from '@/services/SyncService';
  import { GlobalAllowKeywordService } from '@/services/GlobalAllowKeywordService';
  import { GlobalAllowKeyword } from '@/types/GlobalAllowKeyword';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import type { ReadDisplayMode } from '../preferences';

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
    const [isLoading, setIsLoading] = React.useState(true);
    const [articles, setArticles] = React.useState<Article[]>([]);
    const [feeds, setFeeds] = React.useState<Feed[]>([]);
    const [selectedFeedId, setSelectedFeedId] = React.useState<string | null>(null);
    const [feedModalVisible, setFeedModalVisible] = React.useState(false);
    
    // フィルタ関連
    const [filters, setFilters] = React.useState<Filter[]>([]);
    const [globalAllowKeywords, setGlobalAllowKeywords] = React.useState<GlobalAllowKeyword[]>([]);
    const [filteredArticles, setFilteredArticles] = React.useState<Article[]>([]);
    
    // Preferences
    const [readDisplay, setReadDisplay] = React.useState<ReadDisplayMode>('dim');

    // 選択中のフィード名を取得
    const selectedFeedName = React.useMemo(() => {
      if (selectedFeedId === null) return 'ALL';
      const feed = feeds.find(f => f.id === selectedFeedId);
      return feed?.title || 'ALL';
    }, [selectedFeedId, feeds]);

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
        
        // Preferences を取得
        const savedReadDisplay = await AsyncStorage.getItem('@filto/preferences/readDisplay');
        if (savedReadDisplay === 'dim' || savedReadDisplay === 'hide') {
          setReadDisplay(savedReadDisplay);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        Alert.alert('エラー', 'データの読み込みに失敗しました');
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

    // フィルタ適用
    React.useEffect(() => {
      // フィードでフィルタリング
      let filtered = articles;
      if (selectedFeedId !== null) {
        filtered = articles.filter(a => a.feedId === selectedFeedId);
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
    }, [articles, selectedFeedId, filters, globalAllowKeywords, readDisplay]);

    const handleRefresh = React.useCallback(async () => {
      try {
        setRefreshing(true);
        
        // RSS同期を実行
        const result = await SyncService.refresh();
        console.log(`Sync completed: ${result.fetched} feeds, ${result.newArticles} new articles`);
        
        // データを再読み込み
        await loadData();
      } catch (error) {
        console.error('Failed to refresh:', error);
        Alert.alert('エラー', '更新に失敗しました');
      } finally {
        setRefreshing(false);
      }
    }, [loadData]);

    const handleFeedSelect = React.useCallback(() => {
      setFeedModalVisible(true);
    }, []);

    const handleSelectFeed = React.useCallback((feedId: string | null) => {
      setSelectedFeedId(feedId);
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
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : (
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