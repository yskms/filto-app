import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Feed } from '@/types/Feed';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';
import { FeedSortModal, FeedSortType } from '@/components/FeedSortModal';

interface FeedSelectModalProps {
  visible: boolean;
  feeds: Feed[];
  selectedFeedIds: string[] | null;
  currentSort: FeedSortType;
  onClose: () => void;
  onSelectFeeds: (feedIds: string[] | null) => void;
  onSelectSort: (sortType: FeedSortType) => void;
}

export const FeedSelectModal: React.FC<FeedSelectModalProps> = ({
  visible,
  feeds,
  selectedFeedIds,
  currentSort,
  onClose,
  onSelectFeeds,
  onSelectSort,
}) => {
  const [sortModalVisible, setSortModalVisible] = React.useState(false);
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const iconBg = useThemeColor({}, 'tabIconDefault');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  const isAllSelected = selectedFeedIds === null;
  const isFeedSelected = (feedId: string) =>
    selectedFeedIds === null || selectedFeedIds.includes(feedId);

  const handleToggleAll = () => {
    onSelectFeeds(null);
  };

  const handleToggleFeed = (feedId: string) => {
    if (selectedFeedIds === null) {
      // 全選択状態 → このフィードだけ外す（他は全て選択）
      const newIds = feeds.filter(f => f.id !== feedId).map(f => f.id);
      if (newIds.length === 0) return; // 最後の1つは外せない
      onSelectFeeds(newIds);
    } else if (selectedFeedIds.includes(feedId)) {
      // 選択中 → 外す
      const newIds = selectedFeedIds.filter(id => id !== feedId);
      if (newIds.length === 0) return; // 最後の1つは外せない
      onSelectFeeds(newIds.length === feeds.length ? null : newIds);
    } else {
      // 未選択 → 追加
      const newIds = [...selectedFeedIds, feedId];
      onSelectFeeds(newIds.length === feeds.length ? null : newIds);
    }
  };

  const handleManageFeeds = () => {
    onClose();
    router.push('/feeds');
  };

  return (
    <>
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
            <ThemedText style={styles.title}>{t('home.selectFeed')}</ThemedText>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={() => setSortModalVisible(true)} style={styles.headerButton}>
                <Ionicons name="swap-vertical-outline" size={22} color={iconColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.headerButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <ThemedText style={[styles.doneText, { color: tintColor }]}>{t('common.done')}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* フィード一覧 */}
          <ScrollView style={styles.listContainer}>
            {/* ALL */}
            <TouchableOpacity
              style={[styles.feedItem, { borderBottomColor: borderColor }]}
              onPress={handleToggleAll}
              activeOpacity={0.7}
            >
              <View style={[styles.feedIcon, { backgroundColor: iconBg }]}>
                <Ionicons name="newspaper-outline" size={18} color={iconColor} />
              </View>
              <ThemedText style={styles.feedName}>{t('home.allFeeds')}</ThemedText>
              <Ionicons
                name={isAllSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={isAllSelected ? tintColor : borderColor}
              />
            </TouchableOpacity>

            {/* 各フィード */}
            {feeds.map((feed) => {
              const selected = isFeedSelected(feed.id);
              return (
                <TouchableOpacity
                  key={feed.id}
                  style={[styles.feedItem, { borderBottomColor: borderColor }]}
                  onPress={() => handleToggleFeed(feed.id)}
                  activeOpacity={0.7}
                >
                  {feed.iconUrl ? (
                    <Image source={{ uri: feed.iconUrl }} style={styles.feedIconImage} />
                  ) : (
                    <View style={[styles.feedIcon, { backgroundColor: iconBg }]}>
                      <Ionicons name="newspaper-outline" size={18} color={iconColor} />
                    </View>
                  )}
                  <ThemedText style={[styles.feedName, !selected && styles.feedNameDimmed]}>
                    {feed.title}
                  </ThemedText>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selected ? tintColor : borderColor}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* フッター */}
          <TouchableOpacity
            style={[styles.manageButton, { borderTopColor: borderColor }]}
            onPress={handleManageFeeds}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.manageButtonText, { color: tintColor }]}>{t('feeds.manageFeeds')}</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={tintColor} style={styles.manageButtonIcon} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>

    <FeedSortModal
      visible={sortModalVisible}
      currentSort={currentSort}
      onClose={() => setSortModalVisible(false)}
      onSelectSort={(sortType) => {
        onSelectSort(sortType);
        setSortModalVisible(false);
      }}
    />
    </>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    padding: 4,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 4,
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
  feedName: {
    flex: 1,
    fontSize: 16,
  },
  feedNameDimmed: {
    opacity: 0.4,
  },
  manageButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  manageButtonIcon: {
    marginTop: 1,
  },
});
