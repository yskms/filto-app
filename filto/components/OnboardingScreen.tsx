import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation, useLanguage } from '@/providers/language';
import {
  seedFeedsFromSelection,
  seedFiltersFromTopics,
} from '@/database/init';
import { SyncService } from '@/services/SyncService';

type FeedItem = { id: string; title: string; url: string };
type FeedCategory = { id: string; label: string; feeds: FeedItem[] };

const FEED_CATEGORIES: Record<string, FeedCategory[]> = {
  ja: [
    {
      id: 'news',
      label: 'ニュース',
      feeds: [{ id: 'feed_livedoor', title: 'ライブドアニュース', url: 'https://news.livedoor.com/topics/rss/top.xml' }],
    },
    {
      id: 'tech',
      label: 'テクノロジー',
      feeds: [
        { id: 'feed_gigazine', title: 'Gigazine', url: 'https://gigazine.net/news/rss_2.0/' },
        { id: 'feed_itmedia', title: 'ITmedia', url: 'https://rss.itmedia.co.jp/rss/2.0/itmediamain.xml' },
      ],
    },
    {
      id: 'business',
      label: 'ビジネス',
      feeds: [
        { id: 'feed_toyokeizai', title: '東洋経済オンライン', url: 'https://toyokeizai.net/list/feed/rss' },
      ],
    },
    {
      id: 'sports',
      label: 'スポーツ',
      feeds: [{ id: 'feed_nikkansports', title: '日刊スポーツ', url: 'https://www.nikkansports.com/rss/rss_nstopnews.xml' }],
    },
    {
      id: 'entertainment',
      label: '芸能・エンタメ',
      feeds: [{ id: 'feed_mdpr', title: 'モデルプレス', url: 'https://feed.mdpr.jp/rss/export/mdpr-entertainment.xml' }],
    },
  ],
  en: [
    {
      id: 'world',
      label: 'World News',
      feeds: [{ id: 'feed_bbc', title: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }],
    },
    {
      id: 'tech',
      label: 'Technology',
      feeds: [
        { id: 'feed_techcrunch', title: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
        { id: 'feed_verge', title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
      ],
    },
    {
      id: 'science',
      label: 'Science & Tech',
      feeds: [{ id: 'feed_wired', title: 'Wired', url: 'https://www.wired.com/feed/rss' }],
    },
    {
      id: 'entertainment',
      label: 'Entertainment',
      feeds: [{ id: 'feed_variety', title: 'Variety', url: 'https://variety.com/feed/' }],
    },
    {
      id: 'business',
      label: 'Business',
      feeds: [{ id: 'feed_businessinsider', title: 'Business Insider', url: 'https://feeds.businessinsider.com/custom/all' }],
    },
  ],
};

// 各キーワードがそのままブロックキーワードとして登録される
const BLOCK_KEYWORDS: Record<string, string[]> = {
  ja: [
    '野球', 'サッカー', 'ゴルフ', '相撲', 'テニス',
    'バスケ', '競馬', '格闘技', 'ラグビー', 'バレー',
    '卓球', '水泳', '陸上', 'スキー', '柔道',
    '芸能', 'アイドル', 'お笑い', 'ドラマ', '映画',
    '音楽', 'アニメ', 'ゲーム', 'ファッション', '占い',
    '政治', '選挙', '国会', '議員', '外交',
    '仮想通貨', 'ビットコイン', 'NFT', '株価', 'FX',
    '競艇', 'パチンコ', '宝くじ',
  ],
  en: [
    'Baseball', 'Football', 'Basketball', 'Soccer', 'Golf',
    'Tennis', 'Racing', 'Wrestling', 'Hockey', 'Boxing',
    'MMA', 'Rugby', 'Cricket', 'Swimming', 'Athletics',
    'Celebrity', 'Gossip', 'Reality TV', 'Movies', 'Music',
    'Anime', 'Gaming', 'Fashion', 'Horoscope', 'Astrology',
    'Politics', 'Election', 'Congress', 'Senate', 'Diplomacy',
    'Crypto', 'Bitcoin', 'NFT', 'Stocks', 'Forex',
    'Gambling', 'Lottery', 'Poker',
  ],
};

function getFaviconUrl(feedUrl: string): string {
  try {
    const domain = new URL(feedUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
  } catch {
    return '';
  }
}

const ACCENT = '#0a7ea4';

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const lang = language === 'ja' ? 'ja' : 'en';
  const categories = FEED_CATEGORIES[lang];
  const keywords = BLOCK_KEYWORDS[lang];

  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(FEED_CATEGORIES[language === 'ja' ? 'ja' : 'en'].map(c => c.id))
  );
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const hintColor = useThemeColor({ light: '#687076', dark: '#9BA1A6' }, 'background');

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw); else next.add(kw);
      return next;
    });
  };

  const handleNext = () => {
    if (selectedCategories.size === 0) {
      Alert.alert(t('onboarding.selectAtLeastOne'));
      return;
    }
    setStep(2);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const feeds = categories
        .filter(cat => selectedCategories.has(cat.id))
        .flatMap(cat => cat.feeds)
        .map(f => ({ ...f, iconUrl: getFaviconUrl(f.url) }));

      await seedFeedsFromSelection(feeds);
      await seedFiltersFromTopics(Array.from(selectedKeywords));

      try { await SyncService.refresh(); } catch {}

      onComplete();
    } catch {
      Alert.alert(t('errors.operationFailed'));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.stepIndicator}>
          {t('onboarding.stepIndicator', { current: step, total: 2 })}
        </ThemedText>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ThemedText style={styles.title}>
          {step === 1 ? t('onboarding.step1Title') : t('onboarding.step2Title')}
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: hintColor }]}>
          {step === 1 ? t('onboarding.step1Subtitle') : t('onboarding.step2Subtitle')}
        </ThemedText>

        {step === 1 ? (
          <>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.optionRow, { borderColor }]}
                onPress={() => toggleCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedCategories.has(cat.id) ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={selectedCategories.has(cat.id) ? ACCENT : borderColor}
                />
                <View style={styles.optionText}>
                  <ThemedText style={styles.optionLabel}>{cat.label}</ThemedText>
                  <ThemedText style={[styles.optionSub, { color: hintColor }]}>
                    {cat.feeds.map(f => f.title).join(' / ')}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
            <ThemedText style={[styles.hint, { color: hintColor }]}>
              {t('onboarding.step1Hint')}
            </ThemedText>
          </>
        ) : (
          <View style={styles.keywordsGrid}>
            {keywords.map(kw => {
              const checked = selectedKeywords.has(kw);
              return (
                <TouchableOpacity
                  key={kw}
                  style={[
                    styles.chip,
                    { borderColor: checked ? ACCENT : borderColor },
                    checked && styles.chipChecked,
                  ]}
                  onPress={() => toggleKeyword(kw)}
                  activeOpacity={0.7}
                >
                  {checked && (
                    <Ionicons name="checkmark" size={13} color="#fff" style={styles.chipIcon} />
                  )}
                  <ThemedText style={[styles.chipLabel, checked && styles.chipLabelChecked]}>
                    {kw}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: borderColor }]}>
        {step === 2 && (
          <TouchableOpacity
            style={[styles.btn, styles.backBtn, { borderColor }]}
            onPress={() => { setStep(1); scrollRef.current?.scrollTo({ y: 0, animated: false }); }}
            disabled={loading}
          >
            <ThemedText style={styles.backBtnText}>{t('onboarding.back')}</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btn, styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={step === 1 ? handleNext : handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {step === 1 ? t('onboarding.next') : t('onboarding.start')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepIndicator: { fontSize: 14, opacity: 0.6 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 17, fontWeight: '500' },
  optionSub: { fontSize: 13, marginTop: 2 },
  hint: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  keywordsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipChecked: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipIcon: { marginRight: 4 },
  chipLabel: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
  chipLabelChecked: { color: '#fff' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: { borderWidth: 1 },
  backBtnText: { fontSize: 17, fontWeight: '500' },
  primaryBtn: { backgroundColor: ACCENT },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
