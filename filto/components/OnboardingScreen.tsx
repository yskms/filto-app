import React, { useEffect, useRef, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation, useLanguage } from '@/providers/language';
import {
  seedFeedsFromSelection,
  seedFiltersFromTopics,
} from '@/database/init';
import { DEFAULT_FEED_CATEGORIES } from '@/constants/defaultFeeds';

const FEED_CATEGORIES = DEFAULT_FEED_CATEGORIES;

// 各キーワードがそのままブロックキーワードとして登録される
const BLOCK_KEYWORDS: Record<string, string[]> = {
  ja: [
    '野球', 'サッカー', 'ゴルフ', '相撲', 'テニス',
    'バスケ', '競馬', '格闘技', 'ラグビー', 'オリンピック',
    '芸能', 'アイドル', 'お笑い', 'ドラマ', '映画',
    '音楽', 'アニメ', 'ゲーム', 'ファッション', 'K-POP',
    '韓流', 'ネタバレ',
    '不倫', '熱愛', '破局', '離婚', 'スキャンダル',
    '炎上', '暴露', '誹謗中傷', '謝罪', '文春',
    '事件', '事故', '災害', '地震', '台風',
    '火事', '戦争', '訃報', '感染症', 'コロナ',
    '殺人', '逮捕', '詐欺', 'いじめ',
    '政治', '選挙', '国会', '議員', '外交',
    '皇室', '税制', '増税',
    '仮想通貨', 'ビットコイン', 'NFT', '株価', 'FX',
    'NISA', '投資', '節税', '円安', '物価',
    'PR', '広告', 'セール', 'クーポン', 'ふるさと納税', '値上げ',
    '競艇', 'パチンコ', '宝くじ', '競輪',
    '占い', '星座', '運勢', 'スピリチュアル', 'タロット', '風水',
  ],
  en: [
    'Baseball', 'Football', 'Basketball', 'Soccer', 'Golf',
    'Tennis', 'Boxing', 'MMA', 'Rugby', 'Olympics',
    'Celebrity', 'Gossip', 'Reality TV', 'Movies', 'Music',
    'Anime', 'Gaming', 'Fashion', 'K-Pop', 'Hollywood',
    'Spoilers', 'Streaming',
    'Scandal', 'Affair', 'Breakup', 'Divorce', 'Rumor',
    'Backlash', 'Cancel Culture', 'Tabloid', 'Exposed', 'Apology',
    'Crime', 'Accident', 'Disaster', 'Earthquake', 'Hurricane',
    'Fire', 'War', 'Obituary', 'Pandemic', 'COVID',
    'Murder', 'Shooting', 'Fraud', 'Bullying',
    'Politics', 'Election', 'Congress', 'Senate', 'Diplomacy',
    'Immigration', 'Tax', 'Tariffs',
    'Crypto', 'Bitcoin', 'NFT', 'Stocks', 'Forex',
    'Inflation', 'Investing', 'Recession', 'IPO', 'Mortgage',
    'Ads', 'Sponsored', 'Sale', 'Coupon', 'Deals', 'Discount',
    'Gambling', 'Lottery', 'Poker', 'Betting',
    'Horoscope', 'Astrology', 'Zodiac', 'Tarot', 'Spiritual', 'Psychic',
  ],
};

function getFaviconUrl(feedUrl: string): string {
  try {
    let domain = new URL(feedUrl).hostname;
    // feeds./feed. はRSS配信専用サブドメインでGoogleのファビコンDBに未登録のケースがあるため除去する
    if (domain.startsWith('feeds.')) domain = domain.slice('feeds.'.length);
    else if (domain.startsWith('feed.')) domain = domain.slice('feed.'.length);
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
  const { language, setLanguage } = useLanguage();

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

  // 言語切替時は、カテゴリIDが言語ごとに異なるため選択状態をリセットする
  useEffect(() => {
    setSelectedCategories(new Set(FEED_CATEGORIES[lang].map(c => c.id)));
    setSelectedKeywords(new Set());
  }, [lang]);

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

      // ホームで初回チュートリアル（コーチマーク）を表示するためのフラグ
      await AsyncStorage.setItem('@filto/home/startTutorial', '1');

      // 初回同期はホーム側の autoSync に任せる（二重 refresh のレースを避ける）。
      // ホームへ即遷移し、取得を待つ間にダミー記事を背景にツアーを進めてもらう。
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
        {step === 1 && (
          <View style={[styles.langToggle, { borderColor }]}>
            {(['ja', 'en'] as const).map(code => {
              const active = language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.langOption, active && styles.langOptionActive]}
                  onPress={() => { if (!active) setLanguage(code); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langText, { color: active ? '#fff' : hintColor }]}>
                    {code === 'ja' ? '日本語' : 'English'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepIndicator: { fontSize: 14, opacity: 0.6 },
  langToggle: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
  },
  langOption: { paddingHorizontal: 12, paddingVertical: 6 },
  langOptionActive: { backgroundColor: ACCENT },
  langText: { fontSize: 13, fontWeight: '600' },
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
