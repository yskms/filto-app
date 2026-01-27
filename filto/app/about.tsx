import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';

const AboutHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onPressBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={styles.backIcon}>←</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>About</Text>
    <View style={styles.headerRight} />
  </View>
);

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <AboutHeader onPressBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.appName}>Filto</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.description}>
          RSSリーダー with キーワードフィルター
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backIcon: { fontSize: 24, color: '#1976d2' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  headerRight: { width: 24 },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  appName: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 8 },
  version: { fontSize: 14, color: '#666', marginBottom: 16 },
  description: { fontSize: 14, color: '#666', textAlign: 'center' },
});
