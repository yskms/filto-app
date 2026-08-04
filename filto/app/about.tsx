import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTranslation } from '@/providers/language';

const CONTACT_EMAIL = 'yskms.studio@gmail.com';

const AboutHeader: React.FC<{ onPressBack: () => void }> = ({ onPressBack }) => {
  const borderColor = useThemeColor({}, 'tabIconDefault');
  const backgroundColor = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'text');
  const { t } = useTranslation();

  return (
    <View style={[styles.header, { borderBottomColor: borderColor, backgroundColor }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onPressBack}
        activeOpacity={0.7}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Ionicons name="chevron-back" size={26} color={iconColor} />
      </TouchableOpacity>
      <ThemedText style={styles.headerTitle}>{t('about.title')}</ThemedText>
      <View style={styles.headerRight} />
    </View>
  );
};

export default function AboutScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
        <AboutHeader onPressBack={() => router.back()} />
        <View style={[styles.content, { backgroundColor }]}>
          <ThemedText style={styles.appName}>Filto</ThemedText>
          <ThemedText style={styles.version}>{t('settings.version')} {Constants.expoConfig?.version ?? ''}</ThemedText>
          <ThemedText style={styles.description}>
            {t('about.description')}
          </ThemedText>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.contactLabel}>{t('about.contact')}</ThemedText>
            <ThemedText style={styles.contactEmail}>{CONTACT_EMAIL}</ThemedText>
          </TouchableOpacity>
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
  description: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  contactRow: { alignItems: 'center', gap: 4 },
  contactLabel: { fontSize: 12, opacity: 0.6 },
  contactEmail: { fontSize: 14 },
});