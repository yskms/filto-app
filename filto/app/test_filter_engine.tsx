import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterEngine } from '@/services/FilterEngine';
import { Filter } from '@/services/FilterService';
import { Article } from '@/types/Article';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

// ダミー記事データ
const createArticle = (title: string, summary?: string): Article => ({
  id: '1',
  feedId: 'feed1',
  feedName: 'テストフィード',
  title,
  link: 'https://example.com/article',
  summary,
  publishedAt: new Date().toISOString(),
  isRead: false,
});

// ダミーフィルタデータ
const createFilter = (
  block_keyword: string,
  allow_keyword: string | null = null,
  target_title: number = 1,
  target_description: number = 1
): Filter => ({
  id: 1,
  block_keyword,
  allow_keyword,
  target_title,
  target_description,
  created_at: Math.floor(Date.now() / 1000),
  updated_at: Math.floor(Date.now() / 1000),
});

interface TestResult {
  name: string;
  article: string;
  filter: string;
  result: boolean;
  expected: boolean;
  passed: boolean;
}

export default function TestFilterEngineScreen() {
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = () => {
    const testResults: TestResult[] = [];

    // Test 1: ブロックキーワードに一致
    const article1 = createArticle('FXで稼ぐ方法');
    const filter1 = createFilter('FX');
    const result1 = FilterEngine.evaluate(article1, [filter1]);
    testResults.push({
      name: 'Test 1: ブロックキーワードに一致',
      article: article1.title,
      filter: `block="${filter1.block_keyword}"`,
      result: result1,
      expected: true,
      passed: result1 === true,
    });

    // Test 2: 許可キーワードに一致
    const article2 = createArticle('FXと仮想通貨の違い');
    const filter2 = createFilter('FX', '仮想通貨');
    const result2 = FilterEngine.evaluate(article2, [filter2]);
    testResults.push({
      name: 'Test 2: 許可キーワードに一致（例外）',
      article: article2.title,
      filter: `block="${filter2.block_keyword}", allow="${filter2.allow_keyword}"`,
      result: result2,
      expected: false,
      passed: result2 === false,
    });

    // Test 3: 複数の許可キーワード
    const article3 = createArticle('FXでweb3投資');
    const filter3 = createFilter('FX', '仮想通貨,web3,crypto');
    const result3 = FilterEngine.evaluate(article3, [filter3]);
    testResults.push({
      name: 'Test 3: 複数の許可キーワード',
      article: article3.title,
      filter: `block="${filter3.block_keyword}", allow="${filter3.allow_keyword}"`,
      result: result3,
      expected: false,
      passed: result3 === false,
    });

    // Test 4: タイトルのみ対象
    const article4 = createArticle('健全な投資記事', 'FXについて解説');
    const filter4 = createFilter('FX', null, 1, 0);
    const result4 = FilterEngine.evaluate(article4, [filter4]);
    testResults.push({
      name: 'Test 4: タイトルのみ対象',
      article: `title="${article4.title}", summary="${article4.summary}"`,
      filter: `block="${filter4.block_keyword}", 対象=タイトルのみ`,
      result: result4,
      expected: false,
      passed: result4 === false,
    });

    // Test 5: 概要のみ対象
    const article5 = createArticle('投資の基礎', 'FXについて');
    const filter5 = createFilter('FX', null, 0, 1);
    const result5 = FilterEngine.evaluate(article5, [filter5]);
    testResults.push({
      name: 'Test 5: 概要のみ対象',
      article: `title="${article5.title}", summary="${article5.summary}"`,
      filter: `block="${filter5.block_keyword}", 対象=概要のみ`,
      result: result5,
      expected: true,
      passed: result5 === true,
    });

    // Test 6: グローバル許可リスト
    const article6 = createArticle('FXでReact開発');
    const filter6 = createFilter('FX');
    const globalAllow = ['React', 'TypeScript'];
    const result6 = FilterEngine.evaluate(article6, [filter6], globalAllow);
    testResults.push({
      name: 'Test 6: グローバル許可リスト（最優先）',
      article: article6.title,
      filter: `block="${filter6.block_keyword}", global=[${globalAllow.join(', ')}]`,
      result: result6,
      expected: false,
      passed: result6 === false,
    });

    // Test 7: 複数フィルタ
    const article7 = createArticle('ゴシップと炎上の話題');
    const filters7 = [createFilter('炎上'), createFilter('ゴシップ')];
    const result7 = FilterEngine.evaluate(article7, filters7);
    testResults.push({
      name: 'Test 7: 複数フィルタ',
      article: article7.title,
      filter: '2個のフィルタ',
      result: result7,
      expected: true,
      passed: result7 === true,
    });

    // Test 8: どのフィルタにも一致しない
    const article8 = createArticle('テクノロジーニュース');
    const filters8 = [createFilter('FX'), createFilter('炎上')];
    const result8 = FilterEngine.evaluate(article8, filters8);
    testResults.push({
      name: 'Test 8: どのフィルタにも一致しない',
      article: article8.title,
      filter: '2個のフィルタ',
      result: result8,
      expected: false,
      passed: result8 === false,
    });

    setResults(testResults);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'tabIconDefault');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.headerTitle}>FilterEngine テスト</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {passedCount}/{totalCount} 成功
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView}>
        {results.map((test, index) => (
          <View
            key={index}
            style={[styles.testCard, test.passed ? styles.testPassed : styles.testFailed]}
          >
            <ThemedText style={styles.testName}>{test.name}</ThemedText>
            <ThemedText style={styles.testDetail}>記事: {test.article}</ThemedText>
            <ThemedText style={styles.testDetail}>フィルタ: {test.filter}</ThemedText>
            <ThemedText style={styles.testDetail}>
              結果: {test.result ? 'ブロック' : '表示'}
            </ThemedText>
            <ThemedText style={styles.testDetail}>
              期待: {test.expected ? 'ブロック' : '表示'}
            </ThemedText>
            <ThemedText
              style={[styles.testStatus, test.passed ? styles.statusPassed : styles.statusFailed]}
            >
              {test.passed ? '✅ PASS' : '❌ FAIL'}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  testCard: {
    margin: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  testPassed: {
    borderColor: '#4caf50',
  },
  testFailed: {
    borderColor: '#f44336',
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  testDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  testStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statusPassed: {
    color: '#4caf50',
  },
  statusFailed: {
    color: '#f44336',
  },
});

