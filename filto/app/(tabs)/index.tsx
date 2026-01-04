import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ダミーデータ型定義
interface Article {
  id: number;
  title: string;
  feedName: string;
  publishedAt: number;
  thumbnail?: string;
  isRead: boolean;
  link: string;
}

// ダミーデータ
const dummyArticles: Article[] = [
  {
    id: 1,
    title: 'React 19 Released: What\'s New in the Latest Version',
    feedName: 'TechCrunch',
    publishedAt: Math.floor(Date.now() / 1000) - 3600, // 1時間前
    isRead: false,
    link: 'https://example.com/article1',
  },
  {
    id: 2,
    title: 'TypeScript 5.5 の新機能を解説',
    feedName: 'Qiita',
    publishedAt: Math.floor(Date.now() / 1000) - 7200, // 2時間前
    isRead: false,
    link: 'https://example.com/article2',
  },
  {
    id: 3,
    title: 'Expo Router のベストプラクティス',
    feedName: 'Medium',
    publishedAt: Math.floor(Date.now() / 1000) - 86400, // 1日前
    isRead: true,
    link: 'https://example.com/article3',
  },
  {
    id: 4,
    title: 'モバイルアプリ開発の最新トレンド',
    feedName: 'TechBlog',
    publishedAt: Math.floor(Date.now() / 1000) - 172800, // 2日前
    isRead: false,
    link: 'https://example.com/article4',
  },
  {
    id: 5,
    title: 'RSSリーダーアプリの設計思想',
    feedName: 'Dev.to',
    publishedAt: Math.floor(Date.now() / 1000) - 259200, // 3日前
    isRead: true,
    link: 'https://example.com/article5',
  },
];

// 経過時間を計算
const getTimeAgo = (publishedAt: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - publishedAt;
  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'たった今';
};

// 記事アイテムコンポーネント
const ArticleItem: React.FC<{ article: Article }> = ({ article }) => {
  const timeAgo = getTimeAgo(article.publishedAt);

  return (
    <TouchableOpacity
      style={[styles.articleContainer, article.isRead && styles.readContainer]}
      activeOpacity={0.7}
    >
      <View style={styles.articleContent}>
        {article.thumbnail ? (
          <Image source={{ uri: article.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
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
  const [articles] = React.useState<Article[]>(dummyArticles);
  const [selectedFeedName] = React.useState<string>('ALL');

  const handleRefresh = React.useCallback(() => {
    setRefreshing(true);
    // ダミー実装：1秒後にリフレッシュ完了
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleFeedSelect = React.useCallback(() => {
    // TODO: FeedSelectモーダルを開く
    console.log('FeedSelectモーダルを開く');
  }, []);

  return (
    
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        feedName={selectedFeedName}
        onPressFeedSelect={handleFeedSelect}
        onPressRefresh={handleRefresh}
      />
      
      <FlatList
        data={articles}
        renderItem={({ item }) => <ArticleItem article={item} />}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',//電池とかの部分ではないよ！
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
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#e0e0e0',
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
});
