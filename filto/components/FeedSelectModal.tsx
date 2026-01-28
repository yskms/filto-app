import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Feed } from '@/types/Feed';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/hooks/use-translation';

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
  const t = useTranslation();

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
            <ThemedText style={styles.title}>{t.home.selectFeed}</ThemedText>
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
              <ThemedText style={styles.feedName}>{t.home.all}</ThemedText>
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
                    <ThemedText style={styles.feedIconText}>📡</ThemedText>
                  </View>
                )}
                <ThemedText style={styles.feedName} numberOfLines={1}>
                  {feed.title}
                </ThemedText>
                {selectedFeedId === feed.id && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* フッター */}
          <View style={[styles.footer, { borderTopColor: borderColor }]}>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageFeeds}
              activeOpacity={0.7}
            >
              <ThemedText style={styles.manageButtonText}>⚙️ {t.feeds.title}</ThemedText>
            </TouchableOpacity>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    fontSize: 24,
    color: '#999',
  },
  listContainer: {
    maxHeight: 400,
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  feedItemSelected: {
    opacity: 0.7,
  },
  feedIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  feedIconImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  feedIconText: {
    fontSize: 20,
  },
  feedName: {
    flex: 1,
    fontSize: 16,
  },
  checkmark: {
    fontSize: 20,
    color: '#1976d2',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
  manageButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
});