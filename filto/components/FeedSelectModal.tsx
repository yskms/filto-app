import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feed } from '@/types/Feed';

interface FeedSelectModalProps {
  visible: boolean;
  feeds: Feed[];
  selectedFeedId: string | null; // null = ALL
  onClose: () => void;
  onSelectFeed: (feedId: string | null) => void;
}

export const FeedSelectModal: React.FC<FeedSelectModalProps> = ({
  visible,
  feeds,
  selectedFeedId,
  onClose,
  onSelectFeed,
}) => {
  const router = useRouter();

  const handleSelectFeed = (feedId: string | null) => {
    onSelectFeed(feedId);
    onClose();
  };

  const handleManageFeeds = () => {
    onClose();
    router.push('/(tabs)/feeds');
  };

  // ALLオプション + フィード一覧
  const allOption = { id: null, title: 'ALL', icon: '📱' };
  const feedOptions = feeds.map(feed => ({
    id: feed.id,
    title: feed.title,
    icon: '📰',
  }));
  const options = [allOption, ...feedOptions];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable 
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.title}>フィード選択</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* フィード一覧 */}
          <FlatList
            data={options}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.feedItem}
                onPress={() => handleSelectFeed(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.feedIcon}>{item.icon}</Text>
                <Text style={styles.feedTitle}>
                  {selectedFeedId === item.id && '▶ '}
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id || 'all'}
            style={styles.feedList}
          />

          {/* Manage Feeds */}
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageFeeds}
            activeOpacity={0.7}
          >
            <Text style={styles.manageText}>Manage Feeds →</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 20,
    color: '#666',
  },
  feedList: {
    maxHeight: 400,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  feedIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  feedTitle: {
    fontSize: 16,
    color: '#000',
  },
  manageButton: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  manageText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
});

