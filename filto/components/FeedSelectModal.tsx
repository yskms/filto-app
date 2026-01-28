import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Feed } from '@/types/Feed';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface FeedSelectModalProps {
  visible: boolean;
  feeds: Feed[];
  selectedFeedId: string | null;
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
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const iconBg = useThemeColor({}, 'tabIconDefault');

  const handleSelectFeed = (feedId: string | null) => {
    onSelectFeed(feedId);
    onClose();
  };

  const handleManageFeeds = () => {
    onClose();
    // Feeds画面への遷移
    router.push('/feeds');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.modalContent, { backgroundColor }]}
          onStartShouldSetResponder={() => true}
        >
          {/* ヘッダー */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <ThemedText style={styles.title}>フィード選択</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeIcon}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          {/* フィード一覧 */}
          <ScrollView style={styles.listContainer}>
            {/* ALL */}
            <TouchableOpacity
              style={[
                styles.feedItem,
                selectedFeedId === null && [styles.feedItemSelected, { backgroundColor: iconBg }],
              ]}
              onPress={() => handleSelectFeed(null)}
              activeOpacity={0.7}
            >
              <View style={[styles.feedIcon, { backgroundColor: iconBg }]}>
                <ThemedText style={styles.feedIconText}>📰</ThemedText>
              </View>
              <ThemedText style={styles.feedName}>ALL</ThemedText>
              {selectedFeedId === null && <ThemedText style={styles.checkmark}>✓</ThemedText>}
            </TouchableOpacity>

            {/* 各フィード */}
            {feeds.map((feed) => (
              <TouchableOpacity
                key={feed.id}
                style={[
                  styles.feedItem,
                  selectedFeedId === feed.id && [styles.feedItemSelected, { backgroundColor: iconBg }],
                ]}
                onPress={() => handleSelectFeed(feed.id)}
                activeOpacity={0.7}
              >
                {feed.iconUrl ? (
                  <Image source={{ uri: feed.iconUrl }} style={styles.feedIconImage} />
                ) : (
                  <View style={[styles.feedIcon, { backgroundColor: iconBg }]}>
                    <ThemedText style={styles.feedIconText}>📰</ThemedText>
                  </View>
                )}
                <ThemedText style={styles.feedName}>{feed.title}</ThemedText>
                {selectedFeedId === feed.id && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* フッター */}
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageFeeds}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.manageButtonText}>Manage Feeds →</ThemedText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 20,
  },
  listContainer: {
    flex: 1,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  feedItemSelected: {
  },
  feedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedIconImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  feedIconText: {
    fontSize: 18,
  },
  feedName: {
    flex: 1,
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    color: '#1976d2',
  },
  manageButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
});