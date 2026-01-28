import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

const AboutHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ThemedText style={styles.backIcon}>←</ThemedText>
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>About</ThemedText>
      <View style={styles.headerRight} />
    </View>
  );
};

export default function AboutScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
        <AboutHeader onPressBack={() => router.back()} />
        <View style={[styles.content, { backgroundColor }]}>
          <ThemedText style={styles.appName}>Filto</ThemedText>
          <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
          <ThemedText style={styles.description}>
            RSSリーダー with キーワードフィルター
          </ThemedText>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  backIcon: { 
    fontSize: 20,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: { 
    minWidth: 40,
  },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  appName: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  version: { fontSize: 14, marginBottom: 16 },
  description: { fontSize: 14, textAlign: 'center' },
});